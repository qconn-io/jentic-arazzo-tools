import type { WorkflowCatalogManifest, WorkflowCatalogIdentity } from '../../types/catalog';

export const CATALOG_NAMESPACE = 'jentic.catalog';
export const catalogKey = (identity: WorkflowCatalogIdentity): string =>
  JSON.stringify([identity.documentId, identity.revision, identity.workflowId]);
export const documentKey = (id: string, revision: string): string => JSON.stringify([id, revision]);
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
function requireText(value: unknown, field: string) {
  if (!text(value)) throw new Error(`Catalog ${field} must be a nonempty string`);
}
function unique(values: string[], field: string) {
  if (new Set(values).size !== values.length) throw new Error(`Catalog duplicate ${field}`);
}
/** Validate supplied identity and metadata without inferring missing values. @public */
export function normalizeCatalogManifest(input: unknown): WorkflowCatalogManifest {
  if (!record(input) || input.version !== 1) throw new Error('Unsupported catalog version');
  requireText(input.id, 'id');
  requireText(input.revision, 'revision');
  if (!Array.isArray(input.documents)) throw new Error('Catalog documents must be an array');
  const labels = (field: string): Set<string> => {
    const values = input[field] ?? [];
    if (!Array.isArray(values)) throw new Error(`Catalog ${field} must be an array`);
    const ids = values.map((value) => {
      if (!record(value)) throw new Error(`Invalid catalog ${field}`);
      requireText(value.id, `${field} id`);
      requireText(value.name, `${field} name`);
      return value.id as string;
    });
    unique(ids, field);
    return new Set(ids);
  };
  const products = labels('products'),
    capabilities = labels('capabilities'),
    owners = labels('owners');
  const workflowKeys = new Set<string>();
  const docs = input.documents.map((doc) => {
    if (!record(doc)) throw new Error('Invalid catalog document');
    requireText(doc.id, 'document id');
    requireText(doc.revision, 'document revision');
    requireText(doc.uri, 'document URI');
    if (doc.kind !== undefined && !['arazzo', 'openapi', 'asyncapi'].includes(String(doc.kind)))
      throw new Error('Unsupported catalog document kind');
    if (doc.content !== undefined && typeof doc.content !== 'string' && !record(doc.content))
      throw new Error('Invalid supplied catalog content');
    if (
      doc.expectedDigest !== undefined &&
      !/^sha256:[a-f0-9]{64}$/.test(String(doc.expectedDigest))
    )
      throw new Error('Invalid catalog expected digest');
    const metadata = doc.workflows ?? [];
    if (!Array.isArray(metadata)) throw new Error('Catalog workflow metadata must be an array');
    const ids = metadata.map((item) => {
      if (!record(item)) throw new Error('Invalid catalog workflow metadata');
      requireText(item.workflowId, 'workflow id');
      if (item.role !== undefined && !['entry', 'helper', 'diagnostic'].includes(String(item.role)))
        throw new Error('Invalid catalog workflow role');
      for (const [field, declared] of [
        ['product', products],
        ['owner', owners],
      ] as const)
        if (item[field] !== undefined && !declared.has(String(item[field])))
          throw new Error(`Unknown catalog ${field}: ${String(item[field])}`);
      for (const field of ['capabilities', 'tags', 'api', 'systems']) {
        if (item[field] !== undefined && (!Array.isArray(item[field]) || !item[field].every(text)))
          throw new Error(`Invalid catalog ${field}`);
      }
      if (
        Array.isArray(item.capabilities) &&
        item.capabilities.some((id) => !capabilities.has(String(id)))
      )
        throw new Error('Unknown catalog capability');
      for (const field of ['title', 'description', 'lifecycle'])
        if (item[field] !== undefined) requireText(item[field], field);
      workflowKeys.add(
        catalogKey({
          documentId: String(doc.id),
          revision: String(doc.revision),
          workflowId: String(item.workflowId),
        }),
      );
      return String(item.workflowId);
    });
    unique(ids, 'workflow identity');
    return documentKey(String(doc.id), String(doc.revision));
  });
  unique(docs, 'document/revision identity');
  for (const doc of input.documents) {
    if (doc.sources !== undefined) {
      if (!record(doc.sources)) throw new Error('Invalid catalog source bindings');
      for (const [name, target] of Object.entries(doc.sources)) {
        if (
          !text(name) ||
          !record(target) ||
          !docs.includes(documentKey(String(target.documentId), String(target.revision)))
        )
          throw new Error('Unknown catalog source document revision');
      }
    }
  }
  const associations = input.associations ?? [];
  if (!Array.isArray(associations)) throw new Error('Invalid catalog associations');
  unique(
    associations.map((a) => {
      if (!record(a)) throw new Error('Invalid catalog association');
      requireText(a.id, 'association id');
      requireText(a.description, 'association description');
      for (const field of ['from', 'to']) {
        const target = a[field];
        if (
          !record(target) ||
          !workflowKeys.has(catalogKey(target as unknown as WorkflowCatalogIdentity))
        )
          throw new Error('Unknown catalog association workflow');
      }
      if (a.stepId !== undefined) requireText(a.stepId, 'association step');
      return String(a.id);
    }),
    'association id',
  );
  return structuredClone(input) as unknown as WorkflowCatalogManifest;
}
