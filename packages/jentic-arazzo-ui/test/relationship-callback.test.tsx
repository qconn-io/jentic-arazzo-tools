// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ArazzoDocument, ArazzoEdge, ArazzoUIProps } from '../src/ArazzoUI';
import { ArazzoViewerProvider } from '../src/context/ArazzoViewerContext';
import { convertDocumentToFlow } from '../src/utils/conversion/documentToFlow';
import { convertWorkflowToFlow } from '../src/utils/conversion/arazzoToFlow';
const document: ArazzoDocument = {
  arazzo: '1.1.0',
  info: { title: 'relationship callbacks', version: '1' },
  sourceDescriptions: [],
  workflows: [
    {
      workflowId: 'parent',
      steps: [
        {
          stepId: 'call',
          workflowId: 'child',
          dependsOn: ['init'],
          onFailure: [{ name: 'recover', type: 'retry', workflowId: 'child' }],
        },
        { stepId: 'init', operationId: 'prepare' },
      ],
    },
    { workflowId: 'child', steps: [] },
  ],
};

vi.mock('reactflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('reactflow')>();
  return {
    ...actual,
    useReactFlow: () => ({ fitView: vi.fn(), getZoom: () => 1, zoomTo: vi.fn() }),
    useNodesInitialized: () => false,
    Background: () => null,
    Controls: () => null,
    ReactFlow: ({
      edges,
      onEdgeClick,
    }: {
      edges: ArazzoEdge[];
      onEdgeClick: (event: React.MouseEvent, edge: ArazzoEdge) => void;
    }) => (
      <>
        {edges.map((edge) => (
          <button key={edge.id} onClick={(event) => onEdgeClick(event, edge)}>
            Select {edge.id}
          </button>
        ))}
      </>
    ),
  };
});
import { DiagramView } from '../src/components/DiagramView';

test.each(['overview', 'action', 'prerequisite'] as const)(
  'public %s callback describes the actual relationship without private model fields',
  (mode) => {
    const active = mode !== 'prerequisite' ? null : document.workflows[0];
    const flow = active
      ? convertWorkflowToFlow(active, undefined, document)
      : convertDocumentToFlow(document);
    const edge = flow.edges.find(
      (item) =>
        item.data?.type === 'relationship' &&
        item.data.kind ===
          (mode === 'action' ? 'action' : mode === 'overview' ? 'call' : 'prerequisite'),
    )!;
    const callback = vi.fn<NonNullable<ArazzoUIProps['onEdgeSelect']>>();
    render(
      <ArazzoViewerProvider
        value={{
          document,
          documentURL: null,
          activeWorkflowId: active?.workflowId ?? null,
          activeWorkflow: active,
          selectedNodeId: null,
          ...flow,
          setNodes: vi.fn(),
          setEdges: vi.fn(),
          setActiveWorkflow: vi.fn(),
          setSelectedNode: vi.fn(),
          readOnly: true,
          events: { onEdgeSelect: callback },
        }}
      >
        <DiagramView />
      </ArazzoViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: `Select ${edge.id}` }));
    expect(callback).toHaveBeenCalledTimes(1);
    const [id, selected] = callback.mock.calls[0];
    expect(id).toBe(edge.id);
    expect(selected.type).toBe('relationship');
    expect(selected.data).toMatchObject({
      type: 'relationship',
      kind: mode === 'action' ? 'action' : mode === 'overview' ? 'call' : 'prerequisite',
    });
    if (mode === 'action')
      expect(selected.data).toMatchObject({ channel: 'failure', actionType: 'retry' });
    expect(selected.data).not.toHaveProperty('relationship');
    expect(selected.data).not.toHaveProperty('provenance.target');
    expect(selected.data).not.toHaveProperty('lane');
    // Projection must not strip the private details used for the selected-edge panel.
    expect(edge.data).toHaveProperty('lane');
  },
);
