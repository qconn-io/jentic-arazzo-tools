// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArazzoUIStandalone } from '../src/ArazzoUIStandalone';
import { nestedCalls } from './fixtures/connected';
import { createSnapshot } from '../src/utils/inspection';
import { readLocationURL, writeLocationURL } from '../src/utils/location/codec';
import type { WorkflowLocation } from '../src/types/location';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
vi.mock('../src/utils/loading/loadDocument', () => ({
  loadDocument: async (source: string | object) => ({
    document: nestedCalls,
    snapshot: createSnapshot(
      nestedCalls,
      typeof source === 'string' && source.startsWith('http') ? { retrievalURI: source } : {},
    ),
    diagnostics: [],
  }),
}));
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Element.prototype.scrollIntoView = vi.fn();
const location: WorkflowLocation = {
  version: 1,
  document: 'https://example.test/doc.yaml',
  root: 'checkout',
  view: 'docs',
  subview: 'sequence',
  selection: {
    kind: 'step',
    workflowId: 'payment',
    stepId: 'charge',
    occurrence: [{ workflowId: 'checkout', stepId: 'secondPayment' }],
  },
};
beforeEach(() => {
  history.replaceState(null, '', '/?theme=dark#section=notes');
});
test('copy link reproduces URL-loaded occurrence and committed history excludes search keystrokes', async () => {
  history.replaceState(null, '', writeLocationURL(new URL(window.location.href), location));
  const clipboard = vi.fn<(text: string) => Promise<void>>(async () => {});
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: clipboard },
    configurable: true,
  });
  const push = vi.spyOn(history, 'pushState');
  render(<ArazzoUIStandalone document={nestedCalls} />);
  expect((await screen.findByRole('region', { name: 'Selection details' })).textContent).toContain(
    'secondPayment',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  await waitFor(() =>
    expect(readLocationURL(new URL(window.location.href)).location?.selection).toBeUndefined(),
  );
  const baseline = push.mock.calls.length;
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'charge' } });
  expect(push.mock.calls.length).toBe(baseline);
  fireEvent.click(screen.getByRole('button', { name: 'All workflows' }));
  await waitFor(() =>
    expect(readLocationURL(new URL(window.location.href)).location?.root).toBeNull(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  await waitFor(() => expect(clipboard).toHaveBeenCalled());
  const copied = new URL(clipboard.mock.calls[0][0]);
  expect(copied.searchParams.get('theme')).toBe('dark');
  expect(copied.hash).toBe('#section=notes');
  expect(readLocationURL(copied).location?.root).toBeNull();
  expect(readLocationURL(copied).location?.digest).toMatch(/^sha256:/);
  expect(push.mock.calls.length).toBeGreaterThan(baseline);
});
test('popstate restores once without pushing a new entry', async () => {
  const push = vi.spyOn(history, 'pushState');
  render(<ArazzoUIStandalone document={location.document} />);
  await screen.findByRole('button', { name: 'Copy link' });
  await waitFor(() =>
    expect(new URL(window.location.href).searchParams.has('location')).toBe(true),
  );
  push.mockClear();
  history.replaceState(null, '', writeLocationURL(new URL(window.location.href), location));
  fireEvent(window, new PopStateEvent('popstate'));
  expect((await screen.findByRole('region', { name: 'Selection details' })).textContent).toContain(
    'secondPayment',
  );
  expect(push).not.toHaveBeenCalled();
});
test('supplied uploads without an identity explain addressability and do not claim shareability', async () => {
  const clipboard = vi.fn<(text: string) => Promise<void>>(async () => {});
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: clipboard },
    configurable: true,
  });
  render(<ArazzoUIStandalone document={nestedCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));
  expect(await screen.findByText(/published at an addressable source/)).toBeTruthy();
  expect(clipboard).not.toHaveBeenCalled();
});
test('Forward hydration reconstructs the authored caller context for a callee root', async () => {
  const caller: WorkflowLocation = {
    ...location,
    selection: { kind: 'step', workflowId: 'checkout', stepId: 'secondPayment', occurrence: [] },
  };
  const callee: WorkflowLocation = {
    ...location,
    root: 'payment',
    subview: 'docs',
    selection: undefined,
  };
  render(<ArazzoUIStandalone document={location.document} />);
  await screen.findByRole('combobox', { name: 'Select workflow' });
  history.replaceState(
    { arazzoCallers: [caller] },
    '',
    writeLocationURL(new URL(window.location.href), callee),
  );
  fireEvent(window, new PopStateEvent('popstate', { state: history.state }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Back to caller checkout.secondPayment' }),
  );
  await waitFor(() =>
    expect(screen.getByRole('region', { name: 'Sequence checkout' }).textContent).toContain(
      'secondPayment',
    ),
  );
});
test('committing a followed call saves its public caller address for Forward', async () => {
  render(<ArazzoUIStandalone document={location.document} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  fireEvent.click(
    screen.getByRole('button', { name: /Open workflow payment from checkout.secondPayment/ }),
  );
  await screen.findByRole('button', { name: 'Back to caller checkout.secondPayment' });
  await waitFor(() =>
    expect(history.state.arazzoCallers?.[0]?.selection?.stepId).toBe('secondPayment'),
  );
});
test('uploading another document drops the previous stable host identity', async () => {
  const changed = vi.fn();
  const clipboard = vi.fn<(text: string) => Promise<void>>(async () => {});
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: clipboard },
    configurable: true,
  });
  const { container } = render(
    <ArazzoUIStandalone
      document={nestedCalls}
      documentIdentity="host:original"
      onLocationChange={changed}
    />,
  );
  await waitFor(() => expect(changed).toHaveBeenCalled());
  expect(changed.mock.calls.at(-1)![0].document).toBe('host:original');
  const upload = container.querySelector('input[type=file]')!;
  fireEvent.change(upload, {
    target: { files: [new File(['arazzo: 1.1.0'], 'new.yaml', { type: 'application/yaml' })] },
  });
  await waitFor(() => expect(changed.mock.calls.at(-1)![0].document).not.toBe('host:original'));
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  expect(await screen.findByText(/published at an addressable source/)).toBeTruthy();
  expect(clipboard).not.toHaveBeenCalled();
});
test('standalone defaultLocation controls its initial view', async () => {
  render(
    <ArazzoUIStandalone
      document={location.document}
      defaultLocation={{ ...location, view: 'split' }}
    />,
  );
  expect((await screen.findByRole('region', { name: 'Selection details' })).textContent).toContain(
    'secondPayment',
  );
  expect(screen.queryByText(/conflicts with explicitly controlled/)).toBeNull();
});
test('unaddressable content retains local Back/Forward locations without claiming shareability', async () => {
  const push = vi.spyOn(history, 'pushState');
  render(<ArazzoUIStandalone document={nestedCalls} />);
  await screen.findByRole('button', { name: 'All workflows' });
  await waitFor(() => expect(history.state?.arazzoLocation?.root).toBe('checkout'));
  const previous = structuredClone(history.state);
  fireEvent.click(screen.getByRole('button', { name: 'All workflows' }));
  await waitFor(() => expect(history.state?.arazzoLocation?.root).toBeNull());
  expect(push).toHaveBeenCalled();
  expect(new URL(window.location.href).searchParams.has('location')).toBe(false);
  history.replaceState(previous, '', window.location.href);
  fireEvent(window, new PopStateEvent('popstate', { state: previous }));
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Select workflow' })).toHaveProperty(
      'value',
      'checkout',
    ),
  );
});
test('controlled location mode requests preserve the host view and do not commit history before acceptance', async () => {
  const changed = vi.fn();
  const controlled = { ...location, selection: undefined };
  const { rerender } = render(
    <ArazzoUIStandalone
      document={location.document}
      location={controlled}
      onLocationChange={changed}
    />,
  );
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  const before = window.location.href;
  fireEvent.click(screen.getByRole('button', { name: 'split' }));
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(2));
  expect(changed.mock.calls[1][0].view).toBe('split');
  expect(window.location.href).toBe(before);
  rerender(
    <ArazzoUIStandalone
      document={location.document}
      location={{ ...controlled, view: 'split' }}
      onLocationChange={changed}
    />,
  );
  await waitFor(() =>
    expect(readLocationURL(new URL(window.location.href)).location?.view).toBe('split'),
  );
  expect(changed).toHaveBeenCalledTimes(2);
});
