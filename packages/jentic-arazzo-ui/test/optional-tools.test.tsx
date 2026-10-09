// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArazzoUIStandalone } from '../src/ArazzoUIStandalone';
import { nestedCalls } from './fixtures/connected';
import { writeLocationURL } from '../src/utils/location/codec';

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => vi.unstubAllGlobals());

function setupURL() {
  history.replaceState({}, '', '/');
}

test('ordinary viewing keeps optional setup closed and disclosure itself acquires no sources', async () => {
  setupURL();
  const fetch = vi.fn();
  const load = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<ArazzoUIStandalone document={nestedCalls} sourceProvider={{ load }} />);
  await screen.findByRole('combobox', { name: 'Select workflow' });
  expect(screen.getByRole('textbox', { name: 'Arazzo document URL' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Upload Arazzo document' })).toBeTruthy();
  expect(screen.getByRole('searchbox', { name: 'Search workflows and steps' })).toBeTruthy();
  const summary = screen.getByText('Advanced tools');
  const disclosure = summary.closest('details')!;
  expect(disclosure.open).toBe(false);
  expect(screen.getByRole('textbox', { name: 'Scenario manifest URL' }).closest('details')).toBe(
    disclosure,
  );
  fireEvent.click(summary);
  await waitFor(() => expect(disclosure.open).toBe(true));
  expect(screen.getByRole('textbox', { name: 'Scenario manifest URL' })).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
});

test('a restored guide reveals its loading and failed status without another setup action', async () => {
  setupURL();
  let reject: (error: Error) => void = () => {};
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((_, failure) => {
          reject = failure;
        }),
    ),
  );
  history.replaceState(
    {},
    '',
    writeLocationURL(new URL(globalThis.location.href), {
      version: 1,
      document: 'https://test/doc',
      root: 'checkout',
      view: 'docs',
      subview: 'docs',
      extensions: {
        'arazzo.scenario': {
          manifest: 'guide',
          manifestURI: 'https://test/guide.json',
          scenarioId: 'read',
        },
      },
    }),
  );
  render(<ArazzoUIStandalone document={nestedCalls} documentIdentity="https://test/doc" />);
  const input = await screen.findByRole('textbox', { name: 'Scenario manifest URL' });
  const disclosure = input.closest('details')!;
  expect(disclosure.open).toBe(true);
  expect(screen.getByText('Loading authored scenario manifest…')).toBeTruthy();
  fireEvent.click(screen.getByText('Advanced tools'));
  await waitFor(() => expect(disclosure.open).toBe(false));
  reject(new Error('Shared guide unavailable'));
  await waitFor(() => expect(disclosure.open).toBe(true));
  expect(screen.getByText('Shared guide unavailable')).toBeTruthy();
  fireEvent.click(screen.getByText('Advanced tools'));
  await waitFor(() => expect(disclosure.open).toBe(false));
  fireEvent(window, new PopStateEvent('popstate', { state: history.state }));
  await waitFor(() => expect(disclosure.open).toBe(true));
});

test('a host-configured profile exposes its existing perspective switch inside Advanced tools', async () => {
  setupURL();
  render(
    <ArazzoUIStandalone
      document={nestedCalls}
      documentIdentity="host:doc"
      viewProfile={{
        version: 1,
        document: 'host:doc',
        participants: [
          {
            id: 'client',
            name: 'Client',
            provenance: { kind: 'host', description: 'Explicit client' },
          },
        ],
        actors: [
          {
            workflowId: 'checkout',
            participant: 'client',
            provenance: { kind: 'host', description: 'Explicit actor' },
          },
        ],
        sourceOwners: [],
        implementations: [],
        events: [],
      }}
    />,
  );
  const perspective = await screen.findByRole('combobox', { name: 'Perspective' });
  const disclosure = perspective.closest('details')!;
  expect(disclosure).toBeTruthy();
  expect(disclosure.open).toBe(true);
  expect(disclosure.querySelector('summary')?.textContent).toBe('Advanced tools');
  expect(screen.getAllByText('Advanced tools')).toHaveLength(1);
  fireEvent.change(perspective, { target: { value: 'systems' } });
  await screen.findByRole('region', { name: 'Systems checkout' });
});

test('covering details excludes advanced setup from background interaction and returns guide focus on Escape', async () => {
  setupURL();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  render(
    <ArazzoUIStandalone
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={{
        version: 1,
        id: 'guide',
        scenarios: [
          {
            id: 'inspect-charge',
            document: 'host:doc',
            workflow: 'payment',
            expected: 'Authored charge.',
            evidence: 'No observed execution.',
            waypoints: [
              {
                id: 'charge',
                narrative: 'Read the charge declaration.',
                location: {
                  version: 1,
                  document: 'host:doc',
                  root: 'payment',
                  view: 'docs',
                  subview: 'docs',
                  selection: { kind: 'step', workflowId: 'payment', stepId: 'charge' },
                },
              },
            ],
          },
        ],
      }}
    />,
  );
  const origin = await screen.findByRole('button', { name: 'inspect-charge' });
  fireEvent.click(origin);
  const dialog = await screen.findByRole('dialog', { name: 'Selection details' });
  const close = screen.getByRole('button', { name: 'Close details' });
  expect(document.activeElement).toBe(close);
  const advanced = screen.getByText('Advanced tools').closest('details')!;
  expect(advanced.hasAttribute('inert')).toBe(true);
  expect(advanced.getAttribute('aria-hidden')).toBe('true');
  const last = dialog.querySelector('details[data-advanced] > summary') as HTMLElement;
  last.focus();
  fireEvent.keyDown(last, { key: 'Tab' });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(last);
  const background = screen.getByLabelText('Arazzo document URL');
  background.focus();
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(close, { key: 'Escape' });
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Selection details' })).toBeNull(),
  );
  expect(document.querySelector('[inert]')).toBeNull();
  expect(document.activeElement).toBe(origin);
  expect(screen.getByRole('button', { name: 'Inspect waypoint details' })).toBeTruthy();
});
