// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ArazzoViewerProvider } from '../src/context/ArazzoViewerContext';
import type { ArazzoViewerContextValue } from '../src/types/viewer';

const control = vi.hoisted(() => ({
  ready: false,
  center: vi.fn(),
  api: {} as Record<string, unknown>,
}));
vi.mock('reactflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('reactflow')>();
  const ReactModule = await import('react');
  control.api = { setCenter: control.center, getZoom: () => 1, fitView: vi.fn(), zoomTo: vi.fn() };
  return {
    ...actual,
    useReactFlow: () => control.api,
    useNodesInitialized: () => control.ready,
    Background: () => null,
    Controls: () => null,
    ReactFlow: ({ onInit }: { onInit: (instance: unknown) => void }) => {
      ReactModule.useEffect(() => {
        onInit(control.api);
      }, []);
      return null;
    },
  };
});
import { DiagramView } from '../src/components/DiagramView';

function value(selectedNodeId: string | null, includeTarget = true): ArazzoViewerContextValue {
  const document = {
    arazzo: '1.1.0',
    info: { title: 'focus', version: '1' },
    sourceDescriptions: [],
    workflows: [{ workflowId: 'A', steps: [{ stepId: 'init', operationId: 'get' }] }],
  };
  return {
    document,
    documentURL: null,
    activeWorkflowId: 'A',
    activeWorkflow: document.workflows[0],
    selectedNodeId,
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { type: 'start', workflowId: 'A' },
      },
      ...(includeTarget
        ? [
            {
              id: 'target',
              type: 'step',
              position: { x: 0, y: 800 },
              data: {
                type: 'step' as const,
                workflowId: 'A',
                step: document.workflows[0].steps[0],
                isValid: true,
              },
            },
          ]
        : []),
    ],
    edges: [],
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    setActiveWorkflow: vi.fn(),
    setSelectedNode: vi.fn(),
    readOnly: true,
  };
}

test('focus waits for React Flow readiness and destination nodes and suppresses later start-node centering', async () => {
  vi.useFakeTimers();
  control.center.mockClear();
  control.ready = false;
  const mount = (target = true) => (
    <ArazzoViewerProvider value={value('target', target)}>
      <DiagramView showWorkflowTabs={false} />
    </ArazzoViewerProvider>
  );
  const { rerender, unmount } = render(mount(false));
  await act(async () => {
    vi.advanceTimersByTime(100);
  });
  expect(control.center).not.toHaveBeenCalled();
  control.ready = true;
  rerender(mount());
  await act(async () => {
    vi.advanceTimersByTime(100);
  });
  expect(control.center).toHaveBeenCalledTimes(1);
  expect(control.center.mock.calls[0][1]).toBeGreaterThan(800);
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });
  expect(control.center).toHaveBeenCalledTimes(1);
  unmount();
  vi.useRealTimers();
});

test('superseded centering timers cannot focus a stale selection', async () => {
  vi.useFakeTimers();
  control.center.mockClear();
  control.ready = true;
  const { rerender, unmount } = render(
    <ArazzoViewerProvider value={value('target')}>
      <DiagramView showWorkflowTabs={false} />
    </ArazzoViewerProvider>,
  );
  rerender(
    <ArazzoViewerProvider value={value(null)}>
      <DiagramView showWorkflowTabs={false} />
    </ArazzoViewerProvider>,
  );
  await act(async () => {
    vi.advanceTimersByTime(100);
  });
  expect(control.center.mock.calls.every((call) => call[1] < 800)).toBe(true);
  unmount();
  vi.useRealTimers();
});
