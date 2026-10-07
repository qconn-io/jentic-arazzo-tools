import type {
  WorkflowViewProfile,
  WorkflowImplementationAssociation,
  WorkflowEventAssociation,
  WorkflowSystemParticipant,
  WorkflowProfileProvenance,
} from '../../types/profile';
import { decodePointer, readPointer } from '../contract/pointer';
import type { ArazzoViewerModel } from '../model/viewerModel';

export const bindingKey = (workflowId: string, stepId?: string) =>
  JSON.stringify([workflowId, stepId ?? null]);
export interface ValidatedProfile {
  participants: WorkflowSystemParticipant[];
  actors: Map<string, string>;
  owners: Map<string, string>;
  implementations: Map<string, WorkflowImplementationAssociation>;
  events: WorkflowEventAssociation[];
  diagnostics: string[];
  invalidActors: Set<string>;
  invalidOwners: Set<string>;
}
export function validateProfile(
  model: ArazzoViewerModel,
  profile: WorkflowViewProfile | undefined,
  document: string,
  revision?: string,
): ValidatedProfile {
  const result: ValidatedProfile = {
    participants: [],
    actors: new Map(),
    owners: new Map(),
    implementations: new Map(),
    events: [],
    diagnostics: [],
    invalidActors: new Set(),
    invalidOwners: new Set(),
  };
  if (!profile) return result;
  const report = (message: string) => result.diagnostics.push(message);
  if (
    profile.version !== 1 ||
    profile.document !== document ||
    (profile.revision !== undefined && profile.revision !== revision)
  ) {
    report(
      'Profile version/document/revision does not match the loaded document; associations unavailable.',
    );
    return result;
  }
  if (
    ![
      profile.participants,
      profile.actors,
      profile.sourceOwners,
      profile.implementations,
      profile.events,
    ].every((a) => Array.isArray(a) && a.every((v) => v && typeof v === 'object'))
  ) {
    report('Malformed profile collections; associations unavailable.');
    return result;
  }
  const authoredProvenance = (pointer: string) => {
    try {
      return (
        readPointer(model.inspection.snapshot.authoredDocument, decodePointer(pointer)) !==
        undefined
      );
    } catch {
      return false;
    }
  };
  const provenance = (p: WorkflowProfileProvenance) =>
    !!p &&
    (p.kind === 'host'
      ? typeof p.description === 'string' && !!p.description
      : p.kind === 'authored' &&
        p.document === document &&
        typeof p.pointer === 'string' &&
        p.pointer.startsWith('#') &&
        authoredProvenance(p.pointer));
  const duplicated = new Set(
    profile.participants
      .filter((p, i, all) => all.findIndex((other) => other.id === p.id) !== i)
      .map((p) => p.id),
  );
  result.participants = profile.participants.filter((p) => {
    const valid = !!p.id && !!p.name && !duplicated.has(p.id) && provenance(p.provenance);
    if (!valid) report(`Invalid/conflicting participant: ${p.id}`);
    return valid;
  });
  const participant = (id: string) => result.participants.some((p) => p.id === id);
  const workflow = (id: string) => model.workflows.filter((w) => w.workflowId === id).length === 1;
  const operation = (ref: { workflowId: string; stepId: string }) => {
    const steps = model.workflows
      .filter((w) => w.workflowId === ref.workflowId)
      .flatMap((w) => w.steps.filter((s) => s.stepId === ref.stepId));
    const step = steps.length === 1 ? steps[0] : undefined;
    return !!step && !step.callTarget && Object.keys(step.sourceBinding.locators).length > 0;
  };
  const bind = (
    map: Map<string, string>,
    entries: { key: string; id: string; valid: boolean }[],
  ) => {
    const conflicts = new Set(
      entries.filter((e, i, all) => all.findIndex((o) => o.key === e.key) !== i).map((e) => e.key),
    );
    for (const entry of entries) {
      if (!entry.valid || !participant(entry.id) || conflicts.has(entry.key)) {
        report(`Invalid/conflicting association: ${entry.key} → ${entry.id}`);
        (map === result.actors ? result.invalidActors : result.invalidOwners).add(entry.key);
      } else map.set(entry.key, entry.id);
    }
  };
  bind(
    result.actors,
    profile.actors.map((a) => ({
      key: bindingKey(a.workflowId, a.stepId),
      id: a.participant,
      valid:
        provenance(a.provenance) &&
        workflow(a.workflowId) &&
        (!a.stepId || !!model.stepsByWorkflow.get(a.workflowId)?.has(a.stepId)),
    })),
  );
  bind(
    result.owners,
    profile.sourceOwners.map((a) => ({
      key: a.exchange
        ? bindingKey(a.exchange.workflowId, a.exchange.stepId)
        : JSON.stringify(['source', a.sourceName]),
      id: a.participant,
      valid:
        provenance(a.provenance) &&
        (a.exchange
          ? operation(a.exchange)
          : model.document.sourceDescriptions.some((s) => s.name === a.sourceName)),
    })),
  );
  const ids = new Set<string>();
  const keys = new Set<string>();
  const conflicts = new Set(
    profile.implementations
      .filter(
        (a, i, all) =>
          all.findIndex(
            (o) =>
              bindingKey(o.exchange.workflowId, o.exchange.stepId) ===
              bindingKey(a.exchange.workflowId, a.exchange.stepId),
          ) !== i,
      )
      .map((a) => bindingKey(a.exchange.workflowId, a.exchange.stepId)),
  );
  const allAssociationIds = [...profile.implementations, ...profile.events].map((a) => a.id);
  const conflictingIds = new Set(allAssociationIds.filter((id, i, all) => all.indexOf(id) !== i));
  const duplicateIds = new Set(
    profile.implementations
      .filter((a, i, all) => all.findIndex((o) => o.id === a.id) !== i)
      .map((a) => a.id),
  );
  for (const a of profile.implementations) {
    const key = bindingKey(a.exchange.workflowId, a.exchange.stepId);
    if (
      !a.id ||
      duplicateIds.has(a.id) ||
      conflictingIds.has(a.id) ||
      ids.has(a.id) ||
      keys.has(key) ||
      conflicts.has(key) ||
      !provenance(a.provenance) ||
      !operation(a.exchange) ||
      !workflow(a.workflowId)
    )
      report(`Invalid/conflicting implementation: ${a.id}`);
    else result.implementations.set(key, a);
    ids.add(a.id);
    keys.add(key);
  }
  for (const a of profile.events) {
    if (
      !a.id ||
      conflictingIds.has(a.id) ||
      ids.has(a.id) ||
      !provenance(a.provenance) ||
      !operation(a.producer) ||
      !operation(a.consumer)
    )
      report(`Invalid event association: ${a.id}`);
    else result.events.push(a);
    ids.add(a.id);
  }
  return result;
}
