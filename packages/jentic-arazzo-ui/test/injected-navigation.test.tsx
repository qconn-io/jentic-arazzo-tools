// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ArazzoViewerProvider, useArazzoViewer } from '../src/context/ArazzoViewerContext';
import type { ArazzoViewerContextValue } from '../src/types/viewer';
const document = {
  arazzo: '1.1.0',
  info: { title: 'injected', version: '1' },
  sourceDescriptions: [],
  workflows: ['A', 'B', 'C'].map((workflowId) => ({
    workflowId,
    _internalId: `wf${workflowId}`,
    steps: [{ stepId: 'init', _internalId: `step${workflowId}`, operationId: 'get' }],
  })),
};
function Probe() {
  const ctx = useArazzoViewer();
  return (
    <>
      <button
        onClick={() =>
          ctx.navigateToTarget(
            ctx.inspection.classifyTarget('$workflows.B.steps.init', {
              role: 'step-prerequisite',
              workflowId: 'A',
            }),
          )
        }
      >
        B.init
      </button>
      <button onClick={() => ctx.setSelectedNode(null)}>clear</button>
      <button onClick={() => ctx.setActiveWorkflow(null)}>overview</button>
    </>
  );
}
function value(
  active: string,
  select: (id: string | null) => void,
  selected: string | null = null,
): ArazzoViewerContextValue {
  return {
    document,
    documentURL: null,
    activeWorkflowId: active,
    activeWorkflow: document.workflows.find((w) => w.workflowId === active)!,
    selectedNodeId: selected,
    nodes: document.workflows
      .find((w) => w.workflowId === active)!
      .steps.map((step) => ({
        id: `wf${active}-${step._internalId}`,
        position: { x: 0, y: 0 },
        data: { type: 'step', step, workflowId: active, isValid: true },
      })),
    edges: [],
    setSelectedNode: select,
    setActiveWorkflow: vi.fn(),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    readOnly: true,
  };
}
test.each(['clear', 'overview', 'controlled-selection', 'unrelated-workflow'])(
  'injected provider cancels pending focus after %s',
  (cancellation) => {
    const select = vi.fn();
    const mount = (active: string, selected: string | null = null) => (
      <ArazzoViewerProvider value={value(active, select, selected)}>
        <Probe />
      </ArazzoViewerProvider>
    );
    const { rerender } = render(mount('A'));
    fireEvent.click(screen.getByRole('button', { name: 'B.init' }));
    if (cancellation === 'clear' || cancellation === 'overview')
      fireEvent.click(screen.getByRole('button', { name: cancellation }));
    else if (cancellation === 'controlled-selection') rerender(mount('A', 'different-node'));
    else rerender(mount('C'));
    select.mockClear();
    rerender(mount('B'));
    expect(select).not.toHaveBeenCalled();
  },
);
test('injected controlled workflow acceptance retains scoped destination focus', () => {
  const select = vi.fn();
  const mount = (active: string) => (
    <ArazzoViewerProvider value={value(active, select)}>
      <Probe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount('A'));
  fireEvent.click(screen.getByRole('button', { name: 'B.init' }));
  rerender(mount('B'));
  expect(select).toHaveBeenCalledExactlyOnceWith('wfB-stepB');
});
