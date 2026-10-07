import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { it, expect } from 'vitest';
import { loadCatalog } from '../src/utils/catalog/load';
import { buildCatalogIndex, catalogReachability } from '../src/utils/catalog';
import { normalizeCatalogManifest } from '../src/utils/catalog/manifest';
import { resolveLocation } from '../src/utils/location/resolve';
import { buildViewerModel } from '../src/utils/model/viewerModel';

it('pins all nine audited documents, preserves recovery/prerequisite classifications, and retains intentional warnings', async () => {
  const manifest = normalizeCatalogManifest(
    JSON.parse(await readFile(resolve('public/examples/catalog.json'), 'utf8')),
  );
  const loaded = await loadCatalog(manifest, {
    manifestURI: 'https://samples.test/examples/catalog.json',
    provider: {
      async load({ uri }) {
        return {
          content: await readFile(resolve('public', new URL(uri).pathname.slice(1)), 'utf8'),
          retrievalURI: uri,
        };
      },
    },
  });
  expect(loaded.documents.filter((d) => d.inspection)).toHaveLength(9);
  expect(loaded.documents).toHaveLength(manifest.documents.length);
  expect(
    loaded.coverage.slice(0, manifest.documents.length).every((c) => c.state === 'loaded'),
  ).toBe(true);
  const index = buildCatalogIndex(loaded);
  expect(index.entries).toHaveLength(45);
  expect(index.entries.every((e) => e.metadata?.role && e.metadata?.owner === undefined)).toBe(
    true,
  );
  const recovery = index.relationships.find(
    (r) =>
      r.from.workflowId === 'capture-authorized-payment' &&
      r.to?.workflowId === 'reconcile-payment',
  )!;
  expect(recovery.kind).toBe('retry');
  const entry = index.byKey.get(
    JSON.stringify(['http-commerce', 'sample-2026-10-07', 'capture-authorized-payment']),
  )!;
  expect(
    resolveLocation(buildViewerModel(entry.document.inspection!), recovery.location, {
      document: entry.document.uri,
      revision: entry.revision,
      digest: entry.document.digest,
    }).status.state,
  ).toBe('restored');
  const cycle = index.entries.find((e) => e.documentId === 'prerequisite-cycle')!;
  expect(
    buildViewerModel(cycle.document.inspection!).diagnostics.some(
      (d) => d.category === 'prerequisite-cycle',
    ),
  ).toBe(true);
  expect(
    index.relationships
      .filter((r) => r.from.documentId === 'prerequisite-cycle')
      .every((r) => r.kind === 'prerequisite'),
  ).toBe(true);
  expect(
    catalogReachability(index, cycle, { kinds: ['prerequisite'] }).cycles.length,
  ).toBeGreaterThan(0);
  expect(index.complete).toBe(false);
  expect(index.coverage.some((c) => c.state === 'failed' && c.uri.includes('not-supplied'))).toBe(
    true,
  );
  expect(
    index.apiUsages.some(
      (u) => u.status === 'located' && u.operation?.operationId === 'capturePayment',
    ),
  ).toBe(true);
});
