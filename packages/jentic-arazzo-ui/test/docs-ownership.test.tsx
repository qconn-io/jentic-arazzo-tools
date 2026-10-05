// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ArazzoViewerProvider } from '../src/context/ArazzoViewerContext';
import { DocsView } from '../src/components/DocsView';
import type { ArazzoViewerContextValue, WorkflowRefNodeData } from '../src/types/viewer';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg></svg>' })) },
}));

const document = {
  arazzo: '1.1.0',
  info: { title: 'owners', version: '1' },
  sourceDescriptions: [],
  workflows: [
    { workflowId: 'flowA', steps: [{ stepId: 'init', workflowId: 'flowB' }] },
    { workflowId: 'flowB', steps: [{ stepId: 'init', operationId: 'get' }] },
  ],
};
function context(data: WorkflowRefNodeData, id = 'flowA-init'): ArazzoViewerContextValue {
  return {
    document,
    documentURL: null,
    activeWorkflowId: 'flowA',
    activeWorkflow: document.workflows[0],
    selectedNodeId: id,
    nodes: [{ id, type: 'workflowRef', position: { x: 0, y: 0 }, data }],
    edges: [],
    setActiveWorkflow: vi.fn(),
    setSelectedNode: vi.fn(),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    readOnly: true,
  };
}
test.each([true, false])(
  'call-card scrolling uses the calling owner, including legacy scoped identities: %s',
  async (explicit) => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const data: WorkflowRefNodeData = {
      type: 'workflowRef',
      step: document.workflows[0].steps[0],
      targetWorkflowId: 'flowB',
      isValid: true,
      ...(explicit ? { workflowId: 'flowA' } : {}),
    };
    const { container } = render(
      <ArazzoViewerProvider value={context(data)}>
        <DocsView />
      </ArazzoViewerProvider>,
    );
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    const destination = scroll.mock.instances[0] as HTMLElement;
    expect(destination.closest('details[data-workflow-id]')?.getAttribute('data-workflow-id')).toBe(
      'flowA',
    );
    expect(destination.getAttribute('data-step-id')).toBe('init');
    const details = [...container.querySelectorAll('details[data-workflow-id]')];
    expect(
      (details.find((d) => d.getAttribute('data-workflow-id') === 'flowA') as HTMLDetailsElement)
        .open,
    ).toBe(true);
  },
);
test('unavailable legacy ownership is reported without guessing the called workflow', async () => {
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  const data: WorkflowRefNodeData = {
    type: 'workflowRef',
    step: document.workflows[0].steps[0],
    targetWorkflowId: 'flowB',
    isValid: true,
  };
  const { container } = render(
    <ArazzoViewerProvider value={context(data, 'unknown-owner')}>
      <DocsView />
    </ArazzoViewerProvider>,
  );
  await waitFor(() => expect(container.textContent).toContain('unavailable ownership'));
  expect(scroll).not.toHaveBeenCalled();
});

test('docs-only prerequisite navigation focuses the owner-scoped destination among duplicate init IDs', async () => {
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  const source = {
    ...document,
    workflows: [
      {
        workflowId: 'flowA',
        steps: [{ stepId: 'init', operationId: 'get', dependsOn: ['$workflows.flowB.steps.init'] }],
      },
      document.workflows[1],
    ],
  };
  const { container } = render(
    <ArazzoViewerProvider document={source}>
      <DocsView />
    </ArazzoViewerProvider>,
  );
  const anchor = container.querySelector<HTMLAnchorElement>('a[href^="#arazzo-target="]')!;
  expect(anchor).not.toBeNull();
  const { fireEvent } = await import('@testing-library/react');
  fireEvent.click(anchor);
  await waitFor(() =>
    expect(
      scroll.mock.instances.some(
        (instance) =>
          (instance as HTMLElement).getAttribute('data-step-id') === 'init' &&
          (instance as HTMLElement)
            .closest('details[data-workflow-id]')
            ?.getAttribute('data-workflow-id') === 'flowB',
      ),
    ).toBe(true),
  );
  const last = scroll.mock.instances.at(-1) as HTMLElement;
  expect(last.getAttribute('data-step-id')).toBe('init');
  expect(last.closest('details[data-workflow-id]')?.getAttribute('data-workflow-id')).toBe('flowB');
});

test('simultaneous controlled destination and selection cannot have step scrolling overwritten by workflow scrolling', async () => {
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  const base = context({
    type: 'workflowRef',
    step: document.workflows[0].steps[0],
    targetWorkflowId: 'flowB',
    workflowId: 'flowA',
    isValid: true,
  });
  base.selectedNodeId = null;
  const { rerender } = render(
    <ArazzoViewerProvider value={base}>
      <DocsView />
    </ArazzoViewerProvider>,
  );
  const destination = {
    ...base,
    activeWorkflowId: 'flowB',
    selectedNodeId: 'flowB-init',
    nodes: [
      {
        id: 'flowB-init',
        position: { x: 0, y: 0 },
        data: {
          type: 'step' as const,
          workflowId: 'flowB',
          step: document.workflows[1].steps[0],
          isValid: true,
        },
      },
    ],
  };
  rerender(
    <ArazzoViewerProvider value={destination}>
      <DocsView />
    </ArazzoViewerProvider>,
  );
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  expect((scroll.mock.instances.at(-1) as HTMLElement).getAttribute('data-step-id')).toBe('init');
});
