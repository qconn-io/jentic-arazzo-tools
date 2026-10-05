import type { Workflow, ArazzoDocument } from '../../types/arazzo';
import { createSnapshot, inspect } from '../inspection';
import { buildViewerModel } from '../model/viewerModel';
import type { ArazzoViewerModel } from '../model/viewerModel';
import { mermaidLabel } from './mermaidFlowchartGenerator';

export function generateMermaidSequence(
  workflow: Workflow,
  document: ArazzoDocument,
  suppliedModel?: ArazzoViewerModel,
): string {
  const model = suppliedModel ?? buildViewerModel(inspect(createSnapshot(document)));
  if (model.support.semanticInspection === 'unsupported') return '';
  const fact = model.workflowsById.get(workflow.workflowId);
  if (!fact) return '';
  const lines = [
    'sequenceDiagram',
    '    participant Client as Workflow inspector',
    '    participant Unverified as Unverified source',
  ];
  const participants = new Map<string, string>();
  model.inspection.raw.sourceDescriptions.forEach((source, index) => {
    const id = `Source${index}`;
    participants.set(source.name, id);
    lines.push(
      `    participant ${id} as ${mermaidLabel(`${source.name} (${source.type ?? 'unknown'}, unverified)`)}`,
    );
  });
  lines.push('    Note over Client: Schematic authored interactions — no evaluated outcomes');
  lines.push(
    '    Note over Client: Schema validation and execution support not established — sources unverified',
  );
  for (const limitation of model.support.limitations)
    lines.push(`    Note over Client: ${mermaidLabel(limitation)}`);
  for (const prerequisite of fact.prerequisites) {
    lines.push(
      `    Note over Client: ${mermaidLabel(`workflow prerequisite ${prerequisite.target.kind}: ${prerequisite.target.reference}`)}`,
    );
  }
  for (const [index, step] of fact.steps.entries()) {
    const binding = step.sourceBinding;
    const target =
      binding.status !== 'ambiguous' && binding.status !== 'unsupported' && binding.sourceName
        ? (participants.get(binding.sourceName) ?? 'Unverified')
        : 'Unverified';
    const locators = Object.entries(binding.locators)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
    const label = mermaidLabel(
      `${index + 1}. ${step.stepId}; ${binding.intent ?? 'authored operation'}; ${locators}`,
    );
    if (step.callTarget)
      lines.push(
        `    Note over Client: ${mermaidLabel(`Call ${step.callTarget.kind}: ${step.callTarget.reference}`)}`,
      );
    else if (binding.status === 'ambiguous' || binding.status === 'unsupported')
      lines.push(`    Note over Client,Unverified: ${label}`);
    else if (binding.intent === 'receive') lines.push(`    ${target}->>Client: ${label}`);
    else lines.push(`    Client->>${target}: ${label}`);
    if (binding.timeout !== undefined)
      lines.push(
        `    Note over Client: ${mermaidLabel(`timeout: ${JSON.stringify(binding.timeout)}`)}`,
      );
    if (binding.correlationId !== undefined)
      lines.push(
        `    Note over Client: ${mermaidLabel(`correlation: ${JSON.stringify(binding.correlationId)}`)}`,
      );
    for (const prerequisite of step.prerequisites)
      lines.push(
        `    Note over Client: ${mermaidLabel(`prerequisite ${prerequisite.target.kind}: ${prerequisite.target.reference}`)}`,
      );
    for (const parameter of step.parameters)
      lines.push(
        `    Note over Client: ${mermaidLabel(`parameter ${JSON.stringify(parameter.value)}`)}`,
      );
    if (step.value.successCriteria)
      lines.push(
        `    Note over Client: ${mermaidLabel(`Authored criteria (not evaluated): ${JSON.stringify(step.value.successCriteria)}`)}`,
      );
    (['onSuccess', 'onFailure'] as const).forEach((channel) => {
      for (const action of step.effectiveActions[channel])
        lines.push(
          `    Note over Client: ${mermaidLabel(`${model.orderLabel}; ${channel}; ${action.origin}; ${action.status}; ${JSON.stringify(action.value)}`)}`,
        );
    });
    for (const diagnostic of step.diagnostics)
      lines.push(
        `    Note over Client: ${mermaidLabel(`${diagnostic.phase}: ${diagnostic.message}`)}`,
      );
  }
  return lines.join('\n');
}
