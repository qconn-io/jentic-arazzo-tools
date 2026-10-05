import type { ArazzoNode, ArazzoEdge } from '../types/viewer';
import type {
  InspectionReferenceNodeData,
  InspectionStepNodeData,
} from './conversion/arazzoToFlow';

export interface SequentialLayoutOptions {
  direction?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
  nodeSpacing?: number;
}

// estimates reserve expanded authored details and every inspected action/warning row.
export function estimateNodeHeight(node: ArazzoNode): number {
  if (node.type === 'externalWorkflow') return 150;
  if (node.type === 'start' || node.type === 'end') {
    const data = node.data as {
      description?: string;
      inputs?: { properties?: object };
      outputs?: object;
    };
    return (
      220 +
      Math.min(100, Object.keys(data.inputs?.properties || data.outputs || {}).length * 24) +
      Math.min(85, ((data.description?.length || 0) / 45) * 17)
    );
  }
  const data = node.data as InspectionStepNodeData;
  if (!data.step) return 180;
  const fact = data.inspectionStep;
  const step = data.step;
  let height = 280; // header, padding, support note, expanded authored details.
  if (step.description) height += 80;
  height +=
    ['operationId', 'operationPath', 'channelPath', 'workflowId'].filter(
      (key) => (step as unknown as Record<string, unknown>)[key] !== undefined,
    ).length * 22;
  if (fact?.sourceBinding.sourceName) height += 22;
  if (fact?.sourceBinding.intent !== undefined) height += 22;
  if (fact?.sourceBinding.timeout !== undefined) height += 22;
  if (fact?.sourceBinding.correlationId !== undefined) height += 22;
  if (fact?.callTarget) height += 30;
  height += (fact?.prerequisites.length || 0) * 36;
  const parameters = fact?.parameters.length || step.parameters?.length || 0;
  if (parameters) height += 32 + parameters * 22;
  if (step.outputs) height += 32 + Object.keys(step.outputs).length * 22;
  if (step.successCriteria?.length) height += 32;
  for (const channel of ['onSuccess', 'onFailure'] as const) {
    const count = fact?.effectiveActions[channel].length || step[channel]?.length || 0;
    if (count) height += 36 + count * 94;
    for (const action of fact?.effectiveActions[channel] || []) {
      height += 230; // provenance rows and expanded original action details.
      if (action.value.criteria?.length)
        height +=
          24 +
          Math.min(80, Math.ceil((JSON.stringify(action.value.criteria).length + 18) / 42) * 18);
      for (const parameter of action.parameters) {
        const text = `${parameter.value.name || parameter.authored.reference || 'Parameter'}: ${JSON.stringify(parameter.value.value)} (${parameter.status})`;
        height += 6 + Math.min(120, Math.ceil(text.length / 42) * 18);
        if (parameter.authored.reference) height += 22;
        if (parameter.status !== 'resolved')
          height +=
            8 + Math.min(120, Math.ceil(JSON.stringify(parameter.authored).length / 42) * 18);
      }
      for (const diagnostic of action.diagnostics)
        height += 12 + Math.ceil(diagnostic.message.length / 44) * 18;
    }
  }
  for (const diagnostic of fact?.diagnostics || [])
    height += 12 + Math.ceil(diagnostic.message.length / 48) * 18;
  return Math.ceil(height * 1.1);
}

/** preserve authored node order while reserving disjoint supplementary reference slots. */
export function applySequentialLayout(
  nodes: ArazzoNode[],
  edges: ArazzoEdge[],
  options?: SequentialLayoutOptions,
): { nodes: ArazzoNode[]; edges: ArazzoEdge[] } {
  const vertical = options?.direction !== 'RIGHT' && options?.direction !== 'LEFT';
  const sign = options?.direction === 'UP' || options?.direction === 'LEFT' ? -1 : 1;
  const gap = options?.nodeSpacing ?? 30;
  const positions = new Map<string, { x: number; y: number }>();
  let cursor = 0;
  const main = nodes
    .filter((node) => node.type !== 'externalWorkflow')
    .map((node) => {
      const height = estimateNodeHeight(node);
      const offset = sign < 0 ? cursor - (vertical ? height : 420) : cursor;
      const position = vertical ? { x: 0, y: offset } : { x: offset, y: 0 };
      cursor += sign * ((vertical ? height : 420) + gap);
      positions.set(node.id, position);
      return { ...node, position, width: 420, height };
    });
  const slots = new Map<string, number>();
  const horizontalSupplementY = Math.max(0, ...main.map((node) => node.height)) + 60;
  const supplementary = nodes
    .filter((node) => node.type === 'externalWorkflow')
    .map((node) => {
      const data = node.data as unknown as InspectionReferenceNodeData;
      const linked = edges.find((edge) => edge.source === node.id || edge.target === node.id);
      const owner =
        data.ownerNodeId || (linked?.source === node.id ? linked.target : linked?.source) || '';
      const position = positions.get(owner) || { x: 0, y: 0 };
      const slot = slots.get(owner) || 0;
      slots.set(owner, slot + 1);
      // each occurrence gets its own horizontal slot, including prerequisite sources.
      return {
        ...node,
        position: vertical
          ? { x: position.x + 480 + slot * 480, y: position.y }
          : { x: position.x, y: horizontalSupplementY + slot * 210 },
        width: 420,
        height: 150,
      };
    });
  return { nodes: [...main, ...supplementary], edges };
}
