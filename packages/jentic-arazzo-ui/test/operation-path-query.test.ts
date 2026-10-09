import { it, expect } from 'vitest';
import { loadCatalog } from '../src/utils/catalog/load';
import { buildCatalogIndex, catalogOperationPaths } from '../src/utils/catalog';
import { consumerCatalog, consumerWorkflow, paymentContract } from './fixtures/upstream-readiness';

it('retains two call identities for one operation and one direct helper use', async () => {
  const index = buildCatalogIndex(await loadCatalog(consumerCatalog()));
  const result = catalogOperationPaths(index, index.apiUsages[0].operationKey!);
  expect(result.usages).toHaveLength(1);
  expect(result.paths.map((path) => path.location?.selection?.occurrence)).toEqual([
    [{ workflowId: 'entry', stepId: 'first-item' }],
    [{ workflowId: 'entry', stepId: 'second-item' }],
  ]);
  expect(new Set(result.paths.map((path) => path.key)).size).toBe(2);
  expect(result.complete).toBe(true);
});

it('shares path and visit limits across multiple direct step uses', async () => {
  const manifest = consumerCatalog();
  const flow = consumerWorkflow();
  flow.workflows[1].steps.push({
    stepId: 'capture-again',
    operationId: '$sourceDescriptions.pay.capture',
  });
  manifest.documents[0].content = flow;
  const index = buildCatalogIndex(await loadCatalog(manifest));
  const key = index.apiUsages[0].operationKey!;
  const paths = catalogOperationPaths(index, key, { maxPaths: 3 });
  expect(paths.usages).toHaveLength(2);
  expect(paths.paths).toHaveLength(3);
  expect(paths.bounded).toBe(true);
  expect(paths.complete).toBe(false);
  const visits = catalogOperationPaths(index, key, { maxVisits: 4 });
  expect(visits.visits).toBe(4);
  expect(visits.bounded).toBe(true);
});

it('retains cycles and classifies descriptive paths without fabricating call locations', async () => {
  const manifest = consumerCatalog('cyclic');
  manifest.associations = [
    {
      id: 'descriptive-use',
      from: { documentId: 'flow', revision: 'old', workflowId: 'unrelated' },
      to: { documentId: 'flow', revision: 'old', workflowId: 'helper' },
      description: 'Explicit inspection association',
    },
  ];
  const index = buildCatalogIndex(await loadCatalog(manifest));
  const result = catalogOperationPaths(index, index.apiUsages[0].operationKey!);
  expect(result.cycles.length).toBeGreaterThan(0);
  const descriptive = result.paths.find((path) => path.entry.workflowId === 'unrelated')!;
  expect(descriptive.relationships.map((relation) => relation.kind)).toEqual(['descriptive']);
  expect(descriptive.location).toBeUndefined();
  expect(descriptive.relationships[0].location.root).toBe('unrelated');
});

it('keeps unresolved relationship coverage partial instead of claiming complete consumers', async () => {
  const manifest = consumerCatalog();
  const flow = consumerWorkflow();
  flow.workflows[2].steps.push({ stepId: 'missing', workflowId: 'absent' });
  manifest.documents[0].content = flow;
  const index = buildCatalogIndex(await loadCatalog(manifest));
  const result = catalogOperationPaths(index, index.apiUsages[0].operationKey!);
  expect(result.paths.map((path) => path.entry.workflowId)).toEqual(['entry', 'entry']);
  expect(result.complete).toBe(false);
});

it('includes prerequisites for the originating step and excludes prerequisites for another step', async () => {
  const manifest = consumerCatalog();
  const flow = consumerWorkflow();
  flow.arazzo = '1.1.0';
  flow.workflows[1].steps.push({ stepId: 'other', operationId: '$sourceDescriptions.pay.other' });
  for (const stepId of ['capture', 'other']) {
    const workflowId = `wait-${stepId}`;
    flow.workflows.push({
      workflowId,
      steps: [
        {
          stepId: 'wait',
          dependsOn: [`$workflows.helper.steps.${stepId}`],
          operationId: '$sourceDescriptions.pay.other',
        },
      ],
    });
    manifest.documents[0].workflows!.push({ workflowId, role: 'entry' });
  }
  manifest.documents[0].content = flow;
  const api = paymentContract();
  manifest.documents[1].content = {
    ...api,
    paths: { ...api.paths, '/other': { get: { operationId: 'other', responses: {} } } },
  };
  const index = buildCatalogIndex(await loadCatalog(manifest));
  const result = catalogOperationPaths(
    index,
    index.apiUsages.find((use) => use.stepId === 'capture')!.operationKey!,
  );
  expect(result.paths.map((path) => path.entry.workflowId)).toEqual([
    'entry',
    'entry',
    'wait-capture',
  ]);
  const prerequisite = result.paths.find((path) => path.entry.workflowId === 'wait-capture')!;
  expect(prerequisite.relationships.map((relation) => relation.kind)).toEqual(['prerequisite']);
  expect(prerequisite.location).toBeUndefined();
});

it('retains cross-document revision identities with source navigation instead of a fabricated local call', async () => {
  const manifest = consumerCatalog();
  const flow = consumerWorkflow();
  flow.sourceDescriptions.push({
    name: 'remote',
    type: 'arazzo',
    url: 'https://example.test/remote.json',
  });
  flow.workflows[0].steps.push({
    stepId: 'remote-item',
    workflowId: '$sourceDescriptions.remote.helper',
  });
  manifest.documents[0].content = flow;
  manifest.documents[0].sources!.remote = { documentId: 'remote', revision: 'new' };
  manifest.documents.push({
    id: 'remote',
    revision: 'new',
    uri: 'https://example.test/remote.json',
    content: consumerWorkflow(),
    sources: { pay: { documentId: 'pay', revision: 'old' } },
    workflows: [{ workflowId: 'helper', role: 'helper' }],
  });
  const index = buildCatalogIndex(await loadCatalog(manifest));
  const result = catalogOperationPaths(index, index.apiUsages[0].operationKey!);
  expect(result.usages).toHaveLength(2);
  const remote = result.paths.find((path) => path.usage.from.documentId === 'remote')!;
  expect(remote.usage.from.revision).toBe('new');
  expect(remote.entry.revision).toBe('old');
  expect(remote.relationships[0].location.selection?.stepId).toBe('remote-item');
  expect(remote.location).toBeUndefined();
});
