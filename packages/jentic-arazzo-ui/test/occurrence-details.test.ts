import { expect, test } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { buildSequence } from '../src/utils/sequence/sequenceModel';
import { projectOccurrenceDetails } from '../src/utils/sequence/occurrenceDetails';
import { nestedCalls } from './fixtures/connected';

test('repeated call details distinguish mappings, retain declarations and unevaluated expressions', () => {
  const model = buildViewerModel(inspect(createSnapshot(nestedCalls)));
  const calls = buildSequence(model, 'checkout').rows.filter(
    (r) => r.kind === 'call' && r.workflowId === 'checkout',
  );
  const first = projectOccurrenceDetails(model, 'checkout', 'firstPayment', calls[0])!;
  const second = projectOccurrenceDetails(model, 'checkout', 'secondPayment', calls[1])!;
  const values = (details: typeof first, title: string) =>
    details.sections.find((s) => s.title === title)?.value;
  expect(values(first, 'Caller-supplied parameters')).toMatchObject([
    { name: 'amount', value: 0 },
    { name: 'context', value: { enabled: false, tags: [] } },
  ]);
  expect(values(second, 'Caller-supplied parameters')).toMatchObject([
    { name: 'amount', value: '$inputs.amount' },
    { name: 'context', value: null },
  ]);
  expect(values(first, 'Declared callee inputs')).toEqual({
    type: 'object',
    properties: { amount: { type: 'number' }, context: {} },
  });
  expect(values(first, 'Caller-side output expressions')).toEqual({
    receipt: '$workflows.payment.outputs.receipt',
  });
  expect(values(first, 'Context')).not.toEqual(values(second, 'Context'));
  expect(
    projectOccurrenceDetails(model, 'payment', 'charge')?.sections.find(
      (s) => s.title === 'Parameters',
    )?.value,
  ).toContain('Unavailable');
  expect(
    projectOccurrenceDetails(model, 'client', 'submit')?.sections.find(
      (s) => s.title === 'Descriptive associations',
    )?.value,
  ).toContain('No standard workflow-call relationship');
});
