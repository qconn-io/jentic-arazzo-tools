// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { difficultCalls, nestedCalls } from './fixtures/connected';
Element.prototype.scrollIntoView = vi.fn();
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));

test('default Docs exposes shared navigation and a meaningful overview without switching modes', async () => {
  const callback = vi.fn();
  const { container } = render(<ArazzoUI document={nestedCalls} onWorkflowSelect={callback} />);
  const nav = await screen.findByRole('navigation', { name: 'Workflows' });
  expect(within(nav).getByRole('combobox', { name: 'Select workflow' })).toHaveProperty(
    'value',
    'checkout',
  );
  expect(container.querySelector('details[data-workflow-id="checkout"]')).toHaveProperty(
    'open',
    true,
  );
  fireEvent.click(within(nav).getByRole('button', { name: 'All workflows' }));
  const overview = screen.getByRole('region', { name: 'Workflow overview' });
  within(overview)
    .getAllByText(/^Relationships \(/)
    .forEach((disclosure) => fireEvent.click(disclosure));
  expect(within(overview).getAllByText('Call').length).toBeGreaterThan(0);
  expect(within(overview).getAllByText('Incoming').length).toBeGreaterThan(0);
  expect(container.querySelector('details[data-workflow-id]')).toBeNull();
  expect(callback).toHaveBeenCalledExactlyOnceWith('');
  fireEvent.click(within(overview).getByRole('button', { name: 'Open workflow payment' }));
  expect(container.querySelector('details[data-workflow-id="payment"]')).toHaveProperty(
    'open',
    true,
  );
  expect(callback).toHaveBeenCalledTimes(2);
});

test('controlled overview requests do not replace the authoritative workflow', async () => {
  const callback = vi.fn();
  const mount = (active: string | null) => (
    <ArazzoUI document={nestedCalls} activeWorkflowId={active} onWorkflowSelect={callback} />
  );
  const { rerender } = render(mount(null));
  await screen.findByRole('region', { name: 'Workflow overview' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Select workflow' }), {
    target: { value: 'payment' },
  });
  expect(callback).toHaveBeenCalledExactlyOnceWith('payment');
  expect(screen.getByRole('region', { name: 'Workflow overview' })).toBeTruthy();
  rerender(mount('payment'));
  await waitFor(() =>
    expect(screen.queryByRole('region', { name: 'Workflow overview' })).toBeNull(),
  );
  expect(screen.getByRole('button', { name: 'Sequence diagram' })).toBeTruthy();
});

test('overview keeps missing targets visible and navigates from a scoped incoming relationship', async () => {
  const callback = vi.fn();
  render(<ArazzoUI document={difficultCalls} onWorkflowSelect={callback} />);
  fireEvent.click(await screen.findByRole('button', { name: 'All workflows' }));
  const overview = screen.getByRole('region', { name: 'Workflow overview' });
  const entry = within(overview)
    .getByRole('button', { name: /^Open workflow entry with a very long/ })
    .closest('article')!;
  expect(within(entry).getByText(/2 unavailable relationships/)).toBeTruthy();
  fireEvent.click(within(entry).getByText(/^Relationships \(/));
  expect(within(entry).getByText(/absent \(missing/)).toBeTruthy();
  const auditEntry = within(overview)
    .getByRole('button', { name: 'Open workflow audit' })
    .closest('article')!;
  fireEvent.click(within(auditEntry).getByText(/^Relationships \(/));
  const incoming = within(auditEntry).getByText('Incoming').parentElement!;
  const goto = incoming.querySelector('[data-relationship-type="goto"]')!;
  fireEvent.click(
    within(goto as HTMLElement).getByRole('button', { name: /entry with a very long/ }),
  );
  expect(callback).toHaveBeenLastCalledWith(
    'entry with a very long authored name that must remain available to readers',
  );
});

test('mode changes retain destination and replacement rebuilds the overview entries', async () => {
  const callback = vi.fn();
  const mount = (view: 'docs' | 'diagram' | 'split', document = nestedCalls) => (
    <ArazzoUI document={document} view={view} onWorkflowSelect={callback} />
  );
  const { rerender } = render(mount('docs'));
  await screen.findByRole('navigation', { name: 'Workflows' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Select workflow' }), {
    target: { value: 'payment' },
  });
  for (const mode of ['diagram', 'split', 'docs'] as const) {
    rerender(mount(mode));
    expect(screen.getByRole('combobox', { name: 'Select workflow' })).toHaveProperty(
      'value',
      'payment',
    );
    expect(screen.getAllByRole('button', { name: 'All workflows' })).toHaveLength(1);
  }
  fireEvent.click(screen.getByRole('button', { name: 'All workflows' }));
  for (const mode of ['diagram', 'split', 'docs'] as const) {
    rerender(mount(mode));
    expect(screen.getByRole('combobox', { name: 'Select workflow' })).toHaveProperty('value', '');
    if (mode !== 'diagram')
      expect(screen.getByRole('region', { name: 'Workflow overview' })).toBeTruthy();
  }
  expect(callback.mock.calls.map(([id]) => id)).toEqual(['payment', '']);
  rerender(
    mount('docs', { ...nestedCalls, workflows: [{ workflowId: 'replacement', steps: [] }] }),
  );
  await screen.findByRole('button', { name: 'Open workflow replacement' });
  expect(screen.queryByRole('button', { name: 'Open workflow payment' })).toBeNull();
});
