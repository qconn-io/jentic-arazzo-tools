import { expect, test } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import * as resolution from '../src/utils/location/resolve';
import type { WorkflowLocation } from '../src/types/location';
import { nestedCalls } from './fixtures/connected';
const document = structuredClone(nestedCalls);
document.workflows[1].steps[0].onFailure = [
  { name: 'recover', type: 'retry', workflowId: 'audit' },
];
document.workflows[0].steps.push({ stepId: 'second-item', workflowId: 'payment' });
const model = buildViewerModel(inspect(createSnapshot(document)));
const location: WorkflowLocation = {
  version: 1,
  document: 'host:doc',
  root: 'checkout',
  view: 'docs',
  subview: 'sequence',
  selection: {
    kind: 'step',
    workflowId: 'payment',
    stepId: 'charge',
    occurrence: [{ workflowId: 'checkout', stepId: 'second-item' }],
  },
};
const resolve = (value: WorkflowLocation) =>
  resolution.resolveLocation(model, value, {
    document: 'host:doc',
    digest: 'current',
    revision: 'v1',
  });
test('restores second-item exactly and never substitutes the first call', () => {
  expect(resolution.resolveLocation).toBeTypeOf('function');
  const result = resolve(location);
  expect(result.status.state).toBe('restored');
  expect(result.row?.workflowId).toBe('payment');
  expect(result.row?.path).toEqual([['checkout', 'second-item']]);
  expect(
    resolve({
      ...location,
      selection: {
        ...location.selection!,
        occurrence: [{ workflowId: 'checkout', stepId: 'removed' }],
      },
    }).status,
  ).toMatchObject({
    state: 'stale',
    unavailableSegment: { workflowId: 'checkout', stepId: 'removed' },
  });
});
test('revision mismatch does not select occurrence contents and cross-document is a host request', () => {
  expect(resolution.resolveLocation).toBeTypeOf('function');
  expect(resolve({ ...location, revision: 'v0' }).status.state).toBe('stale');
  expect(resolve({ ...location, revision: 'v0' }).row).toBeUndefined();
  expect(resolve({ ...location, digest: 'old' }).status.state).toBe('stale');
  expect(resolve({ ...location, document: 'host:other' }).status.state).toBe('document-request');
});
test('action declaration and scoped use distinguish an action from its operation', () => {
  expect(resolution.actionAddress).toBeTypeOf('function');
  const action = model.stepsByWorkflow.get('payment')!.get('charge')!.effectiveActions.onFailure[0];
  const address = resolution.actionAddress(action, 'host:doc');
  const result = resolve({
    ...location,
    selection: { ...location.selection!, kind: 'action', action: address },
  });
  expect(result.status.state).toBe('restored');
  expect(result.row?.action?.value.name).toBe(action.value.name);
  expect(result.row?.kind).toBe('transfer');
  expect(
    resolve({
      ...location,
      selection: {
        ...location.selection!,
        kind: 'action',
        action: { ...address, pointer: '/missing' },
      },
    }).status.state,
  ).toBe('stale');
});
test('duplicate ids in different workflows remain scoped, ambiguous authored ids are rejected', () => {
  expect(resolution.resolveLocation).toBeTypeOf('function');
  const doc = structuredClone(document);
  doc.workflows[2].steps[0].stepId = 'charge';
  const m = buildViewerModel(inspect(createSnapshot(doc)));
  expect(resolution.resolveLocation(m, location, { document: 'host:doc' }).row?.workflowId).toBe(
    'payment',
  );
  doc.workflows[1].steps.push({ ...doc.workflows[1].steps[0] });
  expect(() => inspect(createSnapshot(doc))).toThrow('duplicate scoped step ID');
});
test('row and recursion limits retain authored detail without expanding beyond the budget', () => {
  expect(resolution.resolveLocation).toBeTypeOf('function');
  const doc = structuredClone(document);
  doc.workflows[0].steps = Array.from({ length: 250 }, (_, i) => ({
    stepId: `s${i}`,
    operationId: 'api.op',
  }));
  const m = buildViewerModel(inspect(createSnapshot(doc)));
  const result = resolution.resolveLocation(
    m,
    {
      ...location,
      selection: { kind: 'step', workflowId: 'checkout', stepId: 's240', occurrence: [] },
    },
    { document: 'host:doc' },
  );
  expect(result.status.state).toBe('bounded');
  expect(result.row?.step?.stepId).toBe('s240');
  expect(result.scene?.rows).toHaveLength(200);
  expect(result.scene?.rows.at(-1)?.reason).toBe('rows');
});
test('restoration preserves recursion and eight-level boundaries and opens only required ancestry', () => {
  const doc = structuredClone(document);
  doc.workflows = Array.from({ length: 11 }, (_, i) => ({
    workflowId: `w${i}`,
    steps: [
      { stepId: 'call', workflowId: `w${i + 1}` },
      { stepId: 'op', operationId: 'api.op' },
    ],
  }));
  const m = buildViewerModel(inspect(createSnapshot(doc)));
  const value: WorkflowLocation = {
    ...location,
    root: 'w0',
    selection: {
      kind: 'step',
      workflowId: 'w10',
      stepId: 'op',
      occurrence: Array.from({ length: 10 }, (_, i) => ({ workflowId: `w${i}`, stepId: 'call' })),
    },
  };
  const result = resolution.resolveLocation(m, value, { document: 'host:doc' });
  expect(result.status.state).toBe('bounded');
  expect(result.scene?.rows.some((r) => r.reason === 'depth')).toBe(true);
  expect(Math.max(...result.scene!.rows.map((r) => r.depth))).toBeLessThanOrEqual(9);
  doc.workflows = [
    {
      workflowId: 'w0',
      steps: [
        { stepId: 'call', workflowId: 'w0' },
        { stepId: 'op', operationId: 'api.op' },
      ],
    },
  ];
  const recursive = buildViewerModel(inspect(createSnapshot(doc)));
  expect(
    resolution.resolveLocation(
      recursive,
      {
        ...value,
        selection: {
          kind: 'step',
          workflowId: 'w0',
          stepId: 'op',
          occurrence: [{ workflowId: 'w0', stepId: 'call' }],
        },
      },
      { document: 'host:doc' },
    ),
  ).toMatchObject({ status: { state: 'bounded' } });
  const minimum = resolve(location);
  expect(
    minimum.scene?.rows.filter((r) => r.kind === 'call' && r.expanded).map((r) => r.step?.stepId),
  ).toEqual(['second-item']);
});
