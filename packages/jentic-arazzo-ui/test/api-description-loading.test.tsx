// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArazzoViewerProvider } from '../src/context/ArazzoViewerContext';
import { useContractFacts } from '../src/context/ContractFactsContext';
import { InspectionStatus } from '../src/components/InspectionStatus';
import { createSnapshot } from '../src/utils/inspection';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { resolveStepOperation } from '../src/utils/contract/stepOperation';
import type { ArazzoDocument } from '../src/types/arazzo';
import type {
  SourceDocumentProvider,
  SourceDocumentContent,
  SourceDocumentRequest,
} from '../src/types/source';

const document: ArazzoDocument = {
  arazzo: '1.0.1',
  info: { title: 'Loading', version: '1' },
  sourceDescriptions: [{ name: 'api', type: 'openapi', url: './api.yaml' }],
  workflows: [{ workflowId: 'root', steps: [{ stepId: 'call', operationId: 'run' }] }],
};
const contract = { openapi: '3.1.0', paths: { '/run': { get: { operationId: 'run' } } } };
function Facts() {
  const { loaded, load } = useContractFacts();
  return (
    <>
      <output>
        {Object.entries(loaded)
          .map(([name, value]) => `${name}:${value.state}`)
          .join(',')}
      </output>
      <button onClick={() => void load(document.sourceDescriptions![0], false)}>Overlap</button>
    </>
  );
}
const snapshots = new WeakMap<ArazzoDocument, ReturnType<typeof createSnapshot>>();
function viewer(
  doc = document,
  provider?: SourceDocumentProvider,
  policy: 'manual' | 'automatic' = 'automatic',
) {
  if (!snapshots.has(doc))
    snapshots.set(doc, createSnapshot(doc, { baseURI: 'https://test/workflow.yaml' }));
  return (
    <StrictMode>
      <ArazzoViewerProvider
        document={doc}
        snapshot={snapshots.get(doc)}
        sourceProvider={provider}
        apiDescriptionLoading={policy}
      >
        <InspectionStatus />
        <Facts />
      </ArazzoViewerProvider>
    </StrictMode>
  );
}
test('automatic starts once after authority readiness and shares pending explicit loads', async () => {
  let release!: () => void;
  const load = vi.fn(
    () =>
      new Promise<{ content: object; retrievalURI: string }>((resolve) => {
        release = () => resolve({ content: contract, retrievalURI: 'https://test/api.yaml' });
      }),
  );
  const provider = { load };
  const { rerender } = render(viewer(document, provider));
  await screen.findByText('api:loading');
  fireEvent.click(screen.getByText('Overlap'));
  rerender(viewer(document, provider));
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => release());
  await screen.findByText('api:success');
  expect(load).toHaveBeenCalledTimes(1);
});
test('failed attempts settle until source-specific retry; manual bulk is idempotent', async () => {
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error('Denied'))
    .mockResolvedValue({ content: contract, retrievalURI: 'https://test/api.yaml' });
  const provider = { load };
  const { rerender } = render(viewer(document, provider));
  await screen.findByText('api:error');
  rerender(viewer(document, provider));
  fireEvent.click(screen.getByText('Overlap'));
  expect(load).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Retry API description api' }));
  await screen.findByText('api:success');
  expect(load).toHaveBeenCalledTimes(2);
});
test('duplicate names and incompatible kinds are visible without first-match acquisition', async () => {
  const doc: ArazzoDocument = {
    ...document,
    sourceDescriptions: [
      { name: 'api', type: 'openapi', url: 'https://test/a' },
      { name: 'api', type: 'openapi', url: 'https://test/b' },
      { name: 'async', type: 'asyncapi', url: 'https://test/c' },
      { name: 'other', type: undefined, url: 'https://test/d' },
      { name: 'external', type: 'arazzo', url: 'https://test/e' },
    ],
  };
  const load = vi.fn();
  render(viewer(doc, { load }));
  await act(async () => {});
  expect(load).not.toHaveBeenCalled();
  expect(screen.getAllByText(/Duplicate source name/)).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Load API description api' })).toBeNull();
});
test('untouched digital-product projects all four descriptions and six operations without selection', async () => {
  const base = `${process.cwd()}/public/examples/digital-product/`;
  const primary = await loadDocument(readFileSync(`${base}arazzo.yaml`, 'utf8'), {
    baseURI: 'https://test/arazzo.yaml',
  });
  const load = vi.fn(async ({ uri }: { uri: string }) => ({
    content: readFileSync(`${base}${new URL(uri).pathname.slice(1)}`, 'utf8'),
    retrievalURI: uri,
  }));
  let facts: ReturnType<typeof useContractFacts>['loaded'] = {};
  function Capture() {
    facts = useContractFacts().loaded;
    return <Facts />;
  }
  render(
    <ArazzoViewerProvider
      document={primary.document}
      snapshot={primary.snapshot}
      sourceProvider={{ load }}
      apiDescriptionLoading="automatic"
    >
      <Capture />
    </ArazzoViewerProvider>,
  );
  await waitFor(
    () =>
      expect(Object.values(facts).filter((v) => v.facts?.dialect === 'openapi')).toHaveLength(4),
    { timeout: 10000 },
  );
  const model = (await import('../src/utils/model/viewerModel')).buildViewerModel(
    (await import('../src/utils/inspection')).inspect(primary.snapshot),
  );
  const operations = model.workflows
    .flatMap((w) => w.steps)
    .filter((s) => s.sourceBinding?.locators.operationId);
  expect(operations).toHaveLength(6);
  expect(operations.map((s) => resolveStepOperation(model, s, facts).status)).toEqual(
    Array(6).fill('located'),
  );
  expect(load).toHaveBeenCalledTimes(4);
});

