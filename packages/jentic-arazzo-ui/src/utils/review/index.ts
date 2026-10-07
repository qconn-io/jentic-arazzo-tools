import type {
  WorkflowReviewSnapshot,
  WorkflowReviewOptions,
  WorkflowReviewResult,
  WorkflowReviewIdentity,
} from '../../types/review';
import { prepareWorkflowReview, reviewLimits, type ReviewProjection } from './inputs';
import { authoredDifferences, canonical } from './differences';
import { findingImpact } from './impact';
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const identity = (p: ReviewProjection): WorkflowReviewIdentity => ({
  id: p.snapshot.id,
  revision: p.snapshot.revision,
  documents: p.snapshot.documents
    .map((d) => ({
      documentId: d.id,
      revision: d.revision,
      uri: d.uri,
      digest: p.documents.find((v) => v.definition.id === d.id)?.digest ?? d.expectedDigest,
    }))
    .sort((a, b) => compareText(a.documentId, b.documentId)),
  coverage: structuredClone(p.coverage),
});
/** Compare only supplied immutable contents; references never acquire mutable network bytes. @public */
export async function compareWorkflowRevisions(
  baseline: WorkflowReviewSnapshot,
  candidate: WorkflowReviewSnapshot,
  options: WorkflowReviewOptions = {},
): Promise<WorkflowReviewResult> {
  const captured = structuredClone(options);
  const projections = await prepareWorkflowReview(baseline, candidate, captured);
  return buildWorkflowReview(projections, captured);
}
export function buildWorkflowReview(
  projections: { baseline: ReviewProjection; candidate: ReviewProjection },
  captured: WorkflowReviewOptions = {},
): WorkflowReviewResult {
  const limits = reviewLimits(captured);
  const differences = authoredDifferences(projections.baseline, projections.candidate, captured);
  const findings = differences
    .map((d) => {
      const e = d.before ?? d.after!;
      return {
        id: JSON.stringify([
          e.documentId,
          e.workflowId ?? '',
          e.stepId ?? '',
          d.category,
          d.before?.pointer ?? '',
          d.after?.pointer ?? '',
        ]),
        category: d.category,
        kind: (!d.before?.present ? 'added' : !d.after?.present ? 'removed' : 'changed') as
          'added' | 'removed' | 'changed',
        before: d.before,
        after: d.after,
        effects: d.effects,
        baselineImpact: findingImpact(
          projections.baseline,
          d.before,
          d.effects.filter((x) => x.side === 'baseline'),
          limits,
        ),
        candidateImpact: findingImpact(
          projections.candidate,
          d.after,
          d.effects.filter((x) => x.side === 'candidate'),
          limits,
        ),
      };
    })
    .sort((a, b) => compareText(a.id, b.id));
  return {
    version: 1,
    baseline: identity(projections.baseline),
    candidate: identity(projections.candidate),
    findings,
    limits,
    runtimeEffect: 'undetermined',
  };
}
/** Deterministic portable authored review; host configuration and runtime verdicts are absent. @public */
export function exportWorkflowReview(
  result: WorkflowReviewResult,
  format: 'json' | 'markdown',
): string {
  const json = JSON.stringify(canonical(result), null, 2);
  if (format === 'json') return json + '\n';
  const safe = (text: string) => text.replace(/[`[\]<>]/g, (c) => `\\${c}`);
  const lines = [
    '# Workflow revision review',
    '',
    `Baseline: ${safe(result.baseline.id)} / ${safe(result.baseline.revision)}`,
    `Candidate: ${safe(result.candidate.id)} / ${safe(result.candidate.revision)}`,
    '',
    'Authored differences and potential usage exposure. Runtime effect: undetermined.',
  ];
  for (const side of ['baseline', 'candidate'] as const) {
    lines.push('', `## ${side} identities and coverage`);
    result[side].documents.forEach((d) =>
      lines.push(
        `- ${safe(d.documentId)} / ${safe(d.revision)} / ${safe(d.uri)} / ${d.digest ?? 'digest unavailable'}`,
      ),
    );
    result[side].coverage.forEach((c) =>
      lines.push(`- ${safe(c.uri)}: ${c.state}${c.message ? ` — ${safe(c.message)}` : ''}`),
    );
  }
  lines.push(
    '',
    `Traversal limits: ${result.limits.maxRelationships} relationships; ${result.limits.maxPaths} paths; depth ${result.limits.maxDepth}.`,
  );
  for (const f of result.findings) {
    lines.push('', `## ${f.category}: ${f.kind}`, '');
    for (const [side, e] of [
      ['before', f.before],
      ['after', f.after],
    ] as const) {
      lines.push(
        `${side}: ${e ? `${safe(e.documentId)} / ${safe(e.revision)} / ${safe(e.pointer)}` : 'document absent'}`,
        e?.present ? `Value: ${safe(JSON.stringify(canonical(e.value)))}` : 'Value absent',
      );
      if (e?.location) lines.push(`Location: ${safe(JSON.stringify(canonical(e.location)))}`);
    }
    for (const [side, impact] of [
      ['baseline', f.baselineImpact],
      ['candidate', f.candidateImpact],
    ] as const) {
      lines.push(
        `${side} potential exposure: ${impact.complete ? 'supplied scope indexed' : 'partial coverage'}; ${impact.truncated ? 'truncated' : 'within limits'}; ${impact.cycles.length} cycles.`,
      );
      impact.direct.forEach((r) =>
        lines.push(
          `- Direct ${r.kind}: ${safe(r.from.documentId)} / ${safe(r.from.revision)} / ${safe(r.from.workflowId)} / ${safe(r.pointer)}`,
        ),
      );
      impact.paths.forEach((p) =>
        lines.push(
          `- Potential entry ${safe(p.entry.workflowId)}: ${p.relationships.map((r) => `${r.kind} (${safe(r.from.workflowId)})`).join(' → ')}`,
        ),
      );
    }
    f.effects.forEach((e) =>
      lines.push(
        `Inherited ${e.side} use: ${safe(e.declarationPointer)} / ${safe(JSON.stringify(canonical(e.location)))} / ${safe(JSON.stringify(canonical(e.value)))}`,
      ),
    );
  }
  // Include the complete machine-readable payload so Markdown retains every scoped path and limit record.
  lines.push('', '## Full review data', '', '~~~~json', json, '~~~~', '');
  return lines.join('\n');
}
