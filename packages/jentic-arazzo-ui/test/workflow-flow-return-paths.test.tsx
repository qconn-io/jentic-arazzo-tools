// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Position } from 'reactflow';

import { SequentialEdge } from '../src/edges/SequentialEdge';
import { convertWorkflowToFlow } from '../src/utils/conversion/arazzoToFlow';
import { applySequentialLayout } from '../src/utils/sequentialLayout';
import type { ArazzoDocument } from '../src/types/arazzo';

const doc: ArazzoDocument = {
  arazzo: '1.1.0',
  info: { title: 'returns', version: '1' },
  sourceDescriptions: [],
  workflows: [
    {
      workflowId: 'a',
      steps: [
        {
          stepId: 'retry',
          operationId: 'opaque',
          onFailure: [{ name: 'recovery', type: 'retry', workflowId: 'b' }],
          onSuccess: [{ name: 'jump', type: 'goto', workflowId: 'b' }],
        },
        { stepId: 'call', workflowId: 'b' },
        { stepId: 'last', operationId: 'last' },
      ],
    },
    { workflowId: 'b', steps: [] },
  ],
};
describe('actual return-edge paths', () => {
  it('renders distinct authored-order/call/return labels and one-way arrows from converter output', () => {
    const converted = convertWorkflowToFlow(doc.workflows[0], undefined, doc);
    const flow = applySequentialLayout(converted.nodes, converted.edges);
    const returns = flow.edges.filter(
      (edge) =>
        edge.label === 'Call return' ||
        edge.label === 'Retry return' ||
        edge.label === 'Call' ||
        edge.label === 'Authored order',
    );
    const { container } = render(
      <svg>
        {returns.map((edge) => {
          const source = flow.nodes.find((node) => node.id === edge.source)!;
          const target = flow.nodes.find((node) => node.id === edge.target)!;
          return (
            <SequentialEdge
              key={edge.id}
              id={edge.id}
              source={edge.source}
              target={edge.target}
              sourceX={source.position.x + 210}
              sourceY={source.position.y + source.height!}
              targetX={target.position.x + 210}
              targetY={target.position.y}
              sourcePosition={Position.Bottom}
              targetPosition={Position.Top}
              data={{ type: 'sequential' }}
              label={edge.label}
              markerEnd="url(#one-way-arrow)"
            />
          );
        })}
      </svg>,
    );
    expect(container.querySelectorAll('text').length).toBe(returns.length);
    expect(container.textContent).toContain('Call return');
    expect(container.textContent).toContain('Retry return');
    expect(container.textContent).toContain('Authored order');
    const paths = [...container.querySelectorAll('.react-flow__edge-path')];
    expect(paths.every((path) => path.getAttribute('marker-end') === 'url(#one-way-arrow)')).toBe(
      true,
    );
    expect(new Set(paths.map((path) => path.getAttribute('d'))).size).toBe(paths.length);
    expect(flow.edges.some((edge) => edge.label === 'Goto return')).toBe(false);
  });
});
