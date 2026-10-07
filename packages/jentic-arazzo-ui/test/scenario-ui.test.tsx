// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { ArazzoUI } from '../src/ArazzoUI';
import { nestedCalls } from './fixtures/connected';
import type { ScenarioManifest } from '../src/types/scenario';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Element.prototype.scrollIntoView = vi.fn();
const manifest: ScenarioManifest = {
  version: 1,
  id: 'host:guide',
  scenarios: [
    {
      id: 'second-charge',
      document: 'host:doc',
      workflow: 'checkout',
      expected: 'Requires authored CAPTURED evidence.',
      evidence: 'Authored inspection, no execution.',
      assumptions: 'Assume UNKNOWN.',
      waypoints: [
        {
          id: 'second',
          narrative: 'Inspect the second payment occurrence.',
          location: {
            version: 1,
            document: 'host:doc',
            root: 'checkout',
            view: 'docs',
            subview: 'sequence',
            selection: {
              kind: 'step',
              workflowId: 'payment',
              stepId: 'charge',
              occurrence: [{ workflowId: 'checkout', stepId: 'secondPayment' }],
            },
          },
          focus: { kind: 'parameter', pointer: '/workflows/0/steps/2/parameters/0' },
        },
        {
          id: 'missing',
          narrative: 'An unavailable document.',
          location: {
            version: 1,
            document: 'host:other',
            root: 'checkout',
            view: 'docs',
            subview: 'docs',
          },
        },
      ],
    },
  ],
};
test('searches authored guides, opens exact occurrences, returns focus and leaves ordinary navigation usable', async () => {
  const request = vi.fn();
  const changed = vi.fn();
  const location = vi.fn();
  render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={manifest}
      onScenarioLocationRequest={request}
      onScenarioSelectionChange={changed}
      onLocationChange={location}
    />,
  );
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  expect(panel.textContent).toContain('Authored expectations');
  fireEvent.change(within(panel).getByRole('searchbox'), { target: { value: 'CAPTURED' } });
  fireEvent.click(within(panel).getByRole('button', { name: 'second-charge' }));
  expect(panel.textContent).toContain('Assume UNKNOWN.');
  expect(panel.textContent).toContain('Requires authored CAPTURED evidence.');
  const details = await screen.findByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('checkout.secondPayment');
  expect(details.textContent).toContain('Authored parameter focus');
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  await waitFor(() => expect(document.activeElement?.textContent).toContain('second-charge'));
  fireEvent.click(within(panel).getByRole('button', { name: 'Next waypoint' }));
  expect(request.mock.calls.at(-1)?.[0].document).toBe('host:other');
  expect(await within(panel).findByText(/Supply document host:other/)).toBeTruthy();
  fireEvent.click(within(panel).getByRole('button', { name: 'Previous waypoint' }));
  await screen.findByRole('region', { name: 'Selection details' });
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  fireEvent.click(within(panel).getByRole('button', { name: 'Leave guide' }));
  await waitFor(() => expect(changed.mock.calls.at(-1)?.[0]).toBeNull());
  await waitFor(() =>
    expect(location.mock.calls.at(-1)?.[0].extensions?.['arazzo.scenario']).toBeUndefined(),
  );
  expect(screen.getByRole('combobox', { name: 'Select workflow' })).toBeTruthy();
});
test('presents exact expected/evidence text for every legacy stress guide with no invented path', async () => {
  const entries = JSON.parse(readFileSync('test/fixtures/legacy-scenarios.json', 'utf8')).map(
    (s: any) => ({ ...s, waypoints: undefined }),
  );
  render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={entries}
      scenarioManifestURI="https://test/pack/scenarios.json"
    />,
  );
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  for (const entry of entries) {
    fireEvent.click(within(panel).getByRole('button', { name: entry.id }));
    expect(panel.textContent).toContain(entry.expected);
    expect(panel.textContent).toContain(entry.evidence);
    expect(panel.textContent).toContain('No authored waypoints');
  }
});
test('controlled selection requests changes without accepting them and stale waypoint IDs stay diagnostic', async () => {
  const changed = vi.fn();
  render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={manifest}
      scenarioSelection={{
        manifest: 'host:guide',
        scenarioId: 'second-charge',
        waypointId: 'removed',
      }}
      onScenarioSelectionChange={changed}
    />,
  );
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  expect(panel.textContent).toContain('Unavailable waypoint: removed');
  fireEvent.click(within(panel).getByRole('button', { name: 'Leave guide' }));
  expect(changed).toHaveBeenCalledWith(null);
  expect(panel.textContent).toContain('Unavailable waypoint: removed');
});
test('hands off missing documents to the host and restores after supply without fetching business APIs or mutating input', async () => {
  const requested = vi.fn();
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const before = JSON.stringify(nestedCalls);
  const remote = {
    ...manifest,
    scenarios: [
      {
        ...manifest.scenarios[0],
        waypoints: [
          {
            ...manifest.scenarios[0].waypoints![0],
            location: { ...manifest.scenarios[0].waypoints![0].location, document: 'host:remote' },
          },
        ],
      },
    ],
  };
  const { rerender } = render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={remote}
      onScenarioLocationRequest={requested}
    />,
  );
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  fireEvent.click(within(panel).getByRole('button', { name: 'second-charge' }));
  await waitFor(() => expect(requested).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
  rerender(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:remote"
      scenarioManifest={remote}
      onScenarioLocationRequest={requested}
    />,
  );
  const details = await screen.findByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('checkout.secondPayment');
  expect(fetch).not.toHaveBeenCalled();
  expect(JSON.stringify(nestedCalls)).toBe(before);
});
test('leaving a guide consumes its initial location rather than restoring or reentering it', async () => {
  const initial = manifest.scenarios[0].waypoints![0].location;
  const other = {
    ...manifest,
    scenarios: [
      {
        ...manifest.scenarios[0],
        waypoints: [
          {
            ...manifest.scenarios[0].waypoints![0],
            id: 'other',
            focus: undefined,
            location: {
              version: 1 as const,
              document: 'host:doc',
              root: 'payment',
              view: 'docs' as const,
              subview: 'docs' as const,
              selection: { kind: 'step' as const, workflowId: 'payment', stepId: 'charge' },
            },
          },
        ],
      },
    ],
  };
  render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={other}
      defaultLocation={{
        ...initial,
        extensions: {
          'arazzo.scenario': {
            manifest: 'host:guide',
            scenarioId: 'second-charge',
            waypointId: 'second',
          },
        },
      }}
    />,
  );
  await screen.findByRole('region', { name: 'Selection details' });
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  const panel = screen.getByRole('region', { name: 'Authored scenario guides' });
  fireEvent.click(within(panel).getByRole('button', { name: 'second-charge' }));
  await screen.findByRole('region', { name: 'Selection details' });
  await waitFor(() =>
    expect(
      (screen.getByRole('combobox', { name: 'Select workflow' }) as HTMLSelectElement).value,
    ).toBe('payment'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  fireEvent.click(within(panel).getByRole('button', { name: 'Leave guide' }));
  await waitFor(() =>
    expect(
      (screen.getByRole('combobox', { name: 'Select workflow' }) as HTMLSelectElement).value,
    ).toBe('payment'),
  );
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(panel.querySelector('.arazzo-scenario-current')).toBeNull();
  expect(
    (screen.getByRole('combobox', { name: 'Select workflow' }) as HTMLSelectElement).value,
  ).toBe('payment');
});
test('guide focus is absent when inspecting a different occurrence of the same authored step', async () => {
  render(
    <ArazzoUI document={nestedCalls} documentIdentity="host:doc" scenarioManifest={manifest} />,
  );
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  fireEvent.click(within(panel).getByRole('button', { name: 'second-charge' }));
  await screen.findByRole('region', { name: 'Selection details' });
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  const sequence = screen.getByRole('region', { name: 'Sequence checkout' });
  fireEvent.click(within(sequence).getByRole('button', { name: /Expand checkout.firstPayment/ }));
  fireEvent.click(
    within(sequence).getByRole('button', {
      name: /Inspect payment.charge .*checkout.firstPayment/,
    }),
  );
  const details = await screen.findByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('checkout.firstPayment');
  expect(details.querySelector('[aria-label="Authored guide focus"]')).toBeNull();
});
test('narrow guide dismissal returns to an enabled guide control when terminal Next becomes disabled', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  const first = manifest.scenarios[0].waypoints![0];
  const local = {
    ...manifest,
    scenarios: [
      {
        ...manifest.scenarios[0],
        waypoints: [first, { ...first, id: 'last', narrative: 'Final authored waypoint.' }],
      },
    ],
  };
  render(<ArazzoUI document={nestedCalls} documentIdentity="host:doc" scenarioManifest={local} />);
  const panel = await screen.findByRole('region', { name: 'Authored scenario guides' });
  const origin = within(panel).getByRole('button', { name: 'second-charge' });
  fireEvent.click(origin);
  await screen.findByRole('dialog', { name: 'Selection details' });
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(document.activeElement).toBe(origin);
  const next = within(panel).getByRole('button', { name: 'Next waypoint' });
  fireEvent.click(next);
  await screen.findByRole('dialog', { name: 'Selection details' });
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(document.querySelector('[inert]')).toBeNull();
  expect(document.activeElement).toBe(
    within(panel).getByRole('button', { name: 'Previous waypoint' }),
  );
});
