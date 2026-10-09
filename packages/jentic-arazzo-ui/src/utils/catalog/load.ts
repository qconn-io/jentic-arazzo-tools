import type {
  WorkflowCatalogManifest,
  WorkflowCatalogDocument,
  WorkflowCatalogCoverage,
} from '../../types/catalog';
import type { SourceDocumentProvider } from '../../types/source';
import { SourceRegistry } from '../source/SourceRegistry';
import { authoredDigest } from '../location/codec';
import { normalizeCatalogManifest, documentKey } from './manifest';
import { parseContract, object } from '../contract/references';
import type { ContractDocumentFacts } from '../contract/types';
import type { InspectionResult } from '../inspection';
import { buildViewerModel, type ArazzoViewerModel } from '../model/viewerModel';
import { effectiveActionUses, type EffectiveActionUse } from '../model/effectiveUses';

export interface CatalogLimits {
  maxDocuments: number;
  maxConcurrent: number;
  maxTotalBytes: number;
  maxSizeBytes: number;
  maxSteps: number;
  maxReferenceDepth: number;
}
export const CATALOG_LIMITS: CatalogLimits = {
  maxDocuments: 100,
  maxConcurrent: 4,
  maxTotalBytes: 64 * 1024 * 1024,
  maxSizeBytes: 10 * 1024 * 1024,
  maxSteps: 10000,
  maxReferenceDepth: 8,
};
export interface CatalogLoadedDocument {
  definition: WorkflowCatalogDocument;
  uri: string;
  content: string | object;
  digest: string;
  inspection?: InspectionResult;
  viewerModel?: ArazzoViewerModel;
  effectiveUses?: EffectiveActionUse[];
  contracts?: ContractDocumentFacts;
  sources: Map<string, CatalogLoadedDocument | Error>;
}
export interface CatalogLoadResult {
  manifest: WorkflowCatalogManifest;
  documents: CatalogLoadedDocument[];
  coverage: WorkflowCatalogCoverage[];
  registry: SourceRegistry;
}
export interface CatalogLoadOptions {
  manifestURI?: string;
  provider?: SourceDocumentProvider;
  signal?: AbortSignal;
  limits?: Partial<CatalogLimits>;
  onCoverage?: (coverage: readonly WorkflowCatalogCoverage[]) => void;
}

