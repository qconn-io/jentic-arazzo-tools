import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { compareWorkflowRevisions } from '../src/utils/review';
import type { WorkflowReviewSnapshot } from '../src/types/review';
const pair = (
  name: string,
): { baseline: WorkflowReviewSnapshot; candidate: WorkflowReviewSnapshot } =>
  JSON.parse(
    readFileSync(
      new URL(`../public/examples/revision-review/${name}.json`, import.meta.url),
      'utf8',
    ),
  );
it('compares purchase recovery, capture evidence, removed compensation and cycle provenance', async () => {
  const p = pair('purchase');
  const r = await compareWorkflowRevisions(p.baseline, p.candidate);
  expect(new Set(r.findings.map((f) => f.category))).toEqual(
    new Set(['actions', 'criteria', 'mappings', 'structure', 'contracts']),
  );
  expect(
    r.findings.some((f) => f.kind === 'removed' && f.before?.stepId === 'revoke-license'),
  ).toBe(true);
  expect(r.findings.some((f) => f.before?.value === 'retry' && f.after?.value === 'goto')).toBe(
    true,
  );
  expect(r.findings.some((f) => f.baselineImpact.cycles.length > 0)).toBe(true);
  expect(
    r.findings.find((f) => f.category === 'contracts')?.baselineImpact.direct[0].location.selection
      ?.stepId,
  ).toBe('capture');
});
it('projects event declaration users and retains partial and formatting-only reviews', async () => {
  const p = pair('event');
  const r = await compareWorkflowRevisions(p.baseline, p.candidate);
  expect(
    r.findings.find((f) => f.category === 'contracts')?.candidateImpact.direct[0].location.selection
      ?.stepId,
  ).toBe('capture-evidence');
  const partial = pair('partial-purchase');
  expect(
    (await compareWorkflowRevisions(partial.baseline, partial.candidate)).baseline.coverage.some(
      (c) => c.state !== 'loaded',
    ),
  ).toBe(true);
  const formatted = pair('formatting');
  expect(
    (await compareWorkflowRevisions(formatted.baseline, formatted.candidate)).findings,
  ).toHaveLength(0);
});
