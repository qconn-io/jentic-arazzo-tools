// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArazzoViewerProvider, useArazzoViewer } from '../src/context/ArazzoViewerContext';
import { WorkflowTabs } from '../src/components/WorkflowTabs';
import type { ArazzoDocument } from '../src/types/arazzo';

const doc: ArazzoDocument = {
  arazzo: '1.1.0',
  info: { title: 'navigation', version: '1' },
  sourceDescriptions: [],
  workflows: ['A', 'B', 'C'].map((workflowId) => ({
    workflowId,
    steps: [
      { stepId: 'init', operationId: 'get' },
      { stepId: 'second', operationId: 'get' },
    ],
  })),
};
function Probe() {
  const ctx = useArazzoViewer();
  return (
    <>
      <WorkflowTabs />
      <output data-testid="workflow">{ctx.activeWorkflowId ?? 'overview'}</output>
      <output data-testid="selection">{ctx.selectedNodeId ?? 'none'}</output>
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
      <button
        onClick={() =>
          ctx.navigateToTarget(
            ctx.inspection.classifyTarget('second', {
              role: 'step-prerequisite',
              workflowId: ctx.activeWorkflowId ?? 'A',
            }),
          )
        }
      >
        local.second
      </button>
      <button onClick={() => ctx.setSelectedNode(null)}>clear</button>
    </>
  );
}

test('uncontrolled initial first workflow and overview round trip emit one callback each', async () => {
  const callback = vi.fn();
  render(
    <ArazzoViewerProvider document={doc} events={{ onWorkflowSelect: callback }}>
      <Probe />
    </ArazzoViewerProvider>,
  );
  expect(screen.getByTestId('workflow').textContent).toBe('A');
  fireEvent.click(screen.getByRole('button', { name: 'All workflows' }));
  expect(screen.getByTestId('workflow').textContent).toBe('overview');
  expect(callback).toHaveBeenCalledExactlyOnceWith('');
  fireEvent.click(screen.getByRole('button', { name: 'B' }));
  expect(screen.getByTestId('workflow').textContent).toBe('B');
  expect(callback).toHaveBeenCalledTimes(2);
});

test('explicit null starts overview and controlled destination accepts pending scoped focus', async () => {
  const callback = vi.fn();
  const select = vi.fn();
  const mount = (active: string | null) => (
    <ArazzoViewerProvider
      document={doc}
      initialActiveWorkflowId={active}
      events={{ onWorkflowSelect: callback, onNodeSelect: select }}
    >
      <Probe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount(null));
  expect(screen.getByTestId('workflow').textContent).toBe('overview');
  fireEvent.click(screen.getByRole('button', { name: 'B.init' }));
  expect(callback).toHaveBeenCalledExactlyOnceWith('B');
  expect(screen.getByTestId('workflow').textContent).toBe('overview');
  rerender(mount('B'));
  await waitFor(() => expect(select).toHaveBeenCalledTimes(1));
  expect(select.mock.calls[0][1].data.workflowId).toBe('B');
  expect(select.mock.calls[0][1].data.step.stepId).toBe('init');
});

test('already-active destination focuses immediately and clearing cancels controlled highlighting without a null callback', async () => {
  const select = vi.fn();
  const mount = (selected: string | null) => (
    <ArazzoViewerProvider
      document={doc}
      initialActiveWorkflowId="A"
      initialSelectedNodeId={selected}
      events={{ onNodeSelect: select }}
    >
      <Probe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount('controlled-highlight'));
  fireEvent.click(screen.getByRole('button', { name: 'local.second' }));
  await waitFor(() => expect(select).toHaveBeenCalledTimes(1));
  expect(select.mock.calls[0][1].data.step.stepId).toBe('second');
  expect(screen.getByTestId('selection').textContent).toBe('controlled-highlight');
  fireEvent.click(screen.getByRole('button', { name: 'clear' }));
  expect(select).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('selection').textContent).toBe('controlled-highlight');
  rerender(mount(null));
  expect(screen.getByTestId('selection').textContent).toBe('none');
});

test('superseding controlled destinations and document replacement cancel pending duplicate init focus', async () => {
  const select = vi.fn();
  const mount = (document: ArazzoDocument, active: string) => (
    <ArazzoViewerProvider
      document={document}
      initialActiveWorkflowId={active}
      events={{ onNodeSelect: select }}
    >
      <Probe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount(doc, 'A'));
  fireEvent.click(screen.getByRole('button', { name: 'B.init' }));
  rerender(mount(doc, 'C'));
  expect(select).not.toHaveBeenCalled();
  rerender(mount(doc, 'A'));
  fireEvent.click(screen.getByRole('button', { name: 'B.init' }));
  rerender(mount(structuredClone(doc), 'B'));
  expect(select).not.toHaveBeenCalled();
});