test('manual bulk loads only unattempted eligible APIs and keeps focus in source context', async () => {
  const load = vi.fn(async ({ uri }: { uri: string }) => ({
    content: contract,
    retrievalURI: uri,
  }));
  render(viewer(document, { load }, 'manual'));
  expect(load).not.toHaveBeenCalled();
  const bulk = screen.getByRole('button', { name: 'Load API descriptions' });
  fireEvent.click(bulk);
  await screen.findByText('api:success');
  expect(screen.queryByRole('button', { name: 'Load API descriptions' })).toBeNull();
  expect(load).toHaveBeenCalledTimes(1);
});
test('policy change permits authorized work to settle; provider replacement excludes old results', async () => {
  let release!: () => void;
  let signal: AbortSignal | undefined;
  const provider: SourceDocumentProvider = {
    load: (request) => {
      signal = request.signal;
      return new Promise((resolve) => {
        release = () => resolve({ content: contract, retrievalURI: request.uri, revision: 'old' });
      });
    },
  };
  const { rerender } = render(viewer(document, provider));
  await screen.findByText('api:loading');
  rerender(viewer(document, provider, 'manual'));
  await act(async () => release());
  await screen.findByText('api:success');
  expect(signal?.aborted).toBe(false);
  const next = {
    load: vi.fn(async ({ uri }: { uri: string }) => ({
      content: { openapi: '2.0' },
      retrievalURI: uri,
      revision: 'new',
    })),
  };
  rerender(viewer(document, next));
  await waitFor(() => expect(screen.getByText('Unsupported')).toBeTruthy());
  expect(screen.queryByText('old')).toBeNull();
});
test('replacement and unmount abort delayed work without publishing old facts', async () => {
  let release!: () => void;
  let signal: AbortSignal | undefined;
  const load = vi.fn((request: SourceDocumentRequest) => {
    signal = request.signal;
    return new Promise<SourceDocumentContent>((resolve) => {
      release = () => resolve({ content: contract, retrievalURI: request.uri });
    });
  });
  const provider = { load };
  const { rerender, unmount } = render(viewer(document, provider));
  await screen.findByText('api:loading');
  const oldSignal = signal;
  const replacement = { ...document, sourceDescriptions: [] };
  rerender(viewer(replacement, provider));
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => release());
  expect(screen.queryByText('api:success')).toBeNull();
  rerender(viewer(document, provider));
  await screen.findByText('api:loading');
  unmount();
  expect(signal?.aborted).toBe(true);
});
test('relative source without base and provider denial settle without browser fallback', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  const load = vi.fn(async () => {
    throw new Error('Authority denied');
  });
  render(
    <ArazzoViewerProvider
      document={document}
      sourceProvider={{ load }}
      apiDescriptionLoading="automatic"
    >
      <InspectionStatus />
      <Facts />
    </ArazzoViewerProvider>,
  );
  await screen.findByText('api:error');
  expect(load).not.toHaveBeenCalled();
  expect(screen.getByText(/Relative URI provided without/)).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
test('AsyncAPI is eligible only under 1.1 and external/primary references remain explicit', async () => {
  const doc: ArazzoDocument = {
    ...document,
    arazzo: '1.1.0',
    sourceDescriptions: [
      { name: 'events', type: 'asyncapi', url: 'https://test/events' },
      { name: 'remote', type: 'arazzo', url: 'https://test/remote' },
    ],
    workflows: [{ workflowId: 'root', inputs: { $ref: 'https://test/primary-schema' }, steps: [] }],
  };
  const load = vi.fn(async ({ uri }: { uri: string }) => ({
    content: { asyncapi: '3.0.0', channels: {}, operations: {} },
    retrievalURI: uri,
  }));
  render(viewer(doc, { load }));
  await screen.findByText('events:success');
  expect(load.mock.calls.map(([request]) => request.uri)).toEqual(['https://test/events']);
});

test.each(['1.2.0', '2.0.0'])(
  'unsupported Arazzo %s does not authorize acquisition',
  async (arazzo) => {
    const load = vi.fn();
    render(viewer({ ...document, arazzo }, { load }));
    await act(async () => {});
    expect(load).not.toHaveBeenCalled();
    expect(screen.getByText('Unsupported')).toBeTruthy();
  },
);
test('registry budgets settle excess declarations without retrying or blocking reading', async () => {
  const sources = Array.from({ length: 34 }, (_, index) => ({
    name: `api${index}`,
    type: 'openapi' as const,
    url: `https://test/api${index}`,
  }));
  const doc = { ...document, sourceDescriptions: sources };
  const load = vi.fn(async ({ uri }: { uri: string }) => ({
    content: contract,
    retrievalURI: uri,
  }));
  const provider = { load };
  const { rerender } = render(viewer(doc, provider));
  await screen.findByText(/32 of 34 loaded · 2 failed/, {}, { timeout: 10000 });
  rerender(viewer(doc, provider));
  await act(async () => {});
  expect(load).toHaveBeenCalledTimes(32);
  expect(screen.getAllByRole('button', { name: /^Retry API description/ })).toHaveLength(2);
});

test('revision pin replacement cancels the old pin and publishes only new provenance', async () => {
  const { SourceRevisionContext } = await import('../src/context/SourceRevisionContext');
  let release!: () => void;
  let oldSignal: AbortSignal | undefined;
  const provider: SourceDocumentProvider = {
    load: (request) => {
      if (request.revision === 'old') {
        oldSignal = request.signal;
        return new Promise((resolve) => {
          release = () =>
            resolve({ content: contract, retrievalURI: request.uri, revision: 'old' });
        });
      }
      return Promise.resolve({
        content: contract,
        retrievalURI: request.uri,
        revision: request.revision,
      });
    },
  };
  const node = (pin: string) => (
    <SourceRevisionContext.Provider value={{ api: pin }}>
      {viewer(document, provider)}
    </SourceRevisionContext.Provider>
  );
  const { rerender } = render(node('old'));
  await screen.findByText('api:loading');
  rerender(node('new'));
  await screen.findByText('api:success');
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => release());
  expect(screen.queryByText('old')).toBeNull();
  expect(screen.getByText('new')).toBeTruthy();
});

