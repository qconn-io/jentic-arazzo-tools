import { describe, expect, it } from 'vitest';
import { convertDocumentToFlow } from '../src/utils/conversion/documentToFlow';
import type { ArazzoDocument } from '../src/types/arazzo';
import type { RelationshipEdgeData } from '../src/edges/RelationshipEdge';

const document: ArazzoDocument = {
  arazzo: '1.1.0',
  info: { title: 'overview', version: '1' },
  sourceDescriptions: [{ name: 'remote', type: 'arazzo', url: 'https://example.test/remote' }],
  workflows: [
    {
      workflowId: 'a',
      dependsOn: ['b', 'missing', '$sourceDescriptions.remote.other'],
      steps: [
        {
          stepId: 'first',
          workflowId: 'b',
          parameters: [{ name: 'input', value: 0 }],
          onSuccess: [{ name: 'jump', type: 'goto', workflowId: 'b' }],
          onFailure: [
            { name: 'jump', type: 'goto', workflowId: 'b' },
            { name: 'again', type: 'retry', workflowId: 'a' },
          ],
        },
        { stepId: 'second', onSuccess: [{ name: 'jump', type: 'goto', workflowId: 'b' }] },
      ],
    },
    { workflowId: 'b', dependsOn: ['a'], steps: [] },
    { workflowId: 'unlinked', steps: [] },
  ],
};
const data = (edge: { data?: unknown }) => edge.data as RelationshipEdgeData;

describe('complete document relationship overview', () => {
  it('preserves prerequisites, calls, channels, parallel occurrences and self-loops', () => {
    const flow = convertDocumentToFlow(document);
    expect(flow.edges).toHaveLength(9);
    expect(new Set(flow.edges.map((edge) => edge.id)).size).toBe(9);
    const a = flow.nodes.find(
      (node) => node.data.type === 'workflow' && node.data.workflow.workflowId === 'a',
    )!;
    const b = flow.nodes.find(
      (node) => node.data.type === 'workflow' && node.data.workflow.workflowId === 'b',
    )!;
    const localPrerequisite = flow.edges.find(
      (edge) => edge.source === b.id && edge.target === a.id && data(edge).kind === 'prerequisite',
    )!;
    expect(data(localPrerequisite).warning).toBe('Prerequisite cycle');
    const actions = flow.edges.filter((edge) => data(edge).kind === 'action');
    expect(actions.map((edge) => data(edge).label).join(' ')).toContain('failure/goto');
    expect(actions.map((edge) => data(edge).label).join(' ')).toContain('success/goto');
    expect(actions.some((edge) => edge.source === edge.target && data(edge).selfLoop)).toBe(true);
    expect(data(flow.edges.find((edge) => data(edge).kind === 'call')!).label).toContain(
      '1 parameter',
    );
    const parallel = flow.edges.filter((edge) => edge.source === a.id && edge.target === b.id);
    expect(new Set(parallel.map((edge) => data(edge).lane)).size).toBe(parallel.length);
  });

  it('reserves disjoint supplementary cards and points prerequisites toward their owner', () => {
    const flow = convertDocumentToFlow(document);
    const supplementary = flow.nodes.filter((node) => 'referenceKind' in node.data);
    expect(supplementary).toHaveLength(2);
    for (const node of supplementary) {
      expect(
        flow.edges.some((edge) => edge.source === node.id && data(edge).kind === 'prerequisite'),
      ).toBe(true);
      for (const other of flow.nodes.filter((item) => item.id !== node.id)) {
        expect(
          node.position.x + 280 <= other.position.x ||
            other.position.x + 280 <= node.position.x ||
            node.position.y + 180 <= other.position.y ||
            other.position.y + 180 <= node.position.y,
        ).toBe(true);
      }
    }
  });

  it('does not produce a semantic overview for unknown profiles', () => {
    expect(convertDocumentToFlow({ ...document, arazzo: '2.0.0' })).toEqual({
      nodes: [],
      edges: [],
    });
  });
});
