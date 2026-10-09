import { it, expect, vi } from 'vitest';
import type { SourceDocumentContent } from '../src/types/source';
import { toValue } from '@speclynx/apidom-core';
import { projectArazzo } from '../src/utils/contract/ArazzoAdapter';
import { SourceRegistry, DEFAULT_REGISTRY_BUDGET } from '../src/utils/source/SourceRegistry';
import { consumerWorkflow } from './fixtures/upstream-readiness';

const uri = 'https://example.test/flow.json';
function flow(ref = './schema.json') {
  const document = consumerWorkflow();
  document.workflows[1].inputs = { $ref: ref };
  return document;
}

it('retains requested and returned revision provenance with a redirected declaring base', async () => {
  const registry = new SourceRegistry();
  registry.setProvider({
    async load({ uri: requested }) {
      return {
        content: { type: 'integer' },
        retrievalURI: requested.replace('example.test', 'cdn.example.test'),
        revision: 'schema-v1',
      };
    },
  });
  const model = await projectArazzo(flow(), uri, registry, 'root-v1');
  expect(toValue(model.inspection.snapshot.restored.meta.get('viewerSourceReferences')!)).toEqual([
    {
      declaringURI: uri,
      requestedURI: 'https://example.test/schema.json',
      retrievalURI: 'https://cdn.example.test/schema.json',
      revision: 'schema-v1',
      depth: 1,
    },
  ]);
  expect(model.documentId).toContain('root-v1');
});

it.each([
  { limit: 'maxSizeBytes', value: 1, diagnostic: /size limit/i },
  { limit: 'maxReferenceDepth', value: 0, diagnostic: /depth/i },
])('retains authored schema when $limit is exhausted', async ({ limit, value, diagnostic }) => {
  const registry = new SourceRegistry({ ...DEFAULT_REGISTRY_BUDGET, [limit]: value });
  registry.setProvider({
    async load({ uri: requested }) {
      return { retrievalURI: requested, content: { type: 'integer' } };
    },
  });
  const model = await projectArazzo(flow(), uri, registry);
  expect(model.document.workflows[1].inputs).toEqual({ $ref: './schema.json' });
  expect(model.inspection.snapshot.diagnostics?.some((d) => diagnostic.test(d.message))).toBe(true);
});

it('shares document count across dependencies and preserves the first successful projection', async () => {
  const registry = new SourceRegistry({ ...DEFAULT_REGISTRY_BUDGET, maxDocuments: 1 });
  const requested: string[] = [];
  registry.setProvider({
    async load({ uri: request }) {
      requested.push(request);
      return { retrievalURI: request, content: { type: 'integer' } };
    },
  });
  const document = flow();
  document.workflows[2].inputs = { $ref: './other.json' };
  const model = await projectArazzo(document, uri, registry);
  expect(requested).toEqual(['https://example.test/schema.json']);
  expect(model.document.workflows[1].inputs).toEqual({ type: 'integer' });
  expect(model.document.workflows[2].inputs).toEqual({ $ref: './other.json' });
  expect(model.inspection.snapshot.diagnostics?.some((d) => /count/i.test(d.message))).toBe(true);
});

it('shares the depth budget through a dependency chain without requesting the over-limit leaf', async () => {
  const registry = new SourceRegistry({ ...DEFAULT_REGISTRY_BUDGET, maxReferenceDepth: 1 });
  const requested: string[] = [];
  registry.setProvider({
    async load({ uri: request }) {
      requested.push(request);
      return { retrievalURI: request, content: { $ref: './leaf.json' } };
    },
  });
  const model = await projectArazzo(flow(), uri, registry);
  expect(requested).toEqual(['https://example.test/schema.json']);
  expect(model.document.workflows[1].inputs).toEqual({ $ref: './schema.json' });
  expect(model.inspection.snapshot.diagnostics?.some((d) => /depth/i.test(d.message))).toBe(true);
});

it('invalidates pinned root projections on dependency reload while retaining unrelated sources', async () => {
  const registry = new SourceRegistry();
  let schemaType = 'integer';
  registry.setProvider({
    async load(request) {
      return {
        retrievalURI: request.uri,
        revision: request.revision,
        content: request.uri === uri ? flow() : { type: schemaType },
      };
    },
  });
  const acquired = await registry.acquire(uri, 'root-v1');
  const validity = registry.captureValidity(uri, 'root-v1');
  await projectArazzo(acquired.content, uri, registry, acquired.revision);
  await registry.acquire('https://example.test/unrelated.json');
  registry.reload('https://example.test/schema.json');
  expect(registry.isCurrent(validity)).toBe(false);
  expect(registry.getEntry('https://example.test/unrelated.json')?.state).toBe('located');
  schemaType = 'string';
  const fresh = await registry.acquire(uri, 'root-v1');
  const model = await projectArazzo(fresh.content, uri, registry, fresh.revision);
  expect(model.document.workflows[1].inputs).toEqual({ type: 'string' });
});

it('rejects an alias that conflicts with the supplied root identity', async () => {
  const registry = new SourceRegistry();
  registry.setProvider({
    async load() {
      return { retrievalURI: uri, content: { type: 'integer' } };
    },
  });
  const model = await projectArazzo(flow(), uri, registry);
  expect(model.document.workflows[1].inputs).toEqual({ $ref: './schema.json' });
  expect(
    model.inspection.snapshot.diagnostics?.some((d) => /conflicts.*root/i.test(d.message)),
  ).toBe(true);
});

it('retains a conflicting second alias instead of substituting the first returned revision', async () => {
  const registry = new SourceRegistry();
  registry.setProvider({
    async load({ uri: request }) {
      return {
        retrievalURI: 'https://cdn.example.test/shared.json',
        revision: request.endsWith('/schema.json') ? 'one' : 'two',
        content: { type: request.endsWith('/schema.json') ? 'integer' : 'string' },
      };
    },
  });
  const document = flow();
  document.workflows[2].inputs = { $ref: './other.json' };
  const model = await projectArazzo(document, uri, registry);
  expect(model.document.workflows[1].inputs).toEqual({ type: 'integer' });
  expect(model.document.workflows[2].inputs).toEqual({ $ref: './other.json' });
  expect(
    model.inspection.snapshot.diagnostics?.some((d) => /conflicting.*revision/i.test(d.message)),
  ).toBe(true);
});

it.each(['provider', 'dependency'] as const)(
  'rejects obsolete Arazzo projection after %s replacement',
  async (replacement) => {
    const registry = new SourceRegistry();
    const requests: string[] = [];
    let settle!: (value: SourceDocumentContent) => void;
    registry.setProvider({
      async load({ uri: request }) {
        requests.push(request);
        return new Promise<SourceDocumentContent>((resolve) => {
          settle = resolve;
        });
      },
    });
    const projection = projectArazzo(flow(), uri, registry);
    const outcome = projection.then(
      () => 'published',
      () => 'obsolete',
    );
    await vi.waitFor(() => expect(settle).toBeDefined());
    if (replacement === 'provider')
      registry.setProvider({
        async load({ uri: request }) {
          return { retrievalURI: request, content: { type: 'string' } };
        },
      });
    else registry.reload('https://example.test/schema.json');
    settle({
      retrievalURI: 'https://example.test/schema.json',
      content: { $ref: './must-not-load.json' },
    });
    expect(await outcome).toBe('obsolete');
    expect(requests).toEqual(['https://example.test/schema.json']);
  },
);
