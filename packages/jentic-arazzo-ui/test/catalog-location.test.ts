import { it, expect } from 'vitest';
import { catalogLocation, readCatalogLocation } from '../src/utils/catalog/location';
const manifest = { version: 1 as const, id: 'shop', revision: 'r1', documents: [] };
const location = {
  version: 1 as const,
  document: 'https://example.test/shop.yaml',
  revision: 'd1',
  root: 'buy',
  view: 'docs' as const,
  subview: 'docs' as const,
};
it('restores exact catalog/document revision and authored selection', () => {
  const scoped = catalogLocation(
    manifest,
    { documentId: 'shop-doc', revision: 'd1', workflowId: 'buy' },
    location,
  );
  expect(readCatalogLocation(manifest, scoped).selection).toMatchObject({
    documentId: 'shop-doc',
    revision: 'd1',
    workflowId: 'buy',
  });
  expect(readCatalogLocation({ ...manifest, revision: 'r2' }, scoped).error).toMatch(
    /catalog revision/i,
  );
  expect(readCatalogLocation(manifest, { ...scoped, revision: 'other' }).error).toMatch(
    /revision/i,
  );
});
