// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArazzoUIStandalone } from '../src/ArazzoUIStandalone';
import { ArazzoUI } from '../src/ArazzoUI';
import * as documentLoader from '../src/utils/loading/loadDocument';
import { nestedCalls } from './fixtures/connected';
import { normalizeScenarioManifest } from '../src/utils/scenario/manifest';

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('guide help is associated, normalizes and acquires nothing until explicit example navigation', async () => {
  history.replaceState({}, '', '/?keep=value');
  const fetch = vi.fn(async () => ({ ok: false, status: 404 }));
  vi.stubGlobal('fetch', fetch);
  render(<ArazzoUIStandalone document={nestedCalls} />);
  await screen.findByRole('combobox', { name: 'Select workflow' });
  fireEvent.click(screen.getByText('Load guides from a URL'));
  const input = screen.getByRole('textbox', { name: 'Guide file URL' });
  const help = document.getElementById(input.getAttribute('aria-describedby')!);
  expect(help?.textContent).toContain('separate JSON document');
  fireEvent.click(screen.getByText('Guide file format'));
  const example = JSON.parse(screen.getByTestId('guide-format-example').textContent!);
  expect(
    normalizeScenarioManifest(example, 'https://test/guide.json').manifest?.scenarios,
  ).toHaveLength(1);
  expect(screen.getByText(/Legacy arrays/)).toBeTruthy();
  expect(screen.getByText('Reading a guide does not run the workflow.')).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Open guided example' }));
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  const url = new URL(location.href);
  expect(url.searchParams.get('document')).toContain('/examples/digital-product/arazzo.yaml');
  expect(url.searchParams.get('scenarios')).toContain('/examples/digital-product/scenarios.json');
  expect(url.searchParams.get('keep')).toBe('value');
  expect(
    (screen.getByRole('textbox', { name: 'Arazzo document URL' }) as HTMLInputElement).value,
  ).toBe(url.searchParams.get('document'));
});

test('supplied named and ID fallback guides are available while empty guides explain their state', async () => {
  const scenario = {
    id: 'fallback',
    document: 'host:doc',
    workflow: 'payment',
    expected: 'Authored',
    evidence: 'Inspection',
  };
  const { rerender } = render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={[scenario, { ...scenario, id: 'named', title: 'Payment reading' }]}
    />,
  );
  await screen.findByRole('button', { name: 'Payment reading' });
  expect(screen.getByRole('button', { name: 'fallback' }).closest('details')?.open).toBe(false);
  rerender(<ArazzoUI document={nestedCalls} documentIdentity="host:doc" scenarioManifest={[]} />);
  await screen.findByText('This guide file contains no walkthroughs.');
  expect(screen.getByRole('combobox', { name: 'Select workflow' })).toBeTruthy();
});

test('unconfigured Systems help is contextual and a stale supplied profile is separately diagnostic', async () => {
  const { rerender } = render(<ArazzoUI document={nestedCalls} documentIdentity="host:doc" />);
  await screen.findByText('Help and optional views');
  fireEvent.click(screen.getByText('Help and optional views'));
  expect(
    screen.getByText(/This document has no supplied system participant information/),
  ).toBeTruthy();
  expect(screen.queryByRole('combobox', { name: 'Perspective' })).toBeNull();
  rerender(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      viewProfile={{
        version: 1,
        document: 'stale:doc',
        participants: [],
        actors: [],
        sourceOwners: [],
        implementations: [],
        events: [],
      }}
    />,
  );
  await screen.findByText('Supplied system information has limitations.');
  expect(screen.getByText(/Profile version\/document\/revision/)).toBeTruthy();
  expect(
    screen.queryByText(/This document has no supplied system participant information/),
  ).toBeNull();
});

