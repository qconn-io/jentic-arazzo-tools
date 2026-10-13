import { it, expect } from 'vitest';
import { loadCatalog } from '../src/utils/catalog/load';
import { buildCatalogIndex, catalogReachability, catalogPathLocation } from '../src/utils/catalog';
import { consumerCatalog } from './fixtures/upstream-readiness';

it('retains one direct operation use and two entry call identities in the preparation fixture', async () => {
  const index = buildCatalogIndex(await loadCatalog(consumerCatalog()));
  expect(index.complete).toBe(true);
  expect(index.apiUsages).toHaveLength(1);
  expect(index.apiUsages[0]).toMatchObject({
    status: 'located',
    from: { workflowId: 'helper', revision: 'old' },
    stepId: 'capture',
  });
  const helper = index.entries.find((entry) => entry.workflowId === 'helper')!;
  const paths = catalogReachability(index, helper).paths;
  expect(paths.map((path) => path.entry.workflowId)).toEqual(['entry', 'entry']);
  expect(
    paths.map((path) => catalogPathLocation(path, helper, 'capture')?.selection?.occurrence),
  ).toEqual([
    [{ workflowId: 'entry', stepId: 'first-item' }],
    [{ workflowId: 'entry', stepId: 'second-item' }],
  ]);
});

it('keeps unavailable source coverage visible in the partial consumer fixture', async () => {
  const index = buildCatalogIndex(await loadCatalog(consumerCatalog('partial')));
  expect(index.complete).toBe(false);
  expect(index.apiUsages).toHaveLength(1);
  expect(index.apiUsages[0].status).not.toBe('located');
  expect(index.coverage.some((item) => item.state === 'failed')).toBe(true);
});

it('terminates cyclic consumer paths while retaining both distinct entry calls', async () => {
  const index = buildCatalogIndex(await loadCatalog(consumerCatalog('cyclic')));
  const helper = index.entries.find((entry) => entry.workflowId === 'helper')!;
  const reach = catalogReachability(index, helper);
  expect(index.apiUsages).toHaveLength(1);
  expect(reach.paths).toHaveLength(2);
  expect(reach.cycles.length).toBeGreaterThan(0);
  expect(reach.paths.every((path) => path.entry.workflowId === 'entry')).toBe(true);
});
