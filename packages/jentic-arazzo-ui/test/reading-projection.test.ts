import { expect, test } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { projectOccurrenceDetails } from '../src/utils/sequence/occurrenceDetails';
import { nestedCalls } from './fixtures/connected';

const project = (document: object, workflow: string, step: string) =>
  projectOccurrenceDetails(buildViewerModel(inspect(createSnapshot(document))), workflow, step)!;

test('reading projection distinguishes caller values, callee declarations and authored absence', () => {
  const details = project(nestedCalls, 'checkout', 'firstPayment');
  expect(details.reading.context).toMatchObject({
    owningWorkflow: 'checkout',
    step: 'firstPayment',
    callPath: [],
  });
  const parameters = details.reading.sections.find((s) => s.title === 'Caller-supplied parameters');
  expect(parameters).toMatchObject({
    kind: 'values',
    rows: [
      { label: 'amount', present: true, value: 0 },
      { label: 'context', present: true, value: { enabled: false, tags: [] } },
    ],
  });
  expect(details.reading.sections.find((s) => s.title === 'Declared callee inputs')).toMatchObject({
    kind: 'tree',
    present: true,
  });
  const doc = structuredClone(nestedCalls);
  Object.assign(doc.workflows[1].steps[0], {
    requestBody: { payload: { zero: 0, disabled: false, nothing: null, empty: '' } },
    outputs: { zero: 0, disabled: false, nothing: null, empty: '' },
  });
  const falsy = project(doc, 'payment', 'charge');
  expect(
    falsy.reading.sections.find((s) => s.title === 'Request body / message payload'),
  ).toMatchObject({
    present: true,
    value: { payload: { zero: 0, disabled: false, nothing: null, empty: '' } },
  });
  expect(falsy.reading.sections.find((s) => s.title === 'Outputs')).toMatchObject({
    rows: [
      { label: 'zero', present: true, value: 0 },
      { label: 'disabled', present: true, value: false },
      { label: 'nothing', present: true, value: null },
      { label: 'empty', present: true, value: '' },
    ],
  });
  expect(
    project(nestedCalls, 'payment', 'charge').reading.sections.find(
      (s) => s.kind === 'tree' && s.title === 'Request body / message payload',
    ),
  ).toMatchObject({ present: false });
});

test('recovery projection preserves effective order, inheritance, override, unresolved and retry meaning', () => {
  const doc = structuredClone(nestedCalls);
  Object.assign(doc.workflows[1], {
    failureActions: [
      { name: 'recover', type: 'retry', workflowId: 'audit', retryLimit: 3, retryAfter: 0.5 },
      { name: 'abort', type: 'end' },
      { reference: '$components.failureActions.absent' },
    ],
  });
  Object.assign(doc.workflows[1].steps[0], {
    onFailure: [
      {
        name: 'recover',
        type: 'retry',
        workflowId: 'audit',
        retryLimit: 0,
        retryAfter: 0,
        criteria: [{ condition: '$statusCode == 503' }],
      },
    ],
  });
  const recovery = project(doc, 'payment', 'charge').reading.sections.find(
    (s) => s.kind === 'recovery',
  );
  expect(recovery).toMatchObject({
    kind: 'recovery',
    cards: [
      {
        origin: 'step',
        isOverride: true,
        index: 0,
        retryLimit: { present: true, value: 0 },
        retryAfter: { present: true, value: 0 },
        semantics: 'Recovery before retrying payment.charge',
        target: { kind: 'local-workflow', workflowId: 'audit' },
      },
      { origin: 'workflow', isOverride: false, index: 1, semantics: 'End' },
      {
        status: 'unresolved',
        index: 2,
        semantics: 'Unresolved action; inspect authored declaration',
      },
    ],
  });
  expect(
    project(doc, 'payment', 'charge').sections.find((s) => s.title === 'Authored content')?.value,
  ).toEqual(doc.workflows[1].steps[0]);
});

test('empty authored output and parameter containers differ from absent declarations', () => {
  const doc = structuredClone(nestedCalls);
  const absent = project(doc, 'payment', 'charge').reading.sections;
  expect(absent.find((s) => s.title === 'Outputs')).toMatchObject({ present: true });
  delete doc.workflows[1].steps[0].outputs;
  expect(
    project(doc, 'payment', 'charge').reading.sections.find((s) => s.title === 'Outputs'),
  ).toMatchObject({ present: false });
  Object.assign(doc.workflows[1].steps[0], { outputs: {}, parameters: [] });
  const empty = project(doc, 'payment', 'charge').reading.sections;
  expect(empty.find((s) => s.title === 'Outputs')).toMatchObject({
    present: true,
    value: {},
    rows: [],
  });
  expect(empty.find((s) => s.title === 'Parameters')).toMatchObject({
    present: true,
    value: [],
    rows: [],
  });
});
