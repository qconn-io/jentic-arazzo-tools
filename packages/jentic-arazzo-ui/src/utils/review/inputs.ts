import type {
  WorkflowReviewSnapshot,
  WorkflowReviewOptions,
  WorkflowReviewAddress,
} from '../../types/review';
import { parseContract, object, type ContractObject } from '../contract/references';
import { authoredDigest } from '../location/codec';
import { normalizeCatalogManifest } from '../catalog/manifest';
import { loadCatalog, type CatalogLoadResult } from '../catalog/load';
import { buildCatalogIndex, type CatalogIndex } from '../catalog';
import type { WorkflowCatalogCoverage, WorkflowCatalogDocument } from '../../types/catalog';

export interface ReviewDocument {
  definition: WorkflowCatalogDocument;
  raw: ContractObject;
  digest: string;
}
export interface ReviewProjection {
  snapshot: WorkflowReviewSnapshot;
  documents: ReviewDocument[];
  loaded: CatalogLoadResult;
  index: CatalogIndex;
  coverage: WorkflowCatalogCoverage[];
}
export const addressKey = (a: WorkflowReviewAddress) =>
  JSON.stringify([a.documentId, a.workflowId, a.stepId ?? null]);
function checkIDs(raw: ContractObject, id: string) {
  const workflows = Array.isArray(raw.workflows) ? raw.workflows : [];
  const unique = (values: unknown[], kind: string) => {
    if (
      values.some((v) => typeof v !== 'string' || !v.trim()) ||
      new Set(values).size !== values.length
    )
      throw new Error(`Missing or duplicate ${kind} identity in ${id}`);
  };
  unique(
    workflows.map((w) => object(w).workflowId),
    'workflow',
  );
  for (const workflow of workflows) {
    const steps = object(workflow).steps;
    if (Array.isArray(steps))
      unique(
        steps.map((s) => object(s).stepId),
        'step',
      );
  }
}
async function project(snapshot: WorkflowReviewSnapshot): Promise<ReviewProjection> {
  const documents: ReviewDocument[] = [];
  for (const definition of snapshot.documents) {
    try {
      definition.uri = new URL(definition.uri).href;
    } catch {
      throw new Error(`Review document URI must be absolute: ${definition.id}`);
    }
    if (definition.content === undefined) {
      if ((definition.kind ?? 'arazzo') === 'arazzo')
        throw new Error(`Authored workflow content unavailable: ${definition.id}`);
      continue;
    }
    const raw = await parseContract(definition.content);
    const digest = await authoredDigest(raw);
    if (definition.expectedDigest && digest !== definition.expectedDigest)
      throw new Error(`Review digest mismatch: ${definition.id}`);
    if ((definition.kind ?? 'arazzo') === 'arazzo') checkIDs(raw, definition.id);
    documents.push({ definition, raw, digest });
  }
  // A rejecting provider prevents any reference from acquiring today's mutable bytes.
  const loaded = await loadCatalog(snapshot, {
    provider: {
      async load() {
        throw new Error('Pinned review content unavailable; mutable acquisition disabled');
      },
    },
  });
  for (const doc of loaded.documents) {
    const diagnostics = doc.contracts?.unsupportedDiagnostics ?? [];
    if (diagnostics.length)
      loaded.coverage.push({
        key: JSON.stringify([doc.definition.id, doc.definition.revision, 'inspection-profile']),
        uri: doc.uri,
        revision: doc.definition.revision,
        state: 'unsupported',
        message: diagnostics.join('; '),
      });
  }
  const index = buildCatalogIndex(loaded);
  // Review locations carry revision provenance without a normal catalog session adapter.
  for (const item of [...index.entries, ...index.relationships, ...index.apiUsages])
    delete item.location.extensions;
  const coverage = [...loaded.coverage].sort((a, b) =>
    a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
  );
  return { snapshot, documents, loaded, index, coverage };
}
export function reviewLimits(options: WorkflowReviewOptions = {}) {
  const bound = (value: number | undefined, maximum: number) => {
    const n = value ?? maximum;
    if (!Number.isSafeInteger(n) || n < 1) throw new Error('Invalid review traversal bounds');
    return Math.min(n, maximum);
  };
  return {
    maxRelationships: bound(options.maxRelationships, 10000),
    maxPaths: bound(options.maxPaths, 100),
    maxDepth: bound(options.maxDepth, 32),
  };
}
export async function prepareWorkflowReview(
  baseline: WorkflowReviewSnapshot,
  candidate: WorkflowReviewSnapshot,
  options: WorkflowReviewOptions = {},
) {
  // Capture both sides synchronously before parsing/hashing yields to caller mutations.
  const a = normalizeCatalogManifest(JSON.parse(JSON.stringify(baseline)));
  const b = normalizeCatalogManifest(JSON.parse(JSON.stringify(candidate)));
  if (a.id !== b.id) throw new Error('Incompatible logical snapshot identity');
  if (a.revision === b.revision) throw new Error('Snapshot revisions must be distinct');
  for (const snapshot of [a, b]) {
    if (new Set(snapshot.documents.map((d) => d.id)).size !== snapshot.documents.length)
      throw new Error('Duplicate logical document identity in review snapshot');
  }
  reviewLimits(options);
  const [before, after] = await Promise.all([project(a), project(b)]);
  for (const doc of before.documents) {
    const other = after.documents.find((d) => d.definition.id === doc.definition.id);
    if (other && (other.definition.kind ?? 'arazzo') !== (doc.definition.kind ?? 'arazzo'))
      throw new Error('Incompatible document identity kind');
    if (
      other &&
      doc.definition.revision === other.definition.revision &&
      doc.digest !== other.digest
    )
      throw new Error('Revision identity collision: different contents for the same revision');
  }
  const identities = (p: ReviewProjection) =>
    new Set(
      p.documents.flatMap((d) =>
        (Array.isArray(d.raw.workflows) ? d.raw.workflows : []).flatMap((w) => {
          const workflow = object(w),
            workflowId = String(workflow.workflowId);
          return [
            addressKey({ documentId: d.definition.id, workflowId }),
            ...(Array.isArray(workflow.steps) ? workflow.steps : []).map((s) =>
              addressKey({
                documentId: d.definition.id,
                workflowId,
                stepId: String(object(s).stepId),
              }),
            ),
          ];
        }),
      ),
    );
  const old = identities(before),
    next = identities(after),
    usedOld = new Set<string>(),
    usedNext = new Set<string>();
  for (const match of options.matches ?? []) {
    const x = addressKey(match.before),
      y = addressKey(match.after);
    if (
      match.before.documentId !== match.after.documentId ||
      !!match.before.stepId !== !!match.after.stepId ||
      !old.has(x) ||
      !next.has(y) ||
      usedOld.has(x) ||
      usedNext.has(y)
    )
      throw new Error('Invalid, missing or colliding explicit match');
    usedOld.add(x);
    usedNext.add(y);
  }
  return { baseline: before, candidate: after };
}
