// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Position, ReactFlowProvider } from 'reactflow';
import { RelationshipEdge, relationshipPath } from '../src/edges/RelationshipEdge';
import { WorkflowNode } from '../src/nodes/WorkflowNode';

describe('relationship edge routing', () => {
  it('routes parallel edges in separate lanes', () => {
    const first = relationshipPath(140, 180, 520, 280, 0, false);
    const second = relationshipPath(140, 180, 520, 280, 1, false);
    expect(first.path).not.toBe(second.path);
  });
  it('routes self-loops outside card bounds', () => {
    const loop = relationshipPath(140, 180, 140, 0, 0, true);
    expect(loop.path).toContain('L 330');
    expect(loop.labelX).toBeGreaterThan(280);
  });
  it('separates label anchors on reciprocal and parallel self-loop lanes', () => {
    for (const selfLoop of [false, true]) {
      const first = relationshipPath(140, 480, 520, 280, 0, selfLoop);
      const second = relationshipPath(140, 480, 520, 280, 1, selfLoop);
      expect(Math.abs(first.labelY - second.labelY)).toBeGreaterThanOrEqual(18);
    }
  });
  it('renders the actual path, marker and a textual cycle warning', () => {
    const { container } = render(
      <svg>
        <RelationshipEdge
          id="cycle"
          source="a"
          target="a"
          sourceX={140}
          sourceY={180}
          targetX={140}
          targetY={0}
          sourcePosition={Position.Bottom}
          targetPosition={Position.Top}
          markerEnd="url(#arrow)"
          data={{
            type: 'relationship',
            label: 'Prerequisite a',
            kind: 'prerequisite',
            lane: 0,
            selfLoop: true,
            warning: 'Prerequisite cycle',
          }}
        />
      </svg>,
    );
    const path = container.querySelector('#cycle')!;
    expect(path.getAttribute('d')).toBe(relationshipPath(140, 180, 140, 0, 0, true).path);
    expect(path.getAttribute('marker-end')).toBe('url(#arrow)');
    expect(container.querySelector('text')!.textContent).toBe(
      'Prerequisite a · Prerequisite cycle',
    );
  });
});

describe('bounded overview cards', () => {
  it('retains fixed bounds and visible classification with long authored labels', () => {
    const label = 'very long external reference '.repeat(20);
    const { container, getByText } = render(
      <ReactFlowProvider>
        <WorkflowNode
          id="reference"
          type="workflow"
          data={{
            type: 'workflow',
            workflow: { workflowId: label, summary: label, steps: [] },
            referenceKind: 'missing',
            referenceLabel: label,
            warning: 'missing target',
          }}
          selected={false}
          isConnectable={false}
          xPos={0}
          yPos={0}
          zIndex={0}
          dragging={false}
        />
      </ReactFlowProvider>,
    );
    const card = container.querySelector('[title]') as HTMLElement;
    expect(card.style.width).toBe('280px');
    expect(card.style.height).toBe('180px');
    expect(card.style.overflow).toBe('hidden');
    expect(getByText('MISSING REFERENCE')).toBeTruthy();
    expect(container.querySelector('[data-handleid="relationship-in"]')).toBeTruthy();
    expect(container.querySelector('[data-handleid="relationship-out"]')).toBeTruthy();
  });
});

it('keeps overview labels compact while preserving full accessible relationship text', () => {
  const full =
    'recover · failure/retry · step failed · 2 parameters · criteria: $statusCode == 503';
  const { container } = render(
    <svg>
      <RelationshipEdge
        id="compact"
        source="a"
        target="b"
        sourceX={140}
        sourceY={180}
        targetX={520}
        targetY={280}
        sourcePosition={Position.Bottom}
        targetPosition={Position.Top}
        data={{
          type: 'relationship',
          kind: 'action',
          label: full,
          compactLabel: 'R1 · retry',
          lane: 0,
          selfLoop: false,
        }}
      />
    </svg>,
  );
  expect(container.querySelector('text')!.textContent).toBe('R1 · retry');
  expect(container.querySelector('title')!.textContent).toContain(full);
});
