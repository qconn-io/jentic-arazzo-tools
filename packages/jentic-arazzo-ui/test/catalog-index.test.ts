import { it, expect } from 'vitest';
import { loadCatalog } from '../src/utils/catalog/load';
import {
  buildCatalogIndex,
  filterCatalogEntries,
  catalogReachability,
} from '../src/utils/catalog/index';
import { catalogKey } from '../src/utils/catalog/manifest';
import type { WorkflowCatalogManifest } from '../src/types/catalog';
const document = {
  arazzo: '1.0.1',
  info: { title: 'Payments', version: '1' },
  sourceDescriptions: [{ name: 'pay', type: 'openapi', url: './pay.json' }],
  workflows: [
    {
      workflowId: 'entry',
      steps: [
        { stepId: 'first', workflowId: 'capture' },
        { stepId: 'second', workflowId: 'capture' },
      ],
    },
    {
      workflowId: 'capture',
      steps: [
        {
          stepId: 'call',
          operationId: 'capture',
          onFailure: [{ name: 'recover', type: 'retry', workflowId: 'reconcile' }],
        },
      ],
    },
    { workflowId: 'reconcile', dependsOn: ['$workflows.capture'], steps: [] },
  ],
};
const api = {
  openapi: '3.1.0',
  info: { title: 'Pay', version: '1' },
  paths: { '/capture': { post: { operationId: 'capture', responses: {} } } },
};
const manifest: WorkflowCatalogManifest = {
  version: 1,
  id: 'c',
  revision: '1',
  products: [{ id: 'shop', name: 'Shop' }],
  capabilities: [{ id: 'purchase', name: 'Purchase' }],
  documents: ['a', 'b'].flatMap((id) =>
    ['1', '2'].map((revision) => ({
      id,
      revision,
      uri: `https://example.test/${id}/${revision}/workflow`,
      content: document,
      workflows: [
        {
          workflowId: 'entry',
          role: 'entry' as const,
          product: 'shop',
          capabilities: ['purchase'],
        },
        { workflowId: 'capture', role: 'helper' as const },
      ],
    })),
  ),
};
async function index() {
  return buildCatalogIndex(
    await loadCatalog(manifest, {
      provider: {
        async load({ uri }) {
          return { content: api, retrievalURI: uri };
        },
      },
    }),
  );
}
it('keeps identical workflow and operation names separate across documents and revisions', async () => {
  const value = await index();
  expect(value.entries).toHaveLength(12);
  expect(new Set(value.entries.map((e) => e.key)).size).toBe(12);
  expect(value.apiUsages.filter((u) => u.status === 'located')).toHaveLength(4);
  expect(new Set(value.apiUsages.map((u) => u.operationKey)).size).toBe(4);
});
it('retains retry recovery, prerequisites and authored action/step addresses', async () => {
  const value = await index();
  const incoming = value.relationships.filter((r) => r.to?.workflowId === 'reconcile');
  expect(incoming.map((r) => r.kind)).toEqual(['retry', 'retry', 'retry', 'retry']);
  expect(incoming[0].location.selection?.kind).toBe('action');
  expect(value.relationships.filter((r) => r.kind === 'prerequisite')).toHaveLength(4);
});
it('separates unique authored usage from entry reachability and retains repeated call paths and cycles', async () => {
  const value = await index();
  const target = { documentId: 'a', revision: '1', workflowId: 'capture' };
  const reach = catalogReachability(value, target);
  expect(reach.entries.map((e) => e.workflowId)).toEqual(['entry']);
  expect(reach.paths).toHaveLength(2);
  expect(reach.paths.map((p) => p.relationships[0].location.selection?.stepId)).toEqual([
    'first',
    'second',
  ]);
  expect(value.apiUsages.filter((u) => catalogKey(u.from) === catalogKey(target))).toHaveLength(1);
  const transfers = catalogReachability(value, target, {
    kinds: ['call', 'prerequisite', 'retry'],
  });
  expect(transfers.cycles.length).toBeGreaterThan(0);
  const bounded = catalogReachability(value, target, { maxPaths: 1 });
  expect(bounded.bounded).toBe(true);
});
it('filters only supplied metadata and enables operation-to-workflow discovery', async () => {
  const value = await index();
  expect(
    filterCatalogEntries(value, { capability: 'purchase', role: 'entry', owner: 'unknown' }),
  ).toHaveLength(4);
  expect(filterCatalogEntries(value, { owner: 'Coordinator' })).toHaveLength(0);
  expect(
    filterCatalogEntries(value, { api: 'capture' }).every((e) => e.workflowId === 'capture'),
  ).toBe(true);
});
it('retains unresolved API candidates and partial-coverage language', async () => {
  const loaded = await loadCatalog(manifest);
  const value = buildCatalogIndex(loaded);
  expect(value.complete).toBe(false);
  expect(value.apiUsages.every((u) => u.status !== 'located')).toBe(true);
  expect(value.coverageMessage).toMatch(/partial|incomplete/i);
});
it('keeps explicit descriptive associations separate from standard references', async () => {
  const input = {
    ...manifest,
    associations: [
      {
        id: 'business-link',
        description: 'Supplied implementation association',
        from: { documentId: 'a', revision: '1', workflowId: 'entry' },
        to: { documentId: 'b', revision: '2', workflowId: 'capture' },
      },
    ],
  };
  const value = buildCatalogIndex(await loadCatalog(input));
  expect(value.relationships.find((r) => r.id === 'association:business-link')).toMatchObject({
    kind: 'descriptive',
    status: 'located',
  });
  expect(
    catalogReachability(value, {
      documentId: 'b',
      revision: '2',
      workflowId: 'capture',
    }).entries.every((e) => e.documentId === 'b'),
  ).toBe(true);
});
it('restores both repeated call occurrences without inventing occurrence context for transfers', async () => {
  const { catalogPathLocation } = await import('../src/utils/catalog');
  const value = await index();
  const target = value.byKey.get(
    catalogKey({ documentId: 'a', revision: '1', workflowId: 'capture' }),
  )!;
  const reach = catalogReachability(value, target);
  const locations = reach.paths.map((p) => catalogPathLocation(p, target, 'call'));
  expect(locations.map((l) => l?.selection?.occurrence?.[0].stepId)).toEqual(['first', 'second']);
  expect(locations.every((l) => l?.root === 'entry' && l.selection?.workflowId === 'capture')).toBe(
    true,
  );
  const recovery = value.relationships.find((r) => r.kind === 'retry')!;
  expect(
    catalogPathLocation({ entry: target, relationships: [recovery] }, target, 'call'),
  ).toBeUndefined();
});
