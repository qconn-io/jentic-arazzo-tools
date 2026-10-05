// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Position, ReactFlowProvider } from 'reactflow';

import { ArazzoViewerProvider, useArazzoViewer } from '../src/context/ArazzoViewerContext';
import { InspectionStepCard } from '../src/nodes/StepNode';
import type { InspectedStepData } from '../src/nodes/StepNode';
import { RelationshipEdge, relationshipPath } from '../src/edges/RelationshipEdge';
import type { RelationshipEdgeData } from '../src/edges/RelationshipEdge';
import type { ArazzoDocument } from '../src/types/arazzo';

const doc: ArazzoDocument = {
  arazzo: '1.1.0',
  info: { title: 'async', version: '1' },
  sourceDescriptions: [{ name: 'events', type: 'asyncapi', url: 'events.yaml' }],
  workflows: [
    {
      workflowId: 'a',
      successActions: [{ name: 'default', type: 'end' }],
      steps: [
        {
          stepId: 'receive',
          channelPath: '$sourceDescriptions.events.orders',
          action: 'receive',
          timeout: 123,
          correlationId: '$message.header.id',
          dependsOn: ['last', 'absent'],
          parameters: [{ name: 'wholeQuery', in: 'querystring', value: false }],
          onSuccess: [{ name: 'stepFirst', type: 'end' }],
        },
        { stepId: 'last', operationId: 'opaque' },
      ],
    },
  ],
};
function Cards() {
  const context = useArazzoViewer();
  const node = context.nodes.find((candidate) => candidate.type === 'step')!;
  const edge = context.edges.find((candidate) => candidate.type === 'relationship')!;
  const source = context.nodes.find((candidate) => candidate.id === edge.source)!;
  const target = context.nodes.find((candidate) => candidate.id === edge.target)!;
  return (
    <>
      <InspectionStepCard id={node.id} data={node.data as InspectedStepData} />
      <svg>
        <RelationshipEdge
          id={edge.id}
          source={edge.source}
          target={edge.target}
          sourceX={source.position.x}
          sourceY={source.position.y + 28}
          targetX={target.position.x}
          targetY={target.position.y + 48}
          sourcePosition={Position.Left}
          targetPosition={Position.Left}
          data={edge.data as unknown as RelationshipEdgeData}
        />
      </svg>
    </>
  );
}
describe('shared-model cards and prerequisite paths', () => {
  it('shows authored async metadata and the same effective inspection order', () => {
    render(
      <ReactFlowProvider>
        <ArazzoViewerProvider document={doc}>
          <Cards />
        </ArazzoViewerProvider>
      </ReactFlowProvider>,
    );
    expect(screen.getByText('Authored intent: receive')).toBeTruthy();
    expect(screen.getByText('Timeout: 123 ms')).toBeTruthy();
    expect(screen.getByText('Correlation: $message.header.id')).toBeTruthy();
    expect(screen.getByText('wholeQuery (querystring): false')).toBeTruthy();
    const step = screen.getByText('stepFirst');
    const inherited = screen.getByText('default');
    expect(step.compareDocumentPosition(inherited) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Prerequisite: absent (missing)' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('uses scoped prerequisite navigation and renders the real left side route', () => {
    const select = vi.fn();
    const { container } = render(
      <ReactFlowProvider>
        <ArazzoViewerProvider document={doc} events={{ onNodeSelect: select }}>
          <Cards />
        </ArazzoViewerProvider>
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Prerequisite: last (local-step)' }));
    expect(select.mock.calls[0][1].data.step.stepId).toBe('last');
    const path = container.querySelector('path.react-flow__edge-path')!;
    expect(path.getAttribute('d')).toContain('L -60');
    const route = relationshipPath(0, 500, 0, 100, 0, false, true);
    expect(route.path).toBe('M 0 500 L -60 500 L -60 100 L 0 100');
  });
});

it('renders inherited reusable action values, unresolved occurrences, criteria and using-step warnings', () => {
  const inherited: ArazzoDocument = {
    arazzo: '1.1.0',
    info: { title: 'inherited', version: '1' },
    sourceDescriptions: [],
    components: {
      parameters: { token: { name: 'effective-token', value: 'original' } },
      failureActions: {
        recovery: {
          name: 'recover',
          type: 'retry',
          workflowId: 'b',
          criteria: [{ condition: '$statusCode == 401' }],
          parameters: [
            { reference: '$components.parameters.token', value: 0 },
            { reference: '$components.parameters.missing', value: false },
            { name: 'empty', value: '' },
            { name: 'nullable', value: null },
            { name: 'array', value: [0, false] },
            { name: 'object', value: { enabled: false } },
          ],
        },
      },
    },
    workflows: [
      {
        workflowId: 'a',
        failureActions: [{ reference: '$components.failureActions.recovery' }],
        steps: [
          { stepId: 'receive', operationId: 'opaque', dependsOn: ['last'] },
          { stepId: 'last', operationId: 'opaque' },
        ],
      },
      { workflowId: 'b', steps: [] },
    ],
  };
  const { container } = render(
    <ReactFlowProvider>
      <ArazzoViewerProvider document={inherited}>
        <Cards />
      </ArazzoViewerProvider>
    </ReactFlowProvider>,
  );
  expect(screen.getByText('effective-token: 0')).toBeTruthy();
  expect(screen.getByText('$components.parameters.missing: false (unresolved)')).toBeTruthy();
  expect(screen.getByText('empty: ""')).toBeTruthy();
  expect(screen.getByText('nullable: null')).toBeTruthy();
  expect(screen.getByText('array: [0,false]')).toBeTruthy();
  expect(screen.getByText('object: {"enabled":false}')).toBeTruthy();
  expect(container.textContent).toContain('$statusCode == 401');
  expect(container.textContent).toContain('Declaration: /components/failureActions/recovery');
  expect(container.textContent).toContain('Use: /workflows/0/failureActions/0');
  expect(container.textContent).toContain(
    'reusable component $components.parameters.missing is unavailable',
  );
});