test('component-only document replacement rebuilds overview and shared model while selection reuses the model', async () => {
  const models: unknown[] = [];
  const source: ArazzoDocument = {
    ...doc,
    components: {
      parameters: { shared: { name: 'value', value: 1 } },
      successActions: {
        finish: {
          name: 'finish',
          type: 'end',
          parameters: [{ reference: '$components.parameters.shared' }],
        },
      },
    },
    workflows: [
      {
        workflowId: 'A',
        steps: [
          {
            stepId: 'init',
            operationId: 'get',
            onSuccess: [{ reference: '$components.successActions.finish' }],
          },
        ],
      },
    ],
  };
  function ModelProbe() {
    const ctx = useArazzoViewer();
    models.push(ctx.model);
    const action = ctx.model.stepsByWorkflow.get('A')!.get('init')!.effectiveActions.onSuccess[0];
    return (
      <>
        <output data-testid="value">{JSON.stringify(action.parameters[0].value.value)}</output>
        <button onClick={() => ctx.setSelectedNode(ctx.model.nodeIds.get('A')!.get('init')!)}>
          select
        </button>
      </>
    );
  }
  const mount = (document: ArazzoDocument) => (
    <ArazzoViewerProvider document={document} initialActiveWorkflowId={null}>
      <ModelProbe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount(source));
  expect(screen.getByTestId('value').textContent).toBe('1');
  const first = models.at(-1);
  fireEvent.click(screen.getByRole('button', { name: 'select' }));
  expect(models.at(-1)).toBe(first);
  const replacement = structuredClone(source);
  replacement.components!.parameters!.shared.value = false;
  rerender(mount(replacement));
  expect(screen.getByTestId('value').textContent).toBe('false');
  expect(models.at(-1)).not.toBe(first);
});

test('overview, clear and later node selection cancel pending controlled focus requests', async () => {
  const selected = vi.fn();
  const mount = (active: string | null) => (
    <ArazzoViewerProvider
      document={doc}
      initialActiveWorkflowId={active}
      events={{ onNodeSelect: selected }}
    >
      <Probe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount('A'));
  fireEvent.click(screen.getByRole('button', { name: 'B.init' }));
  fireEvent.click(screen.getByRole('button', { name: 'All workflows' }));
  rerender(mount('B'));
  expect(selected).not.toHaveBeenCalled();
  rerender(mount('A'));
  fireEvent.click(screen.getByRole('button', { name: 'B.init' }));
  fireEvent.click(screen.getByRole('button', { name: 'clear' }));
  rerender(mount('B'));
  expect(selected).not.toHaveBeenCalled();
});

test('external overview references with local workflow-name collisions never receive local navigation handlers', () => {
  const externalDoc: ArazzoDocument = {
    ...doc,
    sourceDescriptions: [
      { name: 'remote', type: 'arazzo', url: 'https://external.invalid/arazzo.yaml' },
    ],
    workflows: [
      { workflowId: 'A', steps: [{ stepId: 'call', workflowId: '$sourceDescriptions.remote.B' }] },
      { workflowId: 'B', steps: [] },
    ],
  };
  const callback = vi.fn();
  function ExternalProbe() {
    const ctx = useArazzoViewer();
    const external = ctx.nodes.find(
      (node) => 'referenceKind' in node.data && node.data.referenceKind === 'external',
    )!;
    return (
      <button
        onClick={() => {
          if ('onClick' in external.data && 'workflow' in external.data)
            external.data.onClick?.(external.data.workflow!.workflowId);
        }}
      >
        external B
      </button>
    );
  }
  render(
    <ArazzoViewerProvider
      document={externalDoc}
      initialActiveWorkflowId={null}
      events={{ onWorkflowSelect: callback }}
    >
      <ExternalProbe />
    </ArazzoViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'external B' }));
  expect(callback).not.toHaveBeenCalled();
});

test('simultaneous controlled workflow acceptance and unrelated controlled selection cancels rather than consumes pending focus', () => {
  const select = vi.fn();
  const mount = (active: string, selected: string) => (
    <ArazzoViewerProvider
      document={doc}
      initialActiveWorkflowId={active}
      initialSelectedNodeId={selected}
      events={{ onNodeSelect: select }}
    >
      <Probe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount('A', 'old-selection'));
  fireEvent.click(screen.getByRole('button', { name: 'B.init' }));
  rerender(mount('B', 'unrelated-selection'));
  expect(select).not.toHaveBeenCalled();
  expect(screen.getByTestId('selection').textContent).toBe('unrelated-selection');
});
