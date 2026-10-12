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
const identity = (projection: ReviewProjection): WorkflowReviewIdentity => ({
  id: projection.snapshot.id,
  revision: projection.snapshot.revision,
  documents: projection.snapshot.documents
    .map((docDef) => ({
      documentId: docDef.id,
      revision: docDef.revision,
      uri: docDef.uri,
      digest:
        projection.documents.find((loadedDoc) => loadedDoc.definition.id === docDef.id)?.digest ??
        docDef.expectedDigest,
    }))
    .sort((a, b) => compareText(a.documentId, b.documentId)),
  coverage: structuredClone(projection.coverage),
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
    .map((diff) => {
      const endpoint = diff.before ?? diff.after!;
      return {
        id: JSON.stringify([
          endpoint.documentId,
          endpoint.workflowId ?? '',
          endpoint.stepId ?? '',
          diff.category,
          diff.before?.pointer ?? '',
          diff.after?.pointer ?? '',
        ]),
        category: diff.category,
        kind: (!diff.before?.present ? 'added' : !diff.after?.present ? 'removed' : 'changed') as
          'added' | 'removed' | 'changed',
        before: diff.before,
        after: diff.after,
        effects: diff.effects,
        baselineImpact: findingImpact(
          projections.baseline,
          diff.before,
          diff.effects.filter((effect) => effect.side === 'baseline'),
          limits,
        ),
        candidateImpact: findingImpact(
          projections.candidate,
          diff.after,
          diff.effects.filter((effect) => effect.side === 'candidate'),
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
  const safe = (text: string) => text.replace(/[`[\]<>]/g, (char) => `\\${char}`);
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
    result[side].documents.forEach((docDef) =>
      lines.push(
        `- ${safe(docDef.documentId)} / ${safe(docDef.revision)} / ${safe(docDef.uri)} / ${docDef.digest ?? 'digest unavailable'}`,
      ),
    );
    result[side].coverage.forEach((coverageEntry) =>
      lines.push(
        `- ${safe(coverageEntry.uri)}: ${coverageEntry.state}${coverageEntry.message ? ` — ${safe(coverageEntry.message)}` : ''}`,
      ),
    );
  }
  lines.push(
    '',
    `Traversal limits: ${result.limits.maxRelationships} relationships; ${result.limits.maxPaths} paths; depth ${result.limits.maxDepth}.`,
  );
  for (const finding of result.findings) {
    lines.push('', `## ${finding.category}: ${finding.kind}`, '');
    for (const [side, endpoint] of [
      ['before', finding.before],
      ['after', finding.after],
    ] as const) {
      lines.push(
        `${side}: ${endpoint ? `${safe(endpoint.documentId)} / ${safe(endpoint.revision)} / ${safe(endpoint.pointer)}` : 'document absent'}`,
        endpoint?.present
          ? `Value: ${safe(JSON.stringify(canonical(endpoint.value)))}`
          : 'Value absent',
      );
      if (endpoint?.location)
        lines.push(`Location: ${safe(JSON.stringify(canonical(endpoint.location)))}`);
    }
    for (const [side, impact] of [
      ['baseline', finding.baselineImpact],
      ['candidate', finding.candidateImpact],
    ] as const) {
      lines.push(
        `${side} potential exposure: ${impact.complete ? 'supplied scope indexed' : 'partial coverage'}; ${impact.truncated ? 'truncated' : 'within limits'}; ${impact.cycles.length} cycles.`,
      );
      impact.direct.forEach((relationship) =>
        lines.push(
          `- Direct ${relationship.kind}: ${safe(relationship.from.documentId)} / ${safe(relationship.from.revision)} / ${safe(relationship.from.workflowId)} / ${safe(relationship.pointer)}`,
        ),
      );
      impact.paths.forEach((entryPath) =>
        lines.push(
          `- Potential entry ${safe(entryPath.entry.workflowId)}: ${entryPath.relationships.map((relationship) => `${relationship.kind} (${safe(relationship.from.workflowId)})`).join(' → ')}`,
        ),
      );
    }
    finding.effects.forEach((effect) =>
      lines.push(
        `Applicable ${effect.side} use: ${safe(effect.declarationPointer)} / ${safe(JSON.stringify(canonical(effect.location)))} / ${safe(JSON.stringify(canonical(effect.value)))}`,
      ),
    );
  }
  // include the complete machine-readable payload so Markdown retains every scoped path and limit record.
  lines.push('', '## Full review data', '', '~~~~json', json, '~~~~', '');
  return lines.join('\n');
}