test.each([
  [{ openapi: '9.0.0' }, 'Unsupported'],
  ['[ malformed', 'Failed'],
])('acquired bytes remain distinct from supported loaded descriptions', async (content, status) => {
  render(
    viewer(document, {
      load: async ({ uri }) => ({ content, retrievalURI: uri, revision: 'bytes' }),
    }),
  );
  await screen.findByText(status);
  expect(screen.getByText('bytes')).toBeTruthy();
  expect(screen.getByText(/^API descriptions ·/).textContent).toContain('0 of 1 loaded');
});
test('unsupported relative base does not authorize a guessed request', async () => {
  const load = vi.fn();
  render(
    <ArazzoViewerProvider
      document={document}
      snapshot={createSnapshot(document, { baseURI: 'urn:workflow' })}
      sourceProvider={{ load }}
      apiDescriptionLoading="automatic"
    >
      <InspectionStatus />
      <Facts />
    </ArazzoViewerProvider>,
  );
  await screen.findByText('api:error');
  expect(load).not.toHaveBeenCalled();
});

test('explicit source feedback is stable, local and stops following later actions', async () => {
  const { SourceDescriptions } = await import('../src/components/SourceDescriptions');
  const { within } = await import('@testing-library/react');
  let settle!: (content: object) => void;
  const load = vi.fn(
    (request: SourceDocumentRequest) =>
      new Promise<SourceDocumentContent>((resolve) => {
        settle = (content) => resolve({ content, retrievalURI: request.uri });
      }),
  );
  const provider = { load };
  const node = () => (
    <ArazzoViewerProvider
      document={document}
      snapshot={snapshots.get(document)}
      sourceProvider={provider}
      apiDescriptionLoading="manual"
    >
      <SourceDescriptions />
      <SourceDescriptions />
    </ArazzoViewerProvider>
  );
  const { container, rerender } = render(node());
  const copies = container.querySelectorAll('.arazzo-source-descriptions');
  const first = within(copies[0] as HTMLElement);
  const second = within(copies[1] as HTMLElement);
  const live = first.getByRole('status', { name: 'Source action result' });
  expect(live.getAttribute('aria-live')).toBe('polite');
  expect(live.getAttribute('aria-atomic')).toBe('true');
  expect(live.textContent).toBe('');
  const button = first.getByRole('button', { name: 'Load API description api' });
  button.focus();
  fireEvent.click(button);
  expect(live.textContent).toBe('api: Loading.');
  expect(second.getByRole('status', { name: 'Source action result' }).textContent).toBe('');
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  await act(async () => settle(contract));
  await waitFor(() => expect(live.textContent).toBe('api: Loaded.'));
  expect(globalThis.document.activeElement).toBe(copies[0].querySelector('section'));
  rerender(node());
  expect(first.getByRole('status', { name: 'Source action result' })).toBe(live);
  fireEvent.click(second.getByRole('button', { name: 'Reload API description api' }));
  expect(live.textContent).toBe('api: Loaded.');
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  await act(async () => settle({ openapi: '9.0.0' }));
  await waitFor(() =>
    expect(second.getByRole('status', { name: 'Source action result' }).textContent).toContain(
      'Unsupported',
    ),
  );
  expect(live.textContent).toBe('api: Loaded.');
  expect(load).toHaveBeenCalledTimes(2);
});

