import type { Workflow } from '../../types/arazzo';
import { createSnapshot, inspect } from '../inspection';
import { buildViewerModel } from '../model/viewerModel';
import type { ArazzoViewerModel } from '../model/viewerModel';
import type { ClassifiedTarget } from '../inspection';

// authored delimiters must not become Mermaid syntax; entities keep labels readable.
export function mermaidLabel(value: unknown): string {
  const entities: Record<string, string> = {
    '&': '#38;',
    '#': '#35;',
    '"': '#quot;',
    '<': '#60;',
    '>': '#62;',
    '|': '#124;',
    ';': '#59;',
  };
  return String(value ?? '')
    .replace(/[&#"<>|;]/g, (character) => entities[character])
    .replace(/[\r\n]+/g, ' ');
}

export function generateMermaidFlowchart(
  workflow: Workflow,
  suppliedModel?: ArazzoViewerModel,
): string {
  const model =
    suppliedModel ??
    buildViewerModel(
      inspect(
        createSnapshot({
          arazzo: '1.1.0',
          info: { title: workflow.workflowId, version: '' },
          sourceDescriptions: [],
          workflows: [workflow],
        }),
      ),
    );
  if (model.support.semanticInspection === 'unsupported') return '';
  const fact = model.workflowsById.get(workflow.workflowId);
  if (!fact) return '';
  const lines = ['flowchart TD', '    Start([Start])', '    End([End])'];
  lines.push(
    `    Inspection["${mermaidLabel(`${model.orderLabel}; schema validation and execution support not established; sources unverified`)}"]`,
  );
  model.support.limitations.forEach((limitation, index) => {
    lines.push(`    Limitation${index}["${mermaidLabel(limitation)}"]`);
  });
  const stepIds = new Map(fact.steps.map((step, index) => [step.stepId, `Step${index}`]));
  lines.push(`    Start --> ${fact.steps.length ? 'Step0' : 'End'}`);
  const targetNode = (target: ClassifiedTarget, id: string): string => {
    if (
      target.kind === 'local-step' &&
      target.workflowId === fact.workflowId &&
      target.stepId &&
      stepIds.has(target.stepId)
    )
      return stepIds.get(target.stepId)!;
    lines.push(`    ${id}["${mermaidLabel(`${target.kind}: ${target.reference}`)}"]`);
    return id;
  };
  fact.prerequisites.forEach((prerequisite, index) => {
    const target = prerequisite.target;
    const from = targetNode(target, `WorkflowPrerequisite${index}`);
    lines.push(`    ${from} -.->|prerequisite| Start`);
  });
  for (const [index, step] of fact.steps.entries()) {
    const id = `Step${index}`;
    const next = index + 1 < fact.steps.length ? `Step${index + 1}` : 'End';
    const binding = step.sourceBinding;
    const metadata = [
      binding.intent,
      binding.timeout !== undefined ? `timeout ${JSON.stringify(binding.timeout)}` : '',
      binding.correlationId !== undefined
        ? `correlation ${JSON.stringify(binding.correlationId)}`
        : '',
    ]
      .filter(Boolean)
      .join('; ');
    const locators = Object.values(binding.locators)
      .filter((value) => value !== undefined)
      .join('; ');
    lines.push(
      `    ${id}["${mermaidLabel(`${index + 1}. ${step.stepId}: ${locators || step.stepId}${metadata ? `; ${metadata}` : ''}`)}"]`,
    );
    // array order is the inspection spine, independently of prerequisite/action overlays.
    lines.push(`    ${id} --> ${next}`);
    if (
      step.callTarget &&
      (step.callTarget.navigable || step.callTarget.kind.startsWith('external-'))
    ) {
      const call = targetNode(step.callTarget, `Call${index}`);
      lines.push(`    ${id} -->|call| ${call}`);
      lines.push(`    ${call} -->|call return| ${next}`);
    }
    step.prerequisites.forEach((prerequisite, prerequisiteIndex) => {
      const target = prerequisite.target;
      const from = targetNode(target, `Prerequisite${index}_${prerequisiteIndex}`);
      lines.push(
        `    ${from} -.->|${mermaidLabel(target.kind.startsWith('local-') ? 'prerequisite' : `prerequisite ${target.kind}`)}| ${id}`,
      );
    });
    (['onSuccess', 'onFailure'] as const).forEach((channel, channelIndex) => {
      step.effectiveActions[channel].forEach((action, actionIndex) => {
        const value = action.value;
        if (action.status !== 'resolved') {
          lines.push(
            `    Details${index}_${channelIndex}_${actionIndex}["${mermaidLabel(`${action.status}: ${JSON.stringify(action.authored)}`)}"]`,
          );
          return;
        }
        const details = `${channel === 'onSuccess' ? 'success' : 'failure'} ${value.name ?? ''} ${value.type}; ${action.parameters.length} parameters${action.parameters.length ? ` ${JSON.stringify(action.parameters.map((parameter) => parameter.value))}` : ''}${value.criteria ? `; criteria ${JSON.stringify(value.criteria)}` : ''}`;
        if (value.type === 'end') {
          lines.push(`    ${id} -->|"${mermaidLabel(details)}"| End`);
          return;
        }
        if (
          !action.target ||
          (!action.target.navigable && !action.target.kind.startsWith('external-'))
        )
          return;
        const target = targetNode(action.target, `Action${index}_${channelIndex}_${actionIndex}`);
        lines.push(`    ${id} -->|"${mermaidLabel(details)}"| ${target}`);
        if (value.type === 'retry' && target !== id)
          lines.push(`    ${target} -->|retry source step| ${id}`);
      });
    });
  }
  return lines.join('\n');
}
