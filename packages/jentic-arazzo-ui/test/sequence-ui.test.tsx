// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { ArazzoViewerProvider, useArazzoViewer } from '../src/context/ArazzoViewerContext';
import { useViewerSession } from '../src/context/ViewerSessionContext';
import { buildSequence } from '../src/utils/sequence/sequenceModel';
import { ArazzoUI } from '../src/ArazzoUI';
import { nestedCalls, recursiveCalls, difficultCalls } from './fixtures/connected';
Element.prototype.scrollIntoView = vi.fn();
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));

test('connected sequence expands one occurrence and restores its call focus on collapse', async () => {
  render(<ArazzoUI document={nestedCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  const scene = screen.getByRole('region', { name: 'Sequence checkout' });
  expect(
    within(scene).getAllByRole('button', { name: /^Expand payment\.audit → audit ·/ }),
  ).toHaveLength(2);
  fireEvent.click(
    within(scene).getAllByRole('button', { name: /^Expand payment\.audit → audit ·/ })[0],
  );
  expect(within(scene).getAllByRole('button', { name: /^Inspect audit\.record ·/ })).toHaveLength(
    1,
  );
  const record = within(scene).getByRole('button', { name: /^Inspect audit\.record ·/ });
  fireEvent.click(record);
  const collapse = within(scene).getByRole('button', {
    name: /^Collapse checkout\.firstPayment → payment ·/,
  });
  fireEvent.click(collapse);
  expect(within(scene).queryByRole('button', { name: /^Inspect audit\.record ·/ })).toBeNull();
  expect(document.activeElement).toBe(
    within(scene).getByRole('button', { name: /^Expand checkout\.firstPayment → payment ·/ }),
  );
  expect(screen.getByRole('combobox', { name: 'Select workflow' })).toHaveProperty(
    'value',
    'checkout',
  );
});

test('call details preserve falsy mappings and return to the exact followed occurrence', async () => {
  const callback = vi.fn();
  render(<ArazzoUI document={nestedCalls} onWorkflowSelect={callback} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  const inspect = screen.getByRole('button', { name: /^Inspect checkout\.firstPayment ·/ });
  fireEvent.click(inspect);
  const details = screen.getByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('Caller-supplied parameters');
  expect(details.textContent).toContain('"value": 0');
  expect(details.textContent).toContain('Declared callee inputs');
  expect(details.textContent).toContain('$workflows.payment.outputs.receipt');
  fireEvent.click(within(details).getByRole('button', { name: 'Close details' }));
  expect(document.activeElement).toBe(inspect);
  fireEvent.click(
    screen.getByRole('button', {
      name: /^Open workflow payment from checkout\.firstPayment ·/,
    }),
  );
  await screen.findByRole('button', { name: 'Back to caller checkout.firstPayment' });
  fireEvent.click(screen.getByRole('button', { name: 'Back to caller checkout.firstPayment' }));
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Select workflow' })).toHaveProperty(
      'value',
      'checkout',
    ),
  );
  expect(screen.getByRole('region', { name: 'Sequence checkout' })).toBeTruthy();
  expect(callback.mock.calls.map(([id]) => id)).toEqual(['payment', 'checkout']);
});

test('controlled call requests commit caller context only after acceptance and clear on unrelated navigation', async () => {
  const callback = vi.fn();
  const mount = (active: string) => (
    <ArazzoUI document={nestedCalls} activeWorkflowId={active} onWorkflowSelect={callback} />
  );
  const { rerender } = render(mount('checkout'));
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  fireEvent.click(
    screen.getByRole('button', {
      name: /^Open workflow payment from checkout\.secondPayment ·/,
    }),
  );
  expect(screen.queryByRole('button', { name: /Back to caller/ })).toBeNull();
  expect(screen.getByRole('combobox')).toHaveProperty('value', 'checkout');
  rerender(mount('payment'));
  await screen.findByRole('button', { name: 'Back to caller checkout.secondPayment' });
  rerender(mount('client'));
  await waitFor(() => expect(screen.queryByRole('button', { name: /Back to caller/ })).toBeNull());
});

test('unavailable and recursion markers retain understandable controls without navigating on selection', async () => {
  const { unmount } = render(<ArazzoUI document={recursiveCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  fireEvent.click(screen.getByRole('button', { name: /^Expand payment\.again → checkout ·/ }));
  expect(screen.getByRole('region', { name: 'Sequence checkout' }).textContent).toContain(
    'Recursion',
  );
  unmount();
  render(<ArazzoUI document={difficultCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  const sequence = screen.getByRole('region', { name: /^Sequence entry/ });
  expect(sequence.textContent).toContain('missing');
  expect(sequence.textContent).toContain('external-workflow');
  expect(within(sequence).queryByRole('button', { name: /^Open workflow absent/ })).toBeNull();
});

test('nested caller paths survive mode changes and restore expansion and the exact caller control', async () => {
  const mount = (view: 'docs' | 'diagram' | 'split') => (
    <ArazzoUI document={nestedCalls} view={view} />
  );
  const { rerender } = render(mount('docs'));
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  fireEvent.click(
    screen.getByRole('button', {
      name: /^Open workflow payment from checkout\.firstPayment ·/,
    }),
  );
  await screen.findByRole('button', { name: 'Back to caller checkout.firstPayment' });
  fireEvent.click(screen.getByRole('button', { name: 'Sequence' }));
  fireEvent.click(
    screen.getByRole('button', { name: /^Open workflow audit from payment\.audit ·/ }),
  );
  await screen.findByRole('button', { name: 'Back to caller payment.audit' });
  rerender(mount('diagram'));
  expect(screen.getByRole('button', { name: 'Back to caller payment.audit' })).toBeTruthy();
  rerender(mount('split'));
  fireEvent.click(screen.getByRole('button', { name: 'Back to caller payment.audit' }));
  await screen.findByRole('region', { name: 'Sequence payment' });
  expect(document.activeElement?.getAttribute('aria-label')).toMatch(
    /^Collapse payment\.audit → audit ·/,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Back to caller checkout.firstPayment' }));
  await screen.findByRole('region', { name: 'Sequence checkout' });
  expect(document.activeElement?.getAttribute('aria-label')).toMatch(
    /^Collapse checkout\.firstPayment → payment ·/,
  );
});

test('replacement documents cancel caller context and occurrence selection', async () => {
  const { rerender } = render(<ArazzoUI document={nestedCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  fireEvent.click(
    screen.getByRole('button', {
      name: /^Open workflow payment from checkout\.firstPayment ·/,
    }),
  );
  await screen.findByRole('button', { name: 'Back to caller checkout.firstPayment' });
  rerender(<ArazzoUI document={structuredClone(nestedCalls)} />);
  await waitFor(() => expect(screen.queryByRole('button', { name: /Back to caller/ })).toBeNull());
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
});

function ControlledProbe() {
  const viewer = useArazzoViewer();
  const session = useViewerSession();
  const row = buildSequence(viewer.model, 'checkout').rows.find((r) => r.kind === 'call')!;
  return (
    <>
      <output data-testid="root-node">
        {viewer.model.nodeIds.get('checkout')!.get('secondPayment')}
      </output>
      <output data-testid="callee-node">
        {viewer.model.nodeIds.get('payment')!.get('charge')}
      </output>
      <button onClick={() => viewer.setSelectedNode(null)}>Clear public selection</button>
      <output data-testid="trail">{session.trail.length}</output>
      <button onClick={() => session.followCall('checkout', row)}>Request call</button>
      <button onClick={() => session.inspectStep('checkout', 'secondPayment')}>
        Inspect another step
      </button>
    </>
  );
}
test('controlled selection cancels an unaccepted call and accepted callee selection retains its caller', () => {
  const mount = (active: string, selected: string | null = null) => (
    <ArazzoViewerProvider
      document={nestedCalls}
      initialActiveWorkflowId={active}
      initialSelectedNodeId={selected}
    >
      <ControlledProbe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount('checkout'));
  const rootNode = screen.getByTestId('root-node').textContent!;
  const calleeNode = screen.getByTestId('callee-node').textContent!;
  fireEvent.click(screen.getByText('Request call'));
  rerender(mount('checkout', rootNode));
  rerender(mount('payment', calleeNode));
  expect(screen.getByTestId('trail').textContent).toBe('0');
  rerender(mount('checkout'));
  fireEvent.click(screen.getByText('Request call'));
  rerender(mount('payment', calleeNode));
  expect(screen.getByTestId('trail').textContent).toBe('1');
});
test('local inspection cancels an unaccepted controlled call even when the host holds selection', () => {
  const mount = (active: string) => (
    <ArazzoViewerProvider
      document={nestedCalls}
      initialActiveWorkflowId={active}
      initialSelectedNodeId={null}
    >
      <ControlledProbe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount('checkout'));
  fireEvent.click(screen.getByText('Request call'));
  fireEvent.click(screen.getByText('Inspect another step'));
  rerender(mount('payment'));
  expect(screen.getByTestId('trail').textContent).toBe('0');
});

test('workflow prerequisite context is keyboard inspectable and row limits offer complete documentation', async () => {
  const { unmount } = render(<ArazzoUI document={difficultCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  const context = screen.getAllByRole('button', { name: /^Inspect context for entry/ })[0];
  fireEvent.click(context);
  expect(screen.getByRole('region', { name: 'Selection details' }).textContent).toContain(
    'Prerequisites',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(document.activeElement).toBe(context);
  unmount();
  const doc = structuredClone(nestedCalls);
  doc.workflows = [
    {
      workflowId: 'large',
      steps: Array.from({ length: 210 }, (_, i) => ({ stepId: `step${i}`, operationId: 'opaque' })),
    },
  ];
  render(<ArazzoUI document={doc} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  fireEvent.click(screen.getByRole('button', { name: /^View complete documentation for large ·/ }));
  expect(screen.queryByRole('region', { name: 'Sequence large' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Inspect large.step209' })).toBeTruthy();
}, 30000);

test('clearing an already-null controlled selection cancels the pending caller request', () => {
  const mount = (active: string) => (
    <ArazzoViewerProvider
      document={nestedCalls}
      initialActiveWorkflowId={active}
      initialSelectedNodeId={null}
    >
      <ControlledProbe />
    </ArazzoViewerProvider>
  );
  const { rerender } = render(mount('checkout'));
  fireEvent.click(screen.getByText('Request call'));
  fireEvent.click(screen.getByText('Clear public selection'));
  rerender(mount('payment'));
  expect(screen.getByTestId('trail').textContent).toBe('0');
});
