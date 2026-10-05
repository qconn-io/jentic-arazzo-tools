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
import { SelectionDetails } from '../src/components/SelectionDetails';

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
      <SelectionDetails />
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
    const step = screen.getByText('stepFirst');
    const inherited = screen.getByText('default');
    expect(step.compareDocumentPosition(inherited) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Prerequisite: absent (missing)' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.queryByText('Timeout: 123 ms')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Details for a.receive' }));
    const details = screen.getByRole('region', { name: 'Selection details' });
    expect(details.textContent).toContain('"timeout": 123');
    expect(details.textContent).toContain('$message.header.id');
    expect(details.textContent).toContain('querystring');
    expect(details.textContent).toContain('"value": false');
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
  expect(container.textContent).not.toContain('$statusCode == 401');
  fireEvent.click(screen.getByRole('button', { name: 'Details for a.receive' }));
  const details = screen.getByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('effective-token');
  expect(details.textContent).toContain('"value": 0');
  expect(details.textContent).toContain('"value": false');
  expect(details.textContent).toContain('"value": ""');
  expect(details.textContent).toContain('"value": null');
  expect(details.textContent).toContain('"enabled": false');
  expect(details.textContent).toContain('$statusCode == 401');
  expect(details.textContent).toContain('"declarationPath"');
  expect(details.textContent).toContain('recovery');
  expect(container.textContent).toContain(
    'reusable component $components.parameters.missing is unavailable',
  );
});

it('opens graph calls even when they fall beyond the sequence display budget', () => {
  const large: ArazzoDocument = {
    arazzo: '1.0.0',
    info: { title: 'large', version: '1' },
    sourceDescriptions: [],
    workflows: [
      {
        workflowId: 'root',
        steps: [
          ...Array.from({ length: 199 }, (_, i) => ({ stepId: `step${i}`, operationId: 'opaque' })),
          { stepId: 'lateCall', workflowId: 'callee' },
        ],
      },
      { workflowId: 'callee', steps: [{ stepId: 'work', operationId: 'opaque' }] },
    ],
  };
  function LateCard() {
    const viewer = useArazzoViewer();
    const node = viewer.nodes.find((n) => n.data.type === 'workflowRef')!;
    return node ? <InspectionStepCard id={node.id} data={node.data as InspectedStepData} /> : null;
  }
  const onWorkflowSelect = vi.fn();
  render(
    <ReactFlowProvider>
      <ArazzoViewerProvider document={large} events={{ onWorkflowSelect }}>
        <LateCard />
      </ArazzoViewerProvider>
    </ReactFlowProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Call callee (local-workflow)' }));
  expect(onWorkflowSelect).toHaveBeenCalledWith('callee');
});