test('manual batch reports mixed results once and background copies stay silent', async () => {
  const { SourceDescriptions } = await import('../src/components/SourceDescriptions');
  const doc = {
    ...document,
    sourceDescriptions: ['good', 'bad', 'unsupported'].map((name) => ({
      name,
      type: 'openapi' as const,
      url: `https://test/${name}`,
    })),
  };
  const load = vi.fn(async ({ uri }: SourceDocumentRequest) => {
    if (uri.endsWith('/bad')) throw new Error('raw secret failure');
    return { content: uri.endsWith('/good') ? contract : { openapi: '9.0.0' }, retrievalURI: uri };
  });
  render(
    <ArazzoViewerProvider document={doc} sourceProvider={{ load }} apiDescriptionLoading="manual">
      <SourceDescriptions />
      <SourceDescriptions />
    </ArazzoViewerProvider>,
  );
  const regions = screen.getAllByRole('status', { name: 'API description batch result' });
  fireEvent.click(screen.getAllByRole('button', { name: 'Load API descriptions' })[0]);
  expect(regions[0].textContent).toBe(
    'API descriptions: 3 loading, 0 loaded, 0 failed, 0 unsupported.',
  );
  await waitFor(() =>
    expect(regions[0].textContent).toBe(
      'API descriptions: 0 loading, 1 loaded, 1 failed, 1 unsupported.',
    ),
  );
  expect(regions[1].textContent).toBe('');
  expect(
    screen
      .getAllByRole('status', { name: 'Source action result' })
      .every((node) => !node.textContent),
  ).toBe(true);
  fireEvent.click(screen.getAllByRole('button', { name: 'Retry API description bad' })[1]);
  await waitFor(() =>
    expect(
      screen.getAllByRole('status', { name: 'Source action result' })[4].textContent,
    ).toContain('Failed'),
  );
  expect(
    screen.getAllByRole('status', { name: 'Source action result' })[4].textContent,
  ).not.toContain('raw secret');
  expect(regions[0].textContent).toBe(
    'API descriptions: 0 loading, 1 loaded, 1 failed, 1 unsupported.',
  );
});

