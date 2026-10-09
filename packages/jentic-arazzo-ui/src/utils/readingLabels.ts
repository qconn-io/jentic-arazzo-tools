import type { SequenceRow } from './sequence/sequenceModel';

// presentation only: authored identity and model keys remain unchanged.
export function workflowReadingLabel(workflow: {
  workflowId: string;
  authored: Record<string, unknown>;
}): string {
  const summary = workflow.authored.summary;
  return typeof summary === 'string' && summary.trim()
    ? `${summary.trim()} · ${workflow.workflowId}`
    : workflow.workflowId;
}

export function interactionReadingLabel(row: SequenceRow): string {
  if (row.kind !== 'operation' || !row.step) return row.label;
  const step = row.step;
  const binding = step.sourceBinding;
  const locator =
    binding.locators.operationId ?? binding.locators.operationPath ?? binding.locators.channelPath;
  const exact = typeof locator === 'string' ? locator : '';
  const prefix = binding.sourceName ? `$sourceDescriptions.${binding.sourceName}.` : '';
  const operation = prefix && exact.startsWith(prefix) ? exact.slice(prefix.length) : exact;
  return [
    step.stepId,
    operation && operation !== step.stepId ? operation : '',
    binding.intent ?? 'Operation',
    binding.status === 'ambiguous' ? 'ambiguous destination' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function interactionReadingTitle(row: SequenceRow): string {
  return [
    interactionReadingLabel(row),
    ...Object.values(row.step?.sourceBinding.locators ?? {}),
  ].join(' · ');
}
