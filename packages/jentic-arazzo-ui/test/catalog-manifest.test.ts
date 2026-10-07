import { describe, it, expect } from 'vitest';
import { normalizeCatalogManifest } from '../src/utils/catalog/manifest';

const manifest = () => ({
  version: 1,
  id: 'portfolio',
  revision: 'v1',
  documents: [
    {
      id: 'shop',
      revision: 'r1',
      uri: './shop.yaml',
      workflows: [{ workflowId: 'buy', role: 'entry' }],
    },
  ],
});
describe('supplied catalog authority', () => {
  it('preserves unknown ownership and absent optional metadata', () => {
    const value = normalizeCatalogManifest(manifest());
    expect(value.documents[0].workflows?.[0].owner).toBeUndefined();
    expect(value.documents[0].workflows?.[0].capabilities).toBeUndefined();
  });
  it('rejects duplicate scoped keys but permits separate documents and revisions', () => {
    const value = manifest();
    value.documents.push({ ...value.documents[0] });
    expect(() => normalizeCatalogManifest(value)).toThrow(/duplicate/i);
    value.documents[1].revision = 'r2';
    expect(normalizeCatalogManifest(value).documents).toHaveLength(2);
    value.documents[0].workflows.push({ workflowId: 'buy', role: 'helper' });
    expect(() => normalizeCatalogManifest(value)).toThrow(/duplicate/i);
  });
  it('diagnoses undeclared owners and malformed references and version', () => {
    expect(() =>
      normalizeCatalogManifest({
        ...manifest(),
        owners: [],
        documents: [
          { ...manifest().documents[0], workflows: [{ workflowId: 'buy', owner: 'Coordinator' }] },
        ],
      }),
    ).toThrow(/owner/i);
    expect(() => normalizeCatalogManifest({ ...manifest(), version: 2 })).toThrow(/version/i);
    expect(() =>
      normalizeCatalogManifest({ ...manifest(), documents: [{ id: 'shop', uri: 'a' }] }),
    ).toThrow(/revision/i);
  });
});
