// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { ArazzoViewerProvider, useArazzoViewer } from '../src/context/ArazzoViewerContext';
import { SelectionDetails } from '../src/components/SelectionDetails';
import { nestedCalls } from './fixtures/connected';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
Element.prototype.scrollIntoView = vi.fn();
function viewport(narrow: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: narrow, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}
test('desktop inspector stays nonmodal, Escape dismisses and restores its origin', async () => {
  viewport(false);
  render(<ArazzoUI document={nestedCalls} />);
  const origin = await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' });
  fireEvent.click(origin);
  const panel = screen.getByRole('region', { name: 'Selection details' });
  expect(panel.hasAttribute('aria-modal')).toBe(false);
  expect(screen.getByRole('navigation').hasAttribute('inert')).toBe(false);
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
  expect(document.activeElement).toBe(origin);
});
test('narrow covering dialog excludes background, traps Tab both ways and releases it on close', async () => {
  viewport(true);
  render(<ArazzoUI document={nestedCalls} />);
  const origin = await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' });
  fireEvent.click(origin);
  const panel = screen.getByRole('dialog', { name: 'Selection details' });
  expect(panel.getAttribute('aria-modal')).toBe('true');
  expect(document.querySelector('.arazzo-workflow-navigation')?.closest('[inert]')).toBeTruthy();
  const close = within(panel).getByRole('button', { name: 'Close details' });
  close.focus();
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  const advanced = within(panel).getByText('Advanced authored content and provenance');
  expect(document.activeElement).toBe(advanced);
  fireEvent.keyDown(advanced, { key: 'Tab' });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(close, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.querySelector('[inert]')).toBeNull();
  expect(document.activeElement).toBe(origin);
});
test('dismissal after mode switching restores visible navigation when origin was removed', async () => {
  viewport(false);
  const mount = (view: 'docs' | 'diagram') => <ArazzoUI document={nestedCalls} view={view} />;
  const { rerender } = render(mount('docs'));
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' }));
  rerender(mount('diagram'));
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Select workflow' }));
});

test('a covering embedded inspector excludes covered host controls and restores existing background state', async () => {
  viewport(true);
  render(
    <>
      <button>Host control</button>
      <ArazzoUI document={nestedCalls} />
    </>,
  );
  const origin = await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' });
  const host = screen.getByRole('button', { name: 'Host control' });
  fireEvent.click(origin);
  expect(host.closest('[inert]')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Host control' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(screen.getByRole('button', { name: 'Host control' })).toBe(host);
  expect(host.closest('[inert]')).toBeNull();
});
test('an origin inside subsequently collapsed documentation uses visible navigation fallback', async () => {
  viewport(false);
  render(<ArazzoUI document={nestedCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' }));
  const workflow = document.querySelector<HTMLDetailsElement>(
    'details[data-workflow-id="checkout"]',
  )!;
  workflow.open = false;
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Select workflow' }));
});

function DiagramSelectionProbe() {
  const viewer = useArazzoViewer();
  const nodeId = viewer.model.nodeIds.get('checkout')!.get('prepare')!;
  return (
    <>
      <button onClick={() => viewer.setSelectedNode(nodeId)}>Select diagram node</button>
      <SelectionDetails />
    </>
  );
}
test('keyboard selection through the diagram selection callback restores its initiating control', () => {
  viewport(false);
  render(
    <ArazzoViewerProvider document={nestedCalls}>
      <DiagramSelectionProbe />
    </ArazzoViewerProvider>,
  );
  const origin = screen.getByRole('button', { name: 'Select diagram node' });
  origin.focus();
  fireEvent.click(origin);
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(document.activeElement).toBe(origin);
});
