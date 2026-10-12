// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { ArazzoViewerProvider, useArazzoViewer } from '../src/context/ArazzoViewerContext';
import { SelectionDetails } from '../src/components/SelectionDetails';
import { nestedCalls } from './fixtures/connected';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => vi.unstubAllGlobals());
function viewport(narrow: boolean) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const panel = this.classList.contains('arazzo-selection-details');
    const width = panel ? Math.min(480, narrow ? 400 : 1200) : narrow ? 400 : 1200;
    const left = panel ? (narrow ? 0 : 720) : 0;
    return {
      width,
      height: 900,
      top: 0,
      bottom: 900,
      left,
      right: left + width,
      x: left,
      y: 0,
      toJSON: () => ({}),
    };
  });
}
test('inspector observes host resize both ways inside an unchanged wide viewport', async () => {
  let width = 1200;
  let resize = () => {};
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const panel = this.classList.contains('arazzo-selection-details');
    const measured = panel ? Math.min(480, width) : width;
    const left = panel ? width - measured : 0;
    return {
      width: measured,
      height: 900,
      top: 0,
      bottom: 900,
      left,
      right: left + measured,
      x: left,
      y: 0,
      toJSON: () => ({}),
    };
  });
  render(<ArazzoUI document={nestedCalls} view="docs" />);
  const origin = await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' });
  fireEvent.click(origin);
  await screen.findByRole('region', { name: 'Selection details' });
  act(() => {
    width = 400;
    resize();
  });
  await screen.findByRole('dialog', { name: 'Selection details' });
  expect(document.querySelector('.arazzo-workflow-navigation')?.closest('[inert]')).toBeTruthy();
  act(() => {
    width = 1200;
    resize();
  });
  await screen.findByRole('region', { name: 'Selection details' });
  expect(document.querySelector('[inert]')).toBeNull();
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(document.activeElement).toBe(origin);
});
test('desktop inspector stays nonmodal, Escape dismisses and restores its origin', async () => {
  viewport(false);
  render(<ArazzoUI document={nestedCalls} view="docs" />);
  const origin = await screen.findByRole('button', {
    name: 'Inspect checkout.firstPayment',
  });
  fireEvent.click(origin);
  const panel = await screen.findByRole('region', { name: 'Selection details' });
  expect(panel.hasAttribute('aria-modal')).toBe(false);
  expect(screen.getByRole('navigation').hasAttribute('inert')).toBe(false);
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
  expect(document.activeElement).toBe(origin);
});
test('narrow covering dialog excludes background, traps Tab both ways and releases it on close', async () => {
  viewport(true);
  render(<ArazzoUI document={nestedCalls} view="docs" />);
  const origin = await screen.findByRole('button', {
    name: 'Inspect checkout.firstPayment',
  });
  fireEvent.click(origin);
  const panel = await screen.findByRole('dialog', { name: 'Selection details' });
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
  await screen.findByRole('region', { name: 'Selection details' });
  rerender(mount('diagram'));
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Select workflow' }));
});

test('a covering embedded inspector scopes inert to the viewer and restores existing background state', async () => {
  viewport(true);
  render(
    <>
      <button>Host control</button>
      <ArazzoUI document={nestedCalls} view="docs" />
    </>,
  );
  const origin = await screen.findByRole('button', {
    name: 'Inspect checkout.firstPayment',
  });
  const host = screen.getByRole('button', { name: 'Host control' });
  const navigation = document.querySelector('.arazzo-workflow-navigation')!;
  navigation.setAttribute('inert', 'preserved');
  navigation.setAttribute('aria-hidden', 'false');
  fireEvent.click(origin);
  await screen.findByRole('dialog', { name: 'Selection details' });
  expect(host.closest('[inert]')).toBeNull();
  expect(screen.getByRole('button', { name: 'Host control' })).toBe(host);
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(screen.getByRole('button', { name: 'Host control' })).toBe(host);
  expect(host.closest('[inert]')).toBeNull();
  expect(navigation.getAttribute('inert')).toBe('preserved');
  expect(navigation.getAttribute('aria-hidden')).toBe('false');
});
test('an origin inside subsequently collapsed documentation uses visible navigation fallback', async () => {
  viewport(false);
  render(<ArazzoUI document={nestedCalls} view="docs" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' }));
  await screen.findByRole('region', { name: 'Selection details' });
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

test('sequence SVG identity opens exact details with keyboard and Escape restores that identity', async () => {
  viewport(false);
  render(<ArazzoUI document={nestedCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence diagram' }));
  const identity = document.querySelector<SVGGElement>(
    '.arazzo-sequence svg [data-sequence-id][role="button"]',
  )!;
  expect(identity.getAttribute('tabindex')).toBe('0');
  identity.focus();
  fireEvent.keyDown(identity, { key: 'Enter' });
  const details = await screen.findByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('checkout.prepare');
  fireEvent.keyDown(details, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
  expect(document.activeElement).toBe(identity);
});
