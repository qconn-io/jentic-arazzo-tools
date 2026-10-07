import { expect, it } from 'vitest';
import { prepareWorkflowReview } from '../src/utils/review/inputs';
import type { WorkflowReviewSnapshot } from '../src/types/review';
const content = {
  arazzo: '1.0.1',
  info: { title: 'Shop', version: '1' },
  sourceDescriptions: [{ name: 'pay', type: 'openapi', url: './pay.json' }],
  workflows: [{ workflowId: 'buy', steps: [{ stepId: 'capture', operationId: 'capture' }] }],
};
export const snapshot = (revision: string): WorkflowReviewSnapshot => ({
  version: 1,
  id: 'shop',
  revision,
  documents: [{ id: 'flow', revision, uri: 'https://example.test/flow.json', content }],
});
it('rejects absent, equal and incompatible revision identities before showing findings', async () => {
  await expect(prepareWorkflowReview(snapshot(''), snapshot('2'))).rejects.toThrow(/revision/);
  await expect(prepareWorkflowReview(snapshot('1'), snapshot('1'))).rejects.toThrow(/distinct/);
  await expect(
    prepareWorkflowReview(snapshot('1'), { ...snapshot('2'), id: 'other' }),
  ).rejects.toThrow(/identity/);
});
it('rejects duplicate workflow and step identities and colliding explicit matches', async () => {
  const a = snapshot('1'),
    b = snapshot('2');
  b.documents[0].content = { ...content, workflows: [content.workflows[0], content.workflows[0]] };
  await expect(prepareWorkflowReview(a, b)).rejects.toThrow(/duplicate.*workflow/i);
  b.documents[0].content = {
    ...content,
    workflows: [{ workflowId: 'buy', steps: [{ stepId: 'same' }, { stepId: 'same' }] }],
  };
  await expect(prepareWorkflowReview(a, b)).rejects.toThrow(/duplicate.*step/i);
  await expect(
    prepareWorkflowReview(a, snapshot('2'), {
      matches: [
        {
          before: { documentId: 'flow', workflowId: 'buy' },
          after: { documentId: 'flow', workflowId: 'buy' },
        },
        {
          before: { documentId: 'flow', workflowId: 'buy' },
          after: { documentId: 'flow', workflowId: 'buy' },
        },
      ],
    }),
  ).rejects.toThrow(/match/);
});
it('retains raw unsupported profiles and refuses current mutable sources', async () => {
  const b = snapshot('2');
  b.documents[0].content = { ...content, arazzo: '9.0.0' };
  const review = await prepareWorkflowReview(snapshot('1'), b);
  expect(review.baseline.documents[0].raw.workflows).toHaveLength(1);
  expect(review.candidate.documents[0].raw.arazzo).toBe('9.0.0');
  expect(review.candidate.index.entries).toHaveLength(0);
  expect(review.baseline.coverage.some((c) => c.state === 'failed')).toBe(true);
  expect(review.baseline.documents[0].digest).toMatch(/^sha256:/);
  expect(review.baseline.index.apiUsages[0].status).not.toBe('located');
});
it('freezes supplied bytes before asynchronous projection and verifies digests', async () => {
  const a = snapshot('1'),
    b = snapshot('2');
  a.documents[0].content = structuredClone(content);
  const promise = prepareWorkflowReview(a, b);
  (a.documents[0].content as typeof content).info.title = 'MUTATED';
  const review = await promise;
  expect((review.baseline.documents[0].raw.info as { title: string }).title).toBe('Shop');
  await expect(
    prepareWorkflowReview(
      {
        ...snapshot('1'),
        documents: [{ ...snapshot('1').documents[0], expectedDigest: `sha256:${'0'.repeat(64)}` }],
      },
      b,
    ),
  ).rejects.toThrow(/digest/);
});
it('normalizes supplied absolute source identities and diagnoses an unusable URI', async () => {
  const a = snapshot('1'),
    b = snapshot('2');
  for (const s of [a, b]) s.documents[0].uri = 'https://EXAMPLE.test:443/flow.json';
  const r = await prepareWorkflowReview(a, b);
  expect(r.baseline.documents[0].definition.uri).toBe('https://example.test/flow.json');
  a.documents[0].uri = './unidentified.json';
  await expect(prepareWorkflowReview(a, b)).rejects.toThrow(/URI/);
});
