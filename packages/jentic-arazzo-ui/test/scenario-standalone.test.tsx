// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ArazzoUIStandalone } from '../src/ArazzoUIStandalone';
import { nestedCalls } from './fixtures/connected';
import { writeLocationURL } from '../src/utils/location/codec';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Element.prototype.scrollIntoView = vi.fn();
const point = {
  id: 'inspect',
  narrative: 'Read authored charge evidence.',
  location: {
    version: 1 as const,
    document: 'https://test/doc',
    root: 'payment',
    view: 'docs' as const,
    subview: 'docs' as const,
    selection: { kind: 'step' as const, workflowId: 'payment', stepId: 'charge' },
  },
};
const manifest = {
  version: 1,
  id: 'guide',
  scenarios: [
    {
      id: 'charge-guide',
      document: 'https://test/doc',
      workflow: 'payment',
      expected: 'Authored only.',
      evidence: 'No API execution.',
      waypoints: [point],
    },
  ],
};
test('loads only an explicitly supplied manifest and restores a fresh namespaced share link', async () => {
  const fetch = vi.fn(async () => ({
    ok: true,
    url: 'https://test/scenarios.json',
    json: async () => manifest,
  }));
  vi.stubGlobal('fetch', fetch);
  history.replaceState(
    {},
    '',
    writeLocationURL(
      `${globalThis.location.origin}/?scenarios=https%3A%2F%2Ftest%2Fscenarios.json`,
      {
        ...point.location,
        selection: undefined,
        extensions: {
          'arazzo.scenario': {
            manifest: 'guide',
            manifestURI: 'https://test/scenarios.json',
            scenarioId: 'charge-guide',
            waypointId: 'inspect',
          },
        },
      },
    ),
  );
  render(<ArazzoUIStandalone document={nestedCalls} documentIdentity="https://test/doc" />);
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  await waitFor(() => expect(panel.textContent).toContain('Read authored charge evidence.'));
  await screen.findByRole('region', { name: 'Selection details' });
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('replacement cancels obsolete manifest loading and valid new guides remain usable', async () => {
  history.replaceState({}, '', `${globalThis.location.origin}/`);
  let firstSignal: AbortSignal | undefined;
  let release: (value: unknown) => void = () => {};
  const fetch = vi.fn((uri: string, options: { signal: AbortSignal }) => {
    if (uri === 'https://test/old') {
      firstSignal = options.signal;
      return new Promise((resolve) => {
        release = resolve;
      });
    }
    return Promise.resolve({ ok: true, url: uri, json: async () => manifest });
  });
  vi.stubGlobal('fetch', fetch);
  render(<ArazzoUIStandalone document={nestedCalls} documentIdentity="https://test/doc" />);
  const input = await screen.findByRole('textbox', { name: 'Scenario manifest URL' });
  fireEvent.change(input, { target: { value: 'https://test/old' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load scenario manifest' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(input, { target: { value: 'https://test/new' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load scenario manifest' }));
  await screen.findByRole('button', { name: 'charge-guide' });
  expect(firstSignal?.aborted).toBe(true);
  release({ ok: true, url: 'https://test/old', json: async () => ({ version: 1, scenarios: [] }) });
  await waitFor(() => expect(screen.getByRole('button', { name: 'charge-guide' })).toBeTruthy());
});
test('leaving a guide cancels a pending document handoff and ignores its late result', async () => {
  history.replaceState({}, '', '/');
  let release: (value: any) => void = () => {};
  let signal: AbortSignal | undefined;
  const provider = {
    load: vi.fn((request: { signal?: AbortSignal }) => {
      signal = request.signal;
      return new Promise<any>((resolve) => {
        release = resolve;
      });
    }),
  };
  const remote = {
    version: 1 as const,
    id: 'remote-guide',
    scenarios: [
      {
        id: 'remote',
        document: 'https://test/remote',
        workflow: 'payment',
        expected: 'Authored.',
        evidence: 'Inspection only.',
        waypoints: [{ ...point, location: { ...point.location, document: 'https://test/remote' } }],
      },
    ],
  };
  render(
    <ArazzoUIStandalone
      document={nestedCalls}
      documentIdentity="https://test/doc"
      scenarioManifest={remote}
      sourceProvider={provider}
    />,
  );
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  fireEvent.click(within(panel).getByRole('button', { name: 'remote' }));
  await waitFor(() => expect(provider.load).toHaveBeenCalledTimes(1));
  fireEvent.click(within(panel).getByRole('button', { name: 'Leave guide' }));
  await waitFor(() => expect(signal?.aborted).toBe(true));
  release({
    content: { ...nestedCalls, info: { title: 'Obsolete document', version: '1' } },
    retrievalURI: 'https://test/remote',
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(screen.queryByText('Obsolete document')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Connected checkout' })).toBeTruthy();
});
test('controlled prose-only selection opens its declared workflow', async () => {
  history.replaceState({}, '', '/');
  render(
    <ArazzoUIStandalone
      document={nestedCalls}
      documentIdentity="https://test/doc"
      scenarioManifest={[
        {
          id: 'prose',
          document: 'https://test/doc',
          workflow: 'payment',
          expected: 'Read payment.',
          evidence: 'Authored.',
        },
      ]}
    />,
  );
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  fireEvent.click(within(panel).getByRole('button', { name: 'prose' }));
  await waitFor(() =>
    expect(
      (screen.getByRole('combobox', { name: 'Select workflow' }) as HTMLSelectElement).value,
    ).toBe('payment'),
  );
});
test('a rejected controlled selection cannot acquire or replace a document', async () => {
  history.replaceState({}, '', '/');
  const load = vi.fn(async () => ({ content: nestedCalls, retrievalURI: 'https://test/remote' }));
  const remote = {
    version: 1 as const,
    id: 'remote-guide',
    scenarios: [
      {
        id: 'remote',
        document: 'https://test/remote',
        workflow: 'payment',
        expected: 'Authored.',
        evidence: 'Inspection only.',
        waypoints: [{ ...point, location: { ...point.location, document: 'https://test/remote' } }],
      },
    ],
  };
  const changed = vi.fn();
  render(
    <ArazzoUIStandalone
      document={nestedCalls}
      documentIdentity="https://test/doc"
      scenarioManifest={remote}
      scenarioSelection={null}
      onScenarioSelectionChange={changed}
      sourceProvider={{ load }}
    />,
  );
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  fireEvent.click(within(panel).getByRole('button', { name: 'remote' }));
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect(load).not.toHaveBeenCalled();
});
test('a standalone host supplying the requested document preserves the guide and waypoint', async () => {
  history.replaceState({}, '', '/');
  const handoff = vi.fn();
  const remote = {
    version: 1 as const,
    id: 'remote-guide',
    scenarios: [
      {
        id: 'remote',
        document: 'https://test/remote',
        workflow: 'payment',
        expected: 'Authored.',
        evidence: 'Inspection only.',
        waypoints: [{ ...point, location: { ...point.location, document: 'https://test/remote' } }],
      },
    ],
  };
  const { rerender } = render(
    <ArazzoUIStandalone
      document={nestedCalls}
      documentIdentity="https://test/doc"
      scenarioManifest={remote}
      onScenarioLocationRequest={handoff}
    />,
  );
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  fireEvent.click(within(panel).getByRole('button', { name: 'remote' }));
  await waitFor(() => expect(handoff).toHaveBeenCalled());
  rerender(
    <ArazzoUIStandalone
      document={structuredClone(nestedCalls)}
      documentIdentity="https://test/remote"
      scenarioManifest={remote}
      onScenarioLocationRequest={handoff}
    />,
  );
  const details = await screen.findByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('payment.charge');
  expect(screen.getByRole('region', { name: 'Authored scenario guides' }).textContent).toContain(
    'Read authored charge evidence.',
  );
});
test('guide reconstruction retains the shared document digest check', async () => {
  const fetch = vi.fn(async () => ({
    ok: true,
    url: 'https://test/scenarios.json',
    json: async () => manifest,
  }));
  vi.stubGlobal('fetch', fetch);
  history.replaceState(
    {},
    '',
    writeLocationURL(new URL(globalThis.location.href), {
      ...point.location,
      selection: undefined,
      digest: 'sha256:' + '0'.repeat(64),
      extensions: {
        'arazzo.scenario': {
          manifest: 'guide',
          manifestURI: 'https://test/scenarios.json',
          scenarioId: 'charge-guide',
          waypointId: 'inspect',
        },
      },
    }),
  );
  render(<ArazzoUIStandalone document={nestedCalls} documentIdentity="https://test/doc" />);
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  await waitFor(() =>
    expect(
      screen
        .getAllByRole('status')
        .some((e) => e.textContent?.includes('Document revision mismatch')),
    ).toBe(true),
  );
  expect(panel.textContent).toContain('Read authored charge evidence.');
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
});
