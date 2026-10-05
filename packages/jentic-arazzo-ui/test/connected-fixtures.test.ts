import { expect, test } from 'vitest';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { nestedCalls, recursiveCalls, difficultCalls } from './fixtures/connected';

test('real loading retains distinct repeated-call mappings and only standard composition', async () => {
  const before = structuredClone(nestedCalls);
  const loaded = await loadDocument(nestedCalls, { baseURI: 'https://example.test/viewer/' });
  const model = buildViewerModel(inspect(loaded.snapshot));
  expect(
    model.relationships.map((r) => [
      r.kind,
      r.sourceWorkflowId,
      r.sourceStepId,
      r.targetWorkflowId,
    ]),
  ).toEqual([
    ['call', 'checkout', 'firstPayment', 'payment'],
    ['call', 'checkout', 'secondPayment', 'payment'],
    ['call', 'payment', 'audit', 'audit'],
  ]);
  expect(model.relationships.slice(0, 2).map((r) => r.parameters[0].value.value)).toEqual([
    0,
    '$inputs.amount',
  ]);
  expect(model.stepsByWorkflow.get('payment')!.get('charge')!.sourceBinding.sourceName).toBe(
    'store-api',
  );
  expect(model.stepsByWorkflow.get('audit')!.get('record')!.sourceBinding.sourceName).toBe(
    'store.api',
  );
  expect(loaded.document.workflows[3].steps[0]).toHaveProperty('x-internal-processing', {
    workflowId: 'checkout',
  });
  expect(nestedCalls).toEqual(before);
});

test('focused difficult fixtures retain recursion, transfer channels and unavailable destinations', async () => {
  const recursive = buildViewerModel(inspect((await loadDocument(recursiveCalls)).snapshot));
  expect(recursive.relationships.map((r) => [r.sourceWorkflowId, r.targetWorkflowId])).toEqual([
    ['checkout', 'payment'],
    ['payment', 'checkout'],
  ]);
  const model = buildViewerModel(inspect((await loadDocument(difficultCalls)).snapshot));
  expect(model.relationships.map((r) => [r.kind, r.actionType, r.target.kind])).toEqual([
    ['action', 'goto', 'local-workflow'],
    ['action', 'retry', 'local-workflow'],
    ['call', undefined, 'external-workflow'],
    ['call', undefined, 'missing'],
    ['prerequisite', undefined, 'local-workflow'],
  ]);
  expect(model.workflows[0].steps[3].sourceBinding.status).toBe('ambiguous');
  expect(model.relationships.some((r) => r.sourceWorkflowId === 'client')).toBe(false);
});