export async function loadCatalog(
  input: WorkflowCatalogManifest,
  options: CatalogLoadOptions = {},
): Promise<CatalogLoadResult> {
  const manifest = normalizeCatalogManifest(input);
  const limits = { ...CATALOG_LIMITS, ...options.limits };
  for (const [key, value] of Object.entries(limits))
    if (
      !Number.isSafeInteger(value) ||
      value < (key === 'maxReferenceDepth' ? 0 : 1) ||
      value > CATALOG_LIMITS[key as keyof CatalogLimits]
    )
      throw new Error(`Invalid catalog limit: ${key}`);
  const registry = new SourceRegistry({
    maxConcurrent: limits.maxConcurrent,
    maxDocuments: limits.maxDocuments,
    maxReferenceDepth: limits.maxReferenceDepth,
    maxSizeBytes: limits.maxSizeBytes,
  });
  const coverage: WorkflowCatalogCoverage[] = [];
  const publish = () => options.onCoverage?.(coverage.map((item) => ({ ...item })));
  const setCoverage = (
    key: string,
    uri: string,
    state: WorkflowCatalogCoverage['state'],
    revision?: string,
    message?: string,
  ) => {
    const old = coverage.find((item) => item.key === key);
    const value = { key, uri, revision, state, message };
    if (old) Object.assign(old, value);
    else coverage.push(value);
    publish();
  };
  const resolve = (uri: string, base = options.manifestURI) => {
    const result = registry.resolveUri(uri, base);
    if (result.error) throw new Error(result.error);
    return result.resolvedUri;
  };
  const suppliedByURI = new Map<string, WorkflowCatalogDocument[]>();
  for (const definition of manifest.documents) {
    setCoverage(
      documentKey(definition.id, definition.revision),
      definition.uri,
      'pending',
      definition.revision,
    );
    try {
      const uri = resolve(definition.uri),
        values = suppliedByURI.get(uri) ?? [];
      values.push(definition);
      suppliedByURI.set(uri, values);
    } catch {
      /* diagnosed on acquisition */
    }
  }

  let acquiredBytes = 0,
    acquiredCount = 0,
    steps = 0;
  registry.setProvider({
    async load(request) {
      const key = JSON.stringify([request.uri, request.revision ?? null]);
      setCoverage(key, request.uri, 'pending', request.revision);
      try {
        if (++acquiredCount > limits.maxDocuments)
          throw new Error('Catalog document count limit exceeded');
        const matches = (suppliedByURI.get(request.uri) ?? []).filter(
          (d) => !request.revision || d.revision === request.revision,
        );
        if (
          new Set(
            matches.map((d) =>
              JSON.stringify([d.revision, d.expectedDigest ?? null, d.content ?? null]),
            ),
          ).size > 1
        )
          throw new Error('Ambiguous supplied source revision or content authority');
        const supplied = matches[0];
        const requiredRevision =
          supplied && !supplied.expectedDigest ? supplied.revision : request.revision;
        let content =
          supplied?.content !== undefined
            ? { content: supplied.content, retrievalURI: request.uri, revision: supplied.revision }
            : await (options.provider?.load({ ...request, revision: requiredRevision }) ??
                Promise.reject(new Error('No catalog source provider available')));
        if (requiredRevision !== undefined && content.revision !== requiredRevision)
          throw new Error(
            `Revision mismatch: requested ${requiredRevision}, got ${content.revision ?? 'no revision'}`,
          );
        if (request.signal?.aborted || options.signal?.aborted) throw new Error('Aborted');
        const size = new TextEncoder().encode(
          typeof content.content === 'string' ? content.content : JSON.stringify(content.content),
        ).length;
        acquiredBytes += size;
        if (size > limits.maxSizeBytes) throw new Error('Catalog per-source size limit exceeded');
        if (acquiredBytes > limits.maxTotalBytes)
          throw new Error('Catalog aggregate byte limit exceeded');
        if (
          supplied?.expectedDigest &&
          supplied.expectedDigest !== (await authoredDigest(await parseContract(content.content)))
        )
          throw new Error('Catalog digest mismatch; revision excluded from indexing');
        if (supplied) content = { ...content, revision: supplied.revision };
        setCoverage(key, content.retrievalURI, 'loaded', content.revision);
        return content;
      } catch (error) {
        setCoverage(key, request.uri, 'failed', request.revision, String(error));
        throw error;
      }
    },
  });
  const abort = () => registry.cancelAll();
  options.signal?.addEventListener('abort', abort, { once: true });
  const current = () => {
    if (options.signal?.aborted) throw new Error('Aborted catalog generation');
  };
  const project = async (
    definition: WorkflowCatalogDocument,
    content: string | object,
    uri: string,
  ): Promise<CatalogLoadedDocument> => {
    current();
    const parsed = await parseContract(content);
    current();
    const digest = await authoredDigest(parsed);
    current();
    if (definition.expectedDigest && definition.expectedDigest !== digest)
      throw new Error('Catalog digest mismatch; revision excluded from indexing');
    const result: CatalogLoadedDocument = { definition, uri, content, digest, sources: new Map() };
    const kind = definition.kind ?? 'arazzo';
    if (kind === 'arazzo') {
      const { projectArazzo } = await import('../contract/ArazzoAdapter');
      current();
      const count = Array.isArray(parsed.workflows)
        ? parsed.workflows.reduce<number>((n, w) => {
            const value = object(w).steps;
            return n + (Array.isArray(value) ? value.length : 0);
          }, 0)
        : 0;
      steps += count;
      if (steps > limits.maxSteps) throw new Error('Catalog authored step limit exceeded');
      result.inspection = (
        await projectArazzo(
          parsed,
          uri,
          registry,
          definition.revision,
          registry.captureValidity(uri, definition.revision),
        )
      ).inspection;
      if (result.inspection.support.semanticInspection === 'unsupported')
        throw new Error('Unsupported Arazzo inspection version');
      result.viewerModel = buildViewerModel(result.inspection);
      result.effectiveUses = effectiveActionUses(result.viewerModel, {
        documentId: definition.id,
        revision: definition.revision,
        uri,
      });
      for (const use of result.effectiveUses)
        if (use.action.status !== 'resolved')
          setCoverage(
            JSON.stringify([
              definition.id,
              definition.revision,
              'effective-action',
              use.workflowId,
              use.stepId,
              use.usePointer,
            ]),
            uri,
            use.action.status === 'unsupported' ? 'unsupported' : 'failed',
            definition.revision,
            `Action inspection is ${use.action.status} at ${use.usePointer}; applicability retains authored provenance.`,
          );
      for (const diagnostic of result.inspection.snapshot.diagnostics ?? []) {
        if (diagnostic.phase !== 'resolution') continue;
        setCoverage(
          JSON.stringify([
            definition.id,
            definition.revision,
            'resolution',
            diagnostic.code,
            diagnostic.path,
          ]),
          uri,
          diagnostic.category === 'unsupported-resolution' ? 'unsupported' : 'failed',
          definition.revision,
          diagnostic.message,
        );
      }
      for (const metadata of definition.workflows ?? [])
        if (!result.inspection.workflowsById.has(metadata.workflowId))
          throw new Error(`Catalog metadata names missing workflow: ${metadata.workflowId}`);
    } else {
      const adapter =
        kind === 'asyncapi'
          ? (await import('../contract/AsyncAPIAdapter')).projectAsyncAPI
          : (await import('../contract/OpenAPIAdapter')).projectOpenAPI;
      current();
      result.contracts = await adapter(
        parsed,
        uri,
        registry,
        definition.revision,
        registry.captureValidity(uri),
      );
      if (result.contracts.dialect === 'unsupported')
        throw new Error(result.contracts.unsupportedDiagnostics.join('; '));
    }
    current();
    return result;
  };
  const documents: CatalogLoadedDocument[] = [];
  const definitions = new Map(manifest.documents.map((d) => [documentKey(d.id, d.revision), d]));
  const byKey = new Map<string, CatalogLoadedDocument>();
  try {
    current();
    await Promise.all(
      manifest.documents.map(async (definition) => {
        const key = documentKey(definition.id, definition.revision);
        try {
          const uri = resolve(definition.uri);
          const pin =
            definition.content !== undefined || !definition.expectedDigest
              ? definition.revision
              : undefined;
          const content = await registry.acquire(uri, pin);
          const result = await project(definition, content.content, content.retrievalURI);
          byKey.set(key, result);
          setCoverage(key, result.uri, 'loaded', definition.revision);
        } catch (error) {
          setCoverage(
            key,
            definition.uri,
            String(error).includes('Unsupported') ? 'unsupported' : 'failed',
            definition.revision,
            String(error),
          );
        }
      }),
    );
    current();
    // preserve supplied order irrespective of asynchronous completion.
    for (const definition of manifest.documents) {
      const value = byKey.get(documentKey(definition.id, definition.revision));
      if (value) documents.push(value);
    }
    const dynamic = new Map<string, Promise<CatalogLoadedDocument>>();
    const processed = new Set<string>();
    const processSources = async (doc: CatalogLoadedDocument, depth: number): Promise<void> => {
      const identity = documentKey(doc.definition.id, doc.definition.revision);
      if (processed.has(identity)) return;
      processed.add(identity);
      for (const source of doc.inspection?.raw.sourceDescriptions ?? []) {
        const key = JSON.stringify([
          doc.definition.id,
          doc.definition.revision,
          'source',
          source.name,
        ]);
        try {
          current();
          if (depth >= limits.maxReferenceDepth)
            throw new Error('Catalog reference depth limit exceeded');
          if (!['arazzo', 'openapi', 'asyncapi'].includes(source.type ?? ''))
            throw new Error('Unsupported source description type');
          const uri = resolve(source.url, doc.uri);
          const bound = doc.definition.sources?.[source.name];
          const matches = bound
            ? [definitions.get(documentKey(bound.documentId, bound.revision))!]
            : manifest.documents.filter((d) => {
                try {
                  return resolve(d.uri) === uri;
                } catch {
                  return false;
                }
              });
          if (matches.length > 1)
            throw new Error('Ambiguous source revision; supply an exact source binding');
          let value: CatalogLoadedDocument;
          if (matches.length) {
            const definition = matches[0];
            if ((definition.kind ?? 'arazzo') !== source.type)
              throw new Error('Source binding kind mismatch');
            value = byKey.get(documentKey(definition.id, definition.revision))!;
            if (!value) throw new Error('Supplied source revision unavailable');
          } else {
            let pending = dynamic.get(uri);
            if (!pending) {
              pending = (async () => {
                const acquired = await registry.acquire(uri, undefined, doc.uri, depth + 1);
                const digest = await authoredDigest(await parseContract(acquired.content));
                return project(
                  {
                    id: uri,
                    revision: acquired.revision ?? digest,
                    uri,
                    kind: source.type as WorkflowCatalogDocument['kind'],
                  },
                  acquired.content,
                  acquired.retrievalURI,
                );
              })();
              dynamic.set(uri, pending);
            }
            value = await pending;
          }
          if ((value.definition.kind ?? 'arazzo') !== source.type)
            throw new Error('Source binding kind mismatch');
          doc.sources.set(source.name, value);
          setCoverage(key, value.uri, 'loaded', value.definition.revision);
          await processSources(value, depth + 1);
        } catch (error) {
          doc.sources.set(source.name, error instanceof Error ? error : new Error(String(error)));
          setCoverage(key, source.url, 'failed', undefined, String(error));
        }
      }
    };
    await Promise.all(documents.map((doc) => processSources(doc, 0)));
    current();
    // registry-owned reference attempts (including limits/failures) also affect coverage.
    registry.forEachEntry((key, entry) => {
      if (entry.state !== 'located')
        setCoverage(
          key,
          JSON.parse(key)[0],
          'failed',
          JSON.parse(key)[1] ?? undefined,
          entry.state === 'failed'
            ? entry.error.message
            : 'message' in entry
              ? entry.message
              : 'Source still pending',
        );
    });
    return { manifest, documents, coverage, registry };
  } finally {
    options.signal?.removeEventListener('abort', abort);
  }
}
