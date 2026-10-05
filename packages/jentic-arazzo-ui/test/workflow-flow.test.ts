import { describe, expect, it } from 'vitest';
import { convertWorkflowToFlow } from '../src/utils/conversion/arazzoToFlow';
import { applySequentialLayout } from '../src/utils/sequentialLayout';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import type { ArazzoDocument } from '../src/types/arazzo';

const document: ArazzoDocument = {
  arazzo: '1.1.0',
  info: { title: 'single workflow', version: '1' },
  sourceDescriptions: [{ name: 'events', type: 'asyncapi', url: 'events.yaml' }],
  workflows: [
    {
      workflowId: 'a',
      successActions: [{ name: 'inherit', type: 'goto', workflowId: 'b' }],
      steps: [
        {
          stepId: 'init',
          channelPath: '$sourceDescriptions.events.orders',
          action: 'receive',
          correlationId: '$inputs.id',
          timeout: 100,
          dependsOn: ['last', 'missing'],
          onSuccess: [{ name: 'jump', type: 'goto', workflowId: 'b' }],
          onFailure: [{ name: 'recover', type: 'retry', workflowId: 'b' }],
        },
        { stepId: 'call', workflowId: 'b' },
        { stepId: 'last', operationId: 'opaque-operation' },
      ],
    },
    { workflowId: 'b', steps: [{ stepId: 'init', operationId: 'other' }] },
  ],
};
const model = () => buildViewerModel(inspect(createSnapshot(document)));

describe('single workflow shared-model flow', () => {
  it('retains authored chain, channel-only structural support and calling ownership', () => {
    const shared = model();
    const flow = convertWorkflowToFlow(
      shared.document.workflows[0],
      undefined,
      shared.document,
      shared,
    );
    expect(
      flow.nodes
        .filter((node) => node.type === 'step' || node.type === 'workflowRef')
        .map((node) => ('step' in node.data ? node.data.step.stepId : '')),
    ).toEqual(['init', 'call', 'last']);
    const call = flow.nodes.find((node) => node.type === 'workflowRef')!;
    expect('workflowId' in call.data && call.data.workflowId).toBe('a');
    const first = flow.nodes.find((node) => node.type === 'step')!;
    expect('isValid' in first.data && first.data.isValid).toBe(true);
    expect(flow.edges.filter((edge) => edge.label === 'Authored order')).toHaveLength(4);
  });

  it('keeps goto one-way, retry returning to source and calls returning to next step', () => {
    const shared = model();
    const { nodes, edges } = convertWorkflowToFlow(
      shared.document.workflows[0],
      undefined,
      shared.document,
      shared,
    );
    const first = shared.nodeIds.get('a')!.get('init')!;
    const call = shared.nodeIds.get('a')!.get('call')!;
    const last = shared.nodeIds.get('a')!.get('last')!;
    const retry = edges.find((edge) => edge.type === 'retry' && edge.source === first)!;
    expect(
      edges.some(
        (edge) =>
          edge.source === retry.target && edge.target === first && edge.label === 'Retry return',
      ),
    ).toBe(true);
    expect(edges.some((edge) => edge.source === retry.target && edge.target === call)).toBe(false);
    const goto = edges.find((edge) => edge.type === 'success' && edge.source === first)!;
    expect(edges.some((edge) => edge.source === goto.target && edge.label === 'Goto return')).toBe(
      false,
    );
    const callEdge = edges.find((edge) => edge.source === call && edge.label === 'Call')!;
    expect(
      edges.some(
        (edge) =>
          edge.source === callEdge.target && edge.target === last && edge.label === 'Call return',
      ),
    ).toBe(true);
    expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
  });

  it('places prerequisites beside a bounded authored chain after the actual layout', () => {
    const shared = model();
    const converted = convertWorkflowToFlow(
      shared.document.workflows[0],
      undefined,
      shared.document,
      shared,
    );
    const flow = applySequentialLayout(converted.nodes, converted.edges);
    const main = flow.nodes.filter((node) => node.type !== 'externalWorkflow');
    for (let i = 1; i < main.length; i++)
      expect(main[i].position.y).toBeGreaterThanOrEqual(
        main[i - 1].position.y + main[i - 1].height!,
      );
    const prerequisite = flow.edges.find((edge) => edge.type === 'relationship')!;
    expect(prerequisite.sourceHandle).toBe('prerequisite-out');
    expect(prerequisite.targetHandle).toBe('prerequisite-in');
    expect((prerequisite.data as unknown as { sideRoute: boolean }).sideRoute).toBe(true);
    expect(
      flow.nodes
        .filter((node) => node.type === 'externalWorkflow')
        .every((node) => Math.abs(node.position.x) >= 480),
    ).toBe(true);
  });
  it('keeps every supplementary card disjoint for vertical and horizontal layouts', () => {
    const shared = model();
    const converted = convertWorkflowToFlow(
      shared.document.workflows[0],
      undefined,
      shared.document,
      shared,
    );
    for (const direction of ['DOWN', 'RIGHT', 'UP', 'LEFT'] as const) {
      const flow = applySequentialLayout(converted.nodes, converted.edges, { direction });
      for (let i = 0; i < flow.nodes.length; i++)
        for (let j = i + 1; j < flow.nodes.length; j++) {
          const a = flow.nodes[i],
            b = flow.nodes[j];
          expect(
            a.position.x + a.width! <= b.position.x ||
              b.position.x + b.width! <= a.position.x ||
              a.position.y + a.height! <= b.position.y ||
              b.position.y + b.height! <= a.position.y,
          ).toBe(true);
        }
    }
  });

  it('retains legacy supplied tracking IDs without requiring a document argument', () => {
    const flow = convertWorkflowToFlow({
      workflowId: 'legacy',
      _internalId: 'workflow-uuid',
      steps: [{ stepId: 'one', _internalId: 'step-uuid', operationId: 'opaque' }],
    });
    expect(flow.nodes.some((node) => node.id === 'workflow-uuid-step-uuid')).toBe(true);
  });
});