test.each(['document', 'provider', 'revision'] as const)(
  'replacement of %s clears explicit pending and retained feedback',
  async (replacement) => {
    const { SourceDescriptions } = await import('../src/components/SourceDescriptions');
    const { SourceRevisionContext } = await import('../src/context/SourceRevisionContext');
    let settle!: () => void;
    const provider = {
      load: vi.fn(
        (request: SourceDocumentRequest) =>
          new Promise<SourceDocumentContent>((resolve) => {
            settle = () =>
              resolve({ content: contract, retrievalURI: request.uri, revision: request.revision });
          }),
      ),
    };
    const nextProvider = {
      load: vi.fn(async ({ uri, revision }: SourceDocumentRequest) => ({
        content: contract,
        retrievalURI: uri,
        revision,
      })),
    };
    const nextDocument = { ...document, info: { title: 'Replacement', version: '2' } };
    const oldSnapshot = createSnapshot(document, { baseURI: 'https://test/workflow.yaml' });
    const newSnapshot = createSnapshot(nextDocument, { baseURI: 'https://test/workflow.yaml' });
    const node = (changed: boolean) => (
      <SourceRevisionContext.Provider
        value={{ api: changed && replacement === 'revision' ? 'new' : 'old' }}
      >
        <ArazzoViewerProvider
          document={changed && replacement === 'document' ? nextDocument : document}
          snapshot={changed && replacement === 'document' ? newSnapshot : oldSnapshot}
          sourceProvider={changed && replacement === 'provider' ? nextProvider : provider}
          apiDescriptionLoading="manual"
        >
          <SourceDescriptions />
        </ArazzoViewerProvider>
      </SourceRevisionContext.Provider>
    );
    const { rerender, unmount } = render(node(false));
    fireEvent.click(screen.getByRole('button', { name: 'Load API description api' }));
    await waitFor(() => expect(provider.load).toHaveBeenCalledTimes(1));
    rerender(node(true));
    await act(async () => settle());
    expect(screen.getByRole('status', { name: 'Source action result' }).textContent).toBe('');
    expect(screen.getByRole('status', { name: 'API description batch result' }).textContent).toBe(
      '',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load API descriptions' }));
    if (replacement !== 'provider') {
      await waitFor(() => expect(provider.load).toHaveBeenCalledTimes(2));
      await act(async () => settle());
    }
    await waitFor(() =>
      expect(
        screen.getByRole('status', { name: 'API description batch result' }).textContent,
      ).toContain('1 loaded'),
    );
    rerender(node(false));
    expect(screen.getByRole('status', { name: 'API description batch result' }).textContent).toBe(
      '',
    );
    unmount();
    expect(nextProvider.load).toHaveBeenCalledTimes(replacement === 'provider' ? 1 : 0);
  },
);

test('background results are silent and the status meaning precedes source entries', async () => {
  const { container } = render(
    viewer(document, { load: async ({ uri }) => ({ content: contract, retrievalURI: uri }) }),
  );
  await screen.findByText('api:success');
  expect(
    screen
      .getAllByRole('status', { name: /action result|batch result/ })
      .every((node) => !node.textContent),
  ).toBe(true);
  const meaning = container.querySelector('.arazzo-source-meaning')!;
  expect(meaning.textContent).toContain('Neither establishes schema validation or execution');
  expect(
    meaning.compareDocumentPosition(container.querySelector('.arazzo-source-description')!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test('unmounting an explicit action aborts work and a new surface does not replay it', async () => {
  let release!: () => void;
  let signal: AbortSignal | undefined;
  const provider = {
    load: vi.fn((request: SourceDocumentRequest) => {
      signal = request.signal;
      return new Promise<SourceDocumentContent>((resolve) => {
        release = () => resolve({ content: contract, retrievalURI: request.uri });
      });
    }),
  };
  const first = render(viewer(document, provider, 'manual'));
  fireEvent.click(screen.getByRole('button', { name: 'Load API description api' }));
  await screen.findByText('api:loading');
  await waitFor(() => expect(provider.load).toHaveBeenCalledTimes(1));
  first.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => release());
  render(viewer(document, provider, 'manual'));
  expect(
    screen
      .getAllByRole('status', { name: /action result|batch result/ })
      .every((node) => !node.textContent),
  ).toBe(true);
  expect(provider.load).toHaveBeenCalledTimes(1);
});
