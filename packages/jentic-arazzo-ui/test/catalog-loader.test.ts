import { it, expect } from 'vitest';
import { loadCatalog } from '../src/utils/catalog/load';
import { authoredDigest } from '../src/utils/location/codec';
import type { WorkflowCatalogManifest } from '../src/types/catalog';
const doc = {
  arazzo: '1.0.1',
  info: { title: 'shop', version: '1' },
  sourceDescriptions: [],
  workflows: [{ workflowId: 'buy', steps: [] }],
};
const manifest = (documents: WorkflowCatalogManifest['documents']): WorkflowCatalogManifest => ({
  version: 1,
  id: 'catalog',
  revision: '1',
  documents,
});
it('loads pinned relative content and localizes digest and acquisition failures', async () => {
  const digest = await authoredDigest(doc);
  const result = await loadCatalog(
    manifest([
      { id: 'shop', revision: 'v1', uri: './shop.yaml', expectedDigest: digest },
      {
        id: 'wrong',
        revision: 'v1',
        uri: './wrong.yaml',
        expectedDigest: `sha256:${'0'.repeat(64)}`,
      },
      { id: 'absent', revision: 'v1', uri: './absent.yaml' },
    ]),
    {
      manifestURI: 'https://example.test/catalog.json',
      provider: {
        async load({ uri }) {
          if (uri.endsWith('absent.yaml')) throw new Error('Unavailable');
          return { content: doc, retrievalURI: uri };
        },
      },
    },
  );
  expect(result.documents).toHaveLength(1);
  expect(result.documents[0].uri).toBe('https://example.test/shop.yaml');
  expect(result.coverage.slice(0, 3).map((item) => item.state)).toEqual([
    'loaded',
    'failed',
    'failed',
  ]);
  expect(result.coverage[1].message).toMatch(/digest/i);
});
it('requires provider revision evidence when no expected digest is supplied', async () => {
  const result = await loadCatalog(
    manifest([{ id: 'shop', revision: 'v1', uri: 'https://example.test/shop' }]),
    {
      provider: {
        async load({ uri }) {
          return { content: doc, retrievalURI: uri };
        },
      },
    },
  );
  expect(result.coverage[0].message).toMatch(/revision mismatch/i);
});
it('bounds documents, bytes and authored steps while keeping failures visible', async () => {
  const documents = Array.from({ length: 3 }, (_, i) => ({
    id: String(i),
    revision: '1',
    uri: `https://example.test/${i}`,
    content: doc,
  }));
  const bounded = await loadCatalog(manifest(documents), { limits: { maxDocuments: 2 } });
  expect(bounded.documents).toHaveLength(2);
  expect(bounded.coverage[2].message).toMatch(/count/i);
  const large = await loadCatalog(manifest(documents), { limits: { maxTotalBytes: 10 } });
  expect(large.documents).toHaveLength(0);
  expect(large.coverage.every((c) => c.state !== 'loaded')).toBe(true);
  const steps = await loadCatalog(
    manifest([
      {
        ...documents[0],
        content: {
          ...doc,
          workflows: [{ workflowId: 'buy', steps: [{ stepId: 's' }, { stepId: 't' }] }],
        },
      },
    ]),
    { limits: { maxSteps: 1 } },
  );
  expect(steps.coverage[0].message).toMatch(/step/i);
});
it('cancels even a provider which ignores its signal', async () => {
  const controller = new AbortController();
  const result = loadCatalog(
    manifest([{ id: 'slow', revision: '1', uri: 'https://example.test/slow' }]),
    {
      signal: controller.signal,
      provider: { load: () => new Promise(() => {}) },
    },
  );
  controller.abort();
  await expect(result).rejects.toThrow(/abort/i);
});
it('uses a uniquely supplied pinned revision for external contract references without another fetch', async () => {
  const value = await loadCatalog(
    manifest([
      {
        id: 'a',
        revision: '1',
        uri: 'https://example.test/a',
        kind: 'openapi',
        content: {
          openapi: '3.1.0',
          info: { title: 'A', version: '1' },
          paths: {
            '/a': {
              get: {
                operationId: 'a',
                responses: { '200': { $ref: 'https://example.test/b#/components/responses/Ok' } },
              },
            },
          },
        },
      },
      {
        id: 'b',
        revision: '1',
        uri: 'https://example.test/b',
        kind: 'openapi',
        content: {
          openapi: '3.1.0',
          info: { title: 'B', version: '1' },
          paths: {},
          components: { responses: { Ok: { description: 'Pinned response' } } },
        },
      },
    ]),
  );
  expect(value.coverage.every((c) => c.state === 'loaded')).toBe(true);
  expect(
    JSON.stringify([...value.documents[0].contracts!.operations.values()][0].responses),
  ).toContain('Pinned response');
});
it('loads dynamic workflow dependencies recursively with visible bounded and cyclic coverage', async () => {
  const root = {
    ...doc,
    sourceDescriptions: [{ name: 'worker', type: 'arazzo', url: './worker' }],
  };
  const worker = {
    ...doc,
    sourceDescriptions: [
      { name: 'pay', type: 'openapi', url: './pay' },
      { name: 'root', type: 'arazzo', url: './root' },
    ],
    workflows: [{ workflowId: 'buy', steps: [{ stepId: 'pay', operationId: 'capture' }] }],
  };
  const calls: string[] = [];
  const value = await loadCatalog(
    manifest([{ id: 'root', revision: '1', uri: 'https://example.test/root', content: root }]),
    {
      provider: {
        async load({ uri }) {
          calls.push(uri);
          return {
            content: uri.endsWith('worker')
              ? worker
              : {
                  openapi: '3.1.0',
                  info: { title: 'Pay', version: '1' },
                  paths: { '/pay': { post: { operationId: 'capture', responses: {} } } },
                },
            retrievalURI: uri,
          };
        },
      },
    },
  );
  expect(calls).toEqual(['https://example.test/worker', 'https://example.test/pay']);
  expect(value.coverage.every((c) => c.state === 'loaded')).toBe(true);
  const { buildCatalogIndex } = await import('../src/utils/catalog');
  expect(buildCatalogIndex(value).apiUsages[0].status).toBe('located');
  const bounded = await loadCatalog(
    manifest([{ id: 'root', revision: '1', uri: 'https://example.test/root', content: root }]),
    { limits: { maxReferenceDepth: 0 } },
  );
  expect(bounded.coverage.some((c) => c.state === 'failed' && /depth/i.test(c.message ?? ''))).toBe(
    true,
  );
});
