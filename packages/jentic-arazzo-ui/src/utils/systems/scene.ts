import type {
  WorkflowViewProfile,
  WorkflowSystemParticipant,
  WorkflowImplementationAssociation,
} from '../../types/profile';
import type { ArazzoViewerModel, ViewerWorkflow, ViewerStep } from '../model/viewerModel';
import type { CallPath } from '../sequence/sequenceModel';
import type { OperationSourceCandidate } from '../contract/OperationStatusResolver';
import { bindingKey, validateProfile } from './profile';
import { lookupSystemOperation, validateEventAssociation } from './contracts';

export interface SystemRow {
  id: string;
  kind: 'exchange' | 'implementation' | 'call' | 'marker';
  workflowId: string;
  workflow: ViewerWorkflow;
  step?: ViewerStep;
  from: string;
  to: string;
  actor: string;
  sourceOwner?: string;
  label: string;
  depth: number;
  parentId?: string;
  path: CallPath;
  workflowRoot: string;
  associations: string[];
  associationPaths: CallPath[];
  expanded?: boolean;
  reason?: string;
  inspectionWorkflowId?: string;
  association?: WorkflowImplementationAssociation;
  contract?: ReturnType<typeof lookupSystemOperation>;
}
export interface SystemScene {
  document: string;
  root: string;
  participants: WorkflowSystemParticipant[];
  rows: SystemRow[];
  events: {
    association: import('../../types/profile').WorkflowEventAssociation;
    valid: boolean;
    diagnostic: string;
  }[];
  diagnostics: string[];
  bounded: boolean;
}
export interface SystemSceneOptions {
  document: string;
  revision?: string;
  expansion?: Readonly<Record<string, boolean>>;
  contracts?: Readonly<Record<string, OperationSourceCandidate>>;
}
// This projection never evaluates expressions, chooses responses, or acquires sources.
export function buildSystemScene(
  model: ArazzoViewerModel,
  root: string,
  profile: WorkflowViewProfile | undefined,
  options: SystemSceneOptions,
): SystemScene {
  const p = validateProfile(model, profile, options.document, options.revision);
  const scene: SystemScene = {
    document: options.document,
    root,
    participants: [...p.participants],
    rows: [],
    events: p.events.map((association) => ({
      association,
      ...validateEventAssociation(model, association, options.contracts ?? {}),
    })),
    diagnostics: [...p.diagnostics],
    bounded: false,
  };
  const unknowns = new Map<string, string>();
  const unknown = (role: string, owner: string) => {
    const key = JSON.stringify([role, owner]);
    const existing = unknowns.get(key);
    if (existing) return existing;
    let id = `unknown:${role}:${owner}`;
    while (scene.participants.some((p) => p.id === id)) id += ':unknown';
    unknowns.set(key, id);
    scene.participants.push({
      id,
      name: `Unknown ${role}: ${owner}`,
      provenance: { kind: 'host', description: 'Missing or conflicting explicit association' },
    });
    return id;
  };
  let exhausted = false;
  const append = (row: SystemRow) => {
    if (exhausted) return false;
    if (scene.rows.length === 199) {
      scene.rows.push({
        ...row,
        id: `${row.id}:rows`,
        kind: 'marker',
        reason: 'rows',
        inspectionWorkflowId: row.workflowId,
        label: 'Display limit: 200 rows. Open the owning workflow for complete authored content.',
      });
      scene.bounded = true;
      exhausted = true;
      return false;
    }
    scene.rows.push(row);
    return true;
  };
  const expansion = options.expansion ?? {};
  const visit = (
    workflow: ViewerWorkflow,
    path: CallPath,
    associations: string[],
    associationPaths: CallPath[],
    workflowRoot: string,
    active: string[],
    depth: number,
    parentId?: string,
  ) => {
    for (const step of workflow.steps) {
      if (exhausted) return;
      const id = JSON.stringify([
        options.document,
        root,
        associations,
        associationPaths,
        path,
        workflow.workflowId,
        step.stepId,
      ]);
      const key = bindingKey(workflow.workflowId, step.stepId);
      const from = p.invalidActors.has(key)
        ? unknown('actor', workflow.workflowId)
        : (p.actors.get(key) ??
          (p.invalidActors.has(bindingKey(workflow.workflowId))
            ? unknown('actor', workflow.workflowId)
            : (p.actors.get(bindingKey(workflow.workflowId)) ??
              unknown('actor', workflow.workflowId))));
      const base = {
        id,
        workflowId: workflow.workflowId,
        workflow,
        step,
        from,
        to: from,
        actor: from,
        depth,
        parentId,
        path,
        workflowRoot,
        associations,
        associationPaths,
      };
      if (step.callTarget) {
        const callee =
          step.callTarget.kind === 'local-workflow' && step.callTarget.navigable
            ? model.workflowsById.get(step.callTarget.workflowId!)
            : undefined;
        const expanded = expansion[id] ?? false;
        const row: SystemRow = {
          ...base,
          kind: 'call',
          label: `Standard workflow call: ${step.stepId} → ${step.callTarget.reference}`,
          expanded,
        };
        if (!append(row)) return;
        if (!callee)
          append({
            ...base,
            id: `${id}:unavailable`,
            parentId: id,
            kind: 'marker',
            reason: step.callTarget.kind,
            label: `Call target ${step.callTarget.kind}; authored call retained`,
          });
        else if (expanded)
          descend(
            row,
            callee,
            [...path, [workflow.workflowId, step.stepId]],
            associations,
            associationPaths,
            workflowRoot,
            active,
            depth,
          );
        continue;
      }
      const to = p.invalidOwners.has(key)
        ? unknown('source owner', `${workflow.workflowId}.${step.stepId}`)
        : (p.owners.get(key) ??
          p.owners.get(JSON.stringify(['source', step.sourceBinding.sourceName])) ??
          unknown(
            'source owner',
            step.sourceBinding.sourceName ?? `${workflow.workflowId}.${step.stepId}`,
          ));
      const contract = lookupSystemOperation(model, step, options.contracts ?? {});
      const receive = (contract.operation?.action ?? step.sourceBinding.intent) === 'receive';
      if (
        !append({
          ...base,
          kind: 'exchange',
          sourceOwner: to,
          from: receive ? to : from,
          to: receive ? from : to,
          label: `${workflow.workflowId}.${step.stepId}`,
          contract,
        })
      )
        return;
      const a = p.implementations.get(key);
      if (a) {
        const row: SystemRow = {
          ...base,
          id: `${id}:implementation:${a.id}`,
          kind: 'implementation',
          to,
          label: `Descriptive implementation: ${a.workflowId}`,
          association: a,
          expanded: expansion[`${id}:implementation:${a.id}`] ?? true,
        };
        if (!append(row)) return;
        if (row.expanded)
          descend(
            row,
            model.workflowsById.get(a.workflowId)!,
            [],
            [...associations, a.id],
            [...associationPaths, path],
            a.workflowId,
            active,
            depth,
          );
      }
    }
  };
  const descend = (
    row: SystemRow,
    callee: ViewerWorkflow,
    path: CallPath,
    associations: string[],
    associationPaths: CallPath[],
    workflowRoot: string,
    active: string[],
    depth: number,
  ) => {
    const recursionKey = JSON.stringify([
      options.document,
      callee.workflowId,
      row.association?.id ?? 'standard-call',
    ]);
    let reason: string | undefined;
    if (active.includes(recursionKey)) reason = 'recursion';
    else if (depth >= 8) reason = 'depth';
    if (reason) {
      scene.bounded = true;
      append({
        ...row,
        id: `${row.id}:${reason}`,
        kind: 'marker',
        parentId: row.id,
        reason,
        inspectionWorkflowId: callee.workflowId,
        label: `${reason === 'depth' ? 'Depth limit: eight groups' : 'Recursive association/call'}; open ${callee.workflowId} for authored content.`,
      });
    } else
      visit(
        callee,
        path,
        associations,
        associationPaths,
        workflowRoot,
        [...active, recursionKey],
        depth + 1,
        row.id,
      );
  };
  const workflow = model.workflowsById.get(root);
  if (workflow && model.support.semanticInspection !== 'unsupported')
    visit(workflow, [], [], [], root, [], 0);
  return scene;
}
export interface MappingEntry {
  label: string;
  value: unknown;
  producer?: { workflowId: string; stepId: string; path: CallPath };
}
export function mappingOverlay(model: ArazzoViewerModel, row: SystemRow): MappingEntry[] {
  const entries: MappingEntry[] = [];
  const walk = (value: unknown, label: string) => {
    if (value === undefined) return;
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, `${label}.${key}`);
    } else {
      const match = typeof value === 'string' && /^\$steps\.([^.]+)\.outputs\.([^.]+)$/.exec(value);
      const step =
        match &&
        model.workflowsById.get(row.workflowId)?.steps.filter((s) => s.stepId === match[1]);
      entries.push({
        label,
        value,
        ...(step &&
        step.length === 1 &&
        match &&
        step[0].value.outputs &&
        Object.hasOwn(step[0].value.outputs, match[2])
          ? { producer: { workflowId: row.workflowId, stepId: step[0].stepId, path: row.path } }
          : {}),
      });
    }
  };
  if (row.step) {
    walk(row.step.value.parameters, 'Parameters');
    walk(row.step.value.requestBody, 'Request body');
    walk(row.step.value.outputs, 'Outputs');
    entries.push({ label: 'Explicit prerequisites', value: row.step.prerequisites });
    entries.push({ label: 'Workflow prerequisites', value: row.workflow.prerequisites });
    for (const [owner, stepId] of [...row.associationPaths.flat(), ...row.path]) {
      const caller = model.stepsByWorkflow.get(owner)?.get(stepId);
      if (caller)
        entries.push({
          label: `Caller mappings: ${owner}.${stepId}`,
          value: caller.value.parameters,
        });
    }
  }
  if (row.association?.mappings)
    entries.push({ label: 'Descriptive implementation mappings', value: row.association.mappings });
  return entries;
}
