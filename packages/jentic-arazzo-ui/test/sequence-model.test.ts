import { expect, test } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { buildSequence } from '../src/utils/sequence/sequenceModel';
import { nestedCalls, recursiveCalls, difficultCalls } from './fixtures/connected';
import type { ArazzoDocument } from '../src/types/arazzo';
const modelFor = (document: ArazzoDocument) => buildViewerModel(inspect(createSnapshot(document)));

test('initial scene expands direct repeated calls with owning facts and distinct full paths', () => {
  const model = modelFor(nestedCalls);
  const before = structuredClone(model.document);
  const scene = buildSequence(model, 'checkout');
  expect(
    scene.rows.filter((r) => r.kind === 'operation').map((r) => [r.workflowId, r.step?.stepId]),
  ).toEqual([
    ['checkout', 'prepare'],
    ['payment', 'charge'],
    ['payment', 'charge'],
  ]);
  const calls = scene.rows.filter((r) => r.kind === 'call');
  expect(calls.map((r) => [r.workflowId, r.step?.stepId, r.expanded])).toEqual([
    ['checkout', 'firstPayment', true],
    ['payment', 'audit', false],
    ['checkout', 'secondPayment', true],
    ['payment', 'audit', false],
  ]);
  expect(calls[0].step?.parameters[0].value.value).toBe(0);
  expect(calls[2].step?.parameters[0].value.value).toBe('$inputs.amount');
  expect(calls[0].path).not.toEqual(calls[2].path);
  expect(new Set(scene.rows.map((r) => r.id)).size).toBe(scene.rows.length);
  expect(
    scene.rows
      .filter((r) => r.kind === 'continuation')
      .every((r) => r.label.includes('Structural')),
  ).toBe(true);
  expect(model.document).toEqual(before);
});

test('explicit expansion changes only the chosen nested occurrence and participant inventory follows visibility', () => {
  const model = modelFor(nestedCalls);
  const initial = buildSequence(model, 'checkout');
  const nested = initial.rows.filter((r) => r.kind === 'call' && r.step?.stepId === 'audit');
  const scene = buildSequence(model, 'checkout', { [nested[0].id]: true });
  expect(
    scene.rows.filter((r) => r.step?.stepId === 'record' && r.kind === 'operation'),
  ).toHaveLength(1);
  expect(scene.participants.filter((p) => p.kind === 'source').map((p) => p.name)).toEqual([
    'store.api',
    'store-api',
  ]);
  expect(scene.participants.some((p) => p.name === 'unused')).toBe(false);
  expect(new Set(scene.participants.map((p) => p.id)).size).toBe(scene.participants.length);
  const collapsed = buildSequence(model, 'checkout', {
    [initial.rows.find((r) => r.step?.stepId === 'firstPayment' && r.kind === 'call')!.id]: false,
  });
  expect(
    collapsed.rows.filter((r) => r.kind === 'operation' && r.step?.stepId === 'charge'),
  ).toHaveLength(1);
});

test('active-path recursion stops visibly while repeated calls remain independent', () => {
  const model = modelFor(recursiveCalls);
  const initial = buildSequence(model, 'checkout');
  const nested = initial.rows.find((r) => r.kind === 'call' && r.step?.stepId === 'again')!;
  const scene = buildSequence(model, 'checkout', { [nested.id]: true });
  expect(
    scene.rows.some(
      (r) => r.kind === 'marker' && r.reason === 'recursion' && r.target?.workflowId === 'checkout',
    ),
  ).toBe(true);
  expect(scene.rows.length).toBeLessThan(10);
});

test('conditional transfers, retry recovery, prerequisites and unavailable calls have separate meanings', () => {
  const scene = buildSequence(modelFor(difficultCalls), difficultCalls.workflows[0].workflowId);
  expect(
    scene.rows.filter((r) => r.kind === 'transfer').map((r) => [r.action?.value.type, r.returnTo]),
  ).toEqual([
    ['goto', undefined],
    ['retry', 'source-step'],
  ]);
  expect(scene.rows.filter((r) => r.kind === 'prerequisite')).toHaveLength(1);
  expect(scene.rows.filter((r) => r.kind === 'marker').map((r) => r.reason)).toEqual([
    'external-workflow',
    'missing',
  ]);
  expect(scene.rows.filter((r) => r.kind === 'call').every((r) => !r.expanded)).toBe(true);
  expect(scene.rows.filter((r) => r.kind === 'continuation')).toHaveLength(0);
});

test('root row limit reserves a contextual marker and ambiguous destinations are occurrence-scoped', () => {
  const doc = structuredClone(nestedCalls);
  doc.workflows = [
    {
      workflowId: 'root',
      steps: Array.from({ length: 250 }, (_, n) => ({
        stepId: `step${n}`,
        operationId: 'ambiguous',
      })),
    },
  ];
  const scene = buildSequence(modelFor(doc), 'root');
  expect(scene.rows).toHaveLength(200);
  expect(scene.rows.at(-1)).toMatchObject({ kind: 'marker', reason: 'rows', workflowId: 'root' });
  expect(scene.rows.some((r) => r.label.includes('workflow complete'))).toBe(false);
  expect(scene.participants.filter((p) => p.kind === 'unknown')).toHaveLength(199);
});

test('deep expansion has an eight-level boundary with navigation context', () => {
  const doc = structuredClone(nestedCalls);
  doc.workflows = Array.from({ length: 12 }, (_, i) => ({
    workflowId: `w${i}`,
    steps: [{ stepId: 'call', workflowId: `w${i + 1}` }],
  }));
  const model = modelFor(doc);
  const expansion: Record<string, boolean> = {};
  let scene = buildSequence(model, 'w0', expansion);
  for (let i = 0; i < 12; i += 1) {
    for (const row of scene.rows) if (row.kind === 'call') expansion[row.id] = true;
    scene = buildSequence(model, 'w0', expansion);
  }
  expect(scene.rows.find((r) => r.reason === 'depth')).toMatchObject({
    kind: 'marker',
    target: { workflowId: 'w9', navigable: true },
  });
  expect(scene.rows.filter((r) => r.kind === 'call')).toHaveLength(9);
});

test('unavailable or recursive calls retain their conditional transfer and recovery alternatives', () => {
  const document = structuredClone(recursiveCalls);
  document.workflows[0].steps = [
    {
      stepId: 'external',
      workflowId: '$sourceDescriptions.remote.payment',
      onFailure: [{ name: 'recover', type: 'retry', workflowId: 'payment' }],
    },
    {
      stepId: 'self',
      workflowId: 'checkout',
      onSuccess: [{ name: 'escape', type: 'goto', workflowId: 'payment' }],
    },
  ];
  const scene = buildSequence(modelFor(document), 'checkout');
  expect(scene.rows.filter((row) => row.kind === 'marker').map((row) => row.reason)).toEqual([
    'external-workflow',
    'recursion',
  ]);
  expect(
    scene.rows.filter((row) => row.kind === 'transfer').map((row) => row.action?.value.name),
  ).toEqual(['recover', 'escape']);
});

test('missing retry targets show their diagnostic without inventing a return arrow', () => {
  const doc = structuredClone(nestedCalls);
  doc.workflows[0].steps = [
    {
      stepId: 'work',
      operationId: 'opaque',
      onFailure: [{ name: 'recover', type: 'retry', workflowId: 'absent' }],
    },
  ];
  const row = buildSequence(modelFor(doc), 'checkout').rows.find((r) => r.kind === 'transfer')!;
  expect(row.target?.kind).toBe('missing');
  expect(row.returnTo).toBeUndefined();
});
