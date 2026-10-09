import { contractDeclarationUser } from './contractUsage';
import type {
  WorkflowReviewEvidence,
  WorkflowReviewEffect,
  WorkflowReviewImpact,
  WorkflowReviewRelationship,
  WorkflowReviewResult,
} from '../../types/review';
import type { WorkflowCatalogIdentity } from '../../types/catalog';
import { catalogKey } from '../catalog/manifest';
import type { CatalogRelationship } from '../catalog';
import type { ReviewProjection } from './inputs';
import { decodePointer } from '../contract/pointer';
const identity = (v: WorkflowCatalogIdentity): WorkflowCatalogIdentity => ({
  documentId: v.documentId,
  revision: v.revision,
  workflowId: v.workflowId,
});
const relationship = (r: CatalogRelationship): WorkflowReviewRelationship => ({
  id: r.id,
  kind: r.kind,
  from: identity(r.from),
  ...(r.to ? { to: identity(r.to) } : {}),
  pointer: r.pointer,
  location: structuredClone(r.location),
  reference: r.reference,
});
export function findingImpact(
  p: ReviewProjection,
  e: WorkflowReviewEvidence | undefined,
  effects: WorkflowReviewEffect[],
  limits: WorkflowReviewResult['limits'],
): WorkflowReviewImpact {
  const result: WorkflowReviewImpact = {
    direct: [],
    paths: [],
    cycles: [],
    visitedRelationships: 0,
    truncated: false,
    complete: p.index.complete,
    coverage: structuredClone(p.coverage),
  };
  if (!e?.present) return result;
  const roots = new Map<string, { identity: WorkflowCatalogIdentity; stepId?: string }>();
  const addRoot = (v: WorkflowCatalogIdentity, stepId?: string) =>
    roots.set(JSON.stringify([catalogKey(v), stepId ?? null]), { identity: identity(v), stepId });
  const tokens = decodePointer(e.pointer);
  const actionScope =
    (tokens[0] === 'components' && ['successActions', 'failureActions'].includes(tokens[1])) ||
    (tokens[0] === 'workflows' &&
      (['successActions', 'failureActions'].includes(tokens[2]) ||
        (tokens[2] === 'steps' && ['onSuccess', 'onFailure'].includes(tokens[4]))));
  const uses = effects.filter((x) => x.location.revision === e.revision);
  let documentScope = false;
  if (actionScope || (!e.workflowId && tokens[0] === 'components' && uses.length)) {
    uses.forEach((x) => {
      const target = {
        documentId: e.documentId,
        revision: e.revision,
        workflowId: x.location.root!,
      };
      addRoot(target, x.location.selection?.stepId);
      const relation = p.index.relationships.find(
        (r) =>
          r.from.documentId === e.documentId &&
          r.from.revision === e.revision &&
          r.from.workflowId === target.workflowId &&
          r.location.selection?.kind === 'action' &&
          x.location.selection?.kind === 'action' &&
          r.location.selection.stepId === x.location.selection.stepId &&
          r.location.selection.action.pointer === x.location.selection.action.pointer &&
          r.location.selection.action.usePointer === x.location.selection.action.usePointer,
      );
      if (relation) result.direct.push(relationship(relation));
    });
  } else if (e.workflowId) {
    const target = { documentId: e.documentId, revision: e.revision, workflowId: e.workflowId };
    addRoot(target, e.stepId);
    result.direct = p.index.relationships
      .filter(
        (r) =>
          r.to &&
          catalogKey(r.to) === catalogKey(target) &&
          (!e.stepId || !r.targetStepId || r.targetStepId === e.stepId),
      )
      .map(relationship);
  } else if (
    (p.documents.find((d) => d.definition.id === e.documentId)?.definition.kind ?? 'arazzo') !==
    'arazzo'
  ) {
    const usages = p.index.apiUsages.filter((u) => {
      const checked = contractDeclarationUser(p, u, e);
      if (checked.bounded) {
        result.truncated = true;
        result.complete = false;
      }
      return checked.used;
    });
    result.direct = usages.map((u) => ({
      id: u.id,
      kind: 'api',
      from: identity(u.from),
      pointer: u.operation?.pointer ?? u.operation?.channelPointer ?? '#',
      location: structuredClone(u.location),
      reference: u.operation?.operationId ?? u.operationKey!,
    }));
    usages.forEach((u) => addRoot(u.from, u.stepId));
  } else {
    // only explicit document metadata changes have document-wide authored scope.
    documentScope = e.pointer === '#' || tokens[0] === 'info' || !!tokens[0]?.startsWith('x-');
    if (documentScope) {
      p.index.entries
        .filter(
          (x) =>
            x.documentId === e.documentId &&
            x.revision === e.revision &&
            x.metadata?.role === 'entry',
        )
        .forEach((entry) => addRoot(entry));
      result.coverage.push({
        key: JSON.stringify([e.documentId, e.revision, 'document-metadata-scope', e.pointer]),
        uri: e.uri,
        revision: e.revision,
        state: 'loaded',
        message:
          e.pointer === '#'
            ? 'Explicit authored document scope; entry listings are not dependency paths.'
            : 'Explicit document metadata scope; entry listings are not dependency paths.',
      });
    }
  }
  if (!roots.size) {
    result.coverage.push({
      key: JSON.stringify([e.documentId, e.revision, 'unlocated-use', e.pointer]),
      uri: e.uri,
      revision: e.revision,
      state: result.complete ? 'loaded' : 'unsupported',
      message: result.complete
        ? 'No known applicable consumers in the supplied inspection scope.'
        : 'No located applicable consumers; partial coverage leaves other consumers unknown.',
    });
  }
  result.direct = [...new Map(result.direct.map((r) => [r.id, r])).values()].sort((a, b) =>
    a.id < b.id ? -1 : 1,
  );
  if (result.direct.length > limits.maxRelationships) {
    result.direct = result.direct.slice(0, limits.maxRelationships);
    result.truncated = true;
  }
  const incoming = new Map<string, CatalogRelationship[]>();
  for (const r of [...p.index.relationships].sort((a, b) => (a.id < b.id ? -1 : 1)))
    if (r.to) {
      const key = catalogKey(r.to);
      const values = incoming.get(key) ?? [];
      values.push(r);
      incoming.set(key, values);
    }
  const tuples = new Set<string>(),
    cycles = new Set<string>();
  const visit = (
    target: WorkflowCatalogIdentity,
    path: WorkflowReviewRelationship[],
    seen: string[],
    stepId?: string,
  ) => {
    const key = catalogKey(target);
    if (seen.includes(key)) {
      const cycle = [...seen, key];
      const token = JSON.stringify(cycle);
      if (!cycles.has(token)) {
        cycles.add(token);
        result.cycles.push(cycle);
      }
      return;
    }
    const entry = p.index.byKey.get(key);
    if (entry?.metadata?.role === 'entry') {
      const ordered = [...path].reverse();
      const tuple = JSON.stringify([key, ordered.map((r) => r.id)]);
      if (!tuples.has(tuple)) {
        if (result.paths.length >= limits.maxPaths) {
          result.truncated = true;
          return;
        }
        tuples.add(tuple);
        result.paths.push({ entry: identity(target), relationships: ordered });
      }
    }
    if (documentScope) return;
    const edges = (incoming.get(key) ?? []).filter(
      (r) => !stepId || !r.targetStepId || r.targetStepId === stepId,
    );
    if (path.length >= limits.maxDepth && edges.length) {
      result.truncated = true;
      return;
    }
    for (const r of edges) {
      if (
        result.visitedRelationships >= limits.maxRelationships ||
        result.paths.length >= limits.maxPaths
      ) {
        result.truncated = true;
        break;
      }
      result.visitedRelationships++;
      visit(r.from, [...path, relationship(r)], [...seen, key], r.location.selection?.stepId);
    }
  };
  for (const root of [...roots.values()].sort((a, b) =>
    catalogKey(a.identity) < catalogKey(b.identity) ? -1 : 1,
  )) {
    if (
      result.visitedRelationships >= limits.maxRelationships ||
      result.paths.length >= limits.maxPaths
    ) {
      result.truncated = true;
      break;
    }
    visit(root.identity, [], [], root.stepId);
  }
  result.complete = result.complete && !result.truncated;
  return result;
}