test('unavailable and malformed replacements retain valid guides and retry only the requested file', async () => {
  history.replaceState({}, '', '/');
  const valid = [
    {
      id: 'retained',
      document: 'host:doc',
      workflow: 'payment',
      expected: 'Read',
      evidence: 'Authored',
    },
  ];
  let content: unknown = valid;
  let unavailable = false;
  const fetch = vi.fn(async (url: string) => ({
    ok: !unavailable,
    status: 404,
    url,
    json: async () => content,
  }));
  vi.stubGlobal('fetch', fetch);
  render(<ArazzoUIStandalone document={nestedCalls} documentIdentity="host:doc" />);
  fireEvent.click(screen.getByText('Load guides from a URL'));
  const input = screen.getByRole('textbox', { name: 'Guide file URL' });
  fireEvent.change(input, { target: { value: 'https://test/good' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load guides' }));
  await screen.findByRole('button', { name: 'retained' });
  unavailable = true;
  fireEvent.change(input, { target: { value: 'https://test/bad' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load guides' }));
  await screen.findByText('Guide file unavailable (404).');
  expect(screen.getByRole('button', { name: 'retained' })).toBeTruthy();
  unavailable = false;
  content = { wrong: true };
  fireEvent.click(screen.getByRole('button', { name: 'Retry guide loading' }));
  await screen.findByText(/Malformed guide file:/);
  expect(screen.getByRole('button', { name: 'retained' })).toBeTruthy();
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    'https://test/good',
    'https://test/bad',
    'https://test/bad',
  ]);
});

test('controlled guide updates preserve ordinary reading and give mismatched document recovery', async () => {
  const guides = [
    {
      id: 'old',
      document: 'host:doc',
      workflow: 'payment',
      expected: 'Read',
      evidence: 'Authored',
    },
  ];
  const { rerender } = render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={guides}
      scenarioSelection={null}
    />,
  );
  await screen.findByRole('button', { name: 'old' });
  rerender(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:other"
      scenarioManifest={[{ ...guides[0], id: 'new' }]}
      scenarioManifestURI="host:guide"
      scenarioSelection={{ manifest: 'host:guide', scenarioId: 'new' }}
    />,
  );
  await screen.findByRole('button', { name: 'new' });
  expect(screen.queryByRole('button', { name: 'old' })).toBeNull();
  expect(screen.getByText(/This walkthrough refers to another document/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Return to workflow' })).toBeTruthy();
  expect(screen.getByRole('combobox', { name: 'Select workflow' })).toBeTruthy();
});

test('README schema example remains supported by the manifest normalizer', () => {
  const section = readFileSync('README.md', 'utf8').split('### Authored scenario guides')[1];
  const json = section.match(/```json\n([\s\S]*?)\n```/)![1];
  const result = normalizeScenarioManifest(
    JSON.parse(json),
    'https://test/examples/digital-product-stress/scenarios.json',
  );
  expect(result.diagnostics).toEqual([]);
  expect(result.manifest?.scenarios[0].waypoints).toHaveLength(1);
});

test('explicit guided example replaces supplied guides and later host updates regain authority', async () => {
  history.replaceState({}, '', '/');
  const host = [
    {
      id: 'host-guide',
      document: 'host:doc',
      workflow: 'payment',
      expected: 'Read',
      evidence: 'Authored',
    },
  ];
  const example = [
    { ...host[0], id: 'example-guide', document: 'arazzo.yaml', workflow: 'client-journey' },
  ];
  const changed = vi.fn();
  const fetch = vi.fn(async (url: string) => ({
    ok: true,
    url,
    json: async () => example,
    text: async () => JSON.stringify(nestedCalls),
  }));
  vi.stubGlobal('fetch', fetch);
  const { rerender } = render(
    <ArazzoUIStandalone
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={host}
      scenarioSelection={null}
      onScenarioSelectionChange={changed}
    />,
  );
  await screen.findByRole('button', { name: 'host-guide' });
  // top-level URL parsing uses Axios; keep the real parser but substitute its document acquisition seam.
  const loadDocument = documentLoader.loadDocument;
  vi.spyOn(documentLoader, 'loadDocument').mockImplementation((input, options) =>
    loadDocument(
      typeof input === 'string' && input.startsWith('http') ? nestedCalls : input,
      options,
    ),
  );
  fireEvent.click(screen.getByText('Load guides from a URL'));
  fireEvent.click(screen.getByText('Guide file format'));
  fireEvent.click(screen.getByRole('button', { name: 'Open guided example' }));
  await screen.findByRole('button', { name: 'example-guide' });
  expect(
    fetch.mock.calls.some(([url]) => url.endsWith('/examples/digital-product/scenarios.json')),
  ).toBe(true);
  expect(screen.queryByRole('button', { name: 'host-guide' })).toBeNull();
  expect(changed).toHaveBeenCalledWith(null);
  rerender(
    <ArazzoUIStandalone
      document={nestedCalls}
      documentIdentity="host:doc"
      scenarioManifest={[{ ...host[0], id: 'host-update' }]}
      scenarioSelection={null}
      onScenarioSelectionChange={changed}
    />,
  );
  await screen.findByRole('button', { name: 'host-update' });
  expect(screen.queryByRole('button', { name: 'example-guide' })).toBeNull();
});
