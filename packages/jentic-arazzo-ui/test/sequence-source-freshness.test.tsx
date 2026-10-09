// @vitest-environment jsdom
import React from 'react';
import { expect, test } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ArazzoViewerProvider, useArazzoViewer } from '../src/context/ArazzoViewerContext';
import { SourceRevisionContext } from '../src/context/SourceRevisionContext';
import { ContractPanel } from '../src/components/ContractPanel';
import { SequenceView } from '../src/components/SequenceView';
import type { ArazzoDocument } from '../src/types/arazzo';
import type { SourceDocumentContent, SourceDocumentProvider } from '../src/types/source';

const doc: ArazzoDocument = {
  arazzo: '1.1.0',
  info: { title: 'Freshness', version: '1' },
  sourceDescriptions: ['a', 'b'].map((name) => ({
    name,
    type: 'openapi',
    url: `https://example.test/${name}`,
  })),
  workflows: [{ workflowId: 'root', steps: [{ stepId: 'run', operationId: 'run' }] }],
};
function api(id: string, shared = false) {
  return {
    openapi: '3.1.0',
    paths: {
      '/run': {
        get: {
          operationId: id,
          responses: {
            '200': shared ? { $ref: './shared#/Response' } : { description: 'Authored only' },
          },
        },
      },
    },
  };
}
function ReloadDependency() {
  const { sourceRegistry } = useArazzoViewer();
  const revisions = React.useContext(SourceRevisionContext);
  return (
    <>
      <button onClick={() => sourceRegistry.reload('https://example.test/a', revisions.a)}>
        Invalidate pinned source
      </button>
      <button onClick={() => sourceRegistry.reload('https://example.test/shared')}>
        Reload dependency
      </button>
    </>
  );
}
function mount(provider: SourceDocumentProvider, revision?: string, input = doc) {
  return (
    <SourceRevisionContext.Provider value={revision ? { a: revision, b: revision } : {}}>
      <ArazzoViewerProvider document={input} sourceProvider={provider}>
        <SequenceView workflowId="root" />
        <ContractPanel workflowId="root" stepId="run" />
        <ReloadDependency />
      </ArazzoViewerProvider>
    </SourceRevisionContext.Provider>
  );
}
const participants = () => screen.getByLabelText('Sequence participants').textContent ?? '';
async function checkAll() {
  for (const name of ['a', 'b']) {
    fireEvent.click(screen.getByRole('button', { name: `Load API description ${name}` }));
    await waitFor(() =>
      expect(
        within(screen.getByRole('region', { name: `Source ${name}` })).getByText(
          'Source state: success',
        ),
      ).toBeTruthy(),
    );
  }
  await screen.findByText('located');
  expect(participants()).not.toContain('Ambiguous destination');
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('dependency invalidation removes a unique destination before any replacement response', async () => {
  const provider: SourceDocumentProvider = {
    load: async ({ uri }) => ({
      retrievalURI: uri,
      content: uri.endsWith('/shared')
        ? { Response: { description: 'Dependency' } }
        : api(uri.endsWith('/a') ? 'run' : 'other', true),
    }),
  };
  render(mount(provider));
  await checkAll();
  fireEvent.click(screen.getByRole('button', { name: 'Reload dependency' }));
  expect(participants()).toContain('Ambiguous destination');
  expect(screen.queryByText('Operation Details')).toBeNull();
});

test('same-URI revision replacement excludes the old destination immediately and requires both current pins', async () => {
  const provider: SourceDocumentProvider = {
    load: async ({ uri, revision }) => ({
      retrievalURI: uri,
      revision,
      content: api(uri.endsWith('/a') === (revision === 'r1') ? 'run' : 'other'),
    }),
  };
  const { rerender } = render(mount(provider, 'r1'));
  await checkAll();
  expect(screen.getByText(/Destination source:/).textContent).toBe('Destination source: a');
  rerender(mount(provider, 'r2'));
  expect(participants()).toContain('Ambiguous destination');
  expect(screen.queryByText('Operation Details')).toBeNull();
  await checkAll();
  expect(screen.getByText(/Destination source:/).textContent).toBe('Destination source: b');
});

test('reload removes old evidence while pending and disappearance or duplication never promotes a stale match', async () => {
  let next: ReturnType<typeof deferred<SourceDocumentContent>> | undefined;
  const provider: SourceDocumentProvider = {
    load: async ({ uri }) =>
      next?.promise ?? { retrievalURI: uri, content: api(uri.endsWith('/a') ? 'run' : 'other') },
  };
  render(mount(provider));
  await checkAll();
  next = deferred<SourceDocumentContent>();
  fireEvent.click(screen.getByRole('button', { name: 'Reload API description a' }));
  expect(participants()).toContain('Ambiguous destination');
  await act(async () =>
    next!.resolve({ retrievalURI: 'https://example.test/a', content: api('other') }),
  );
  await screen.findByText('missing');
  expect(participants()).toContain('Ambiguous destination');
  next = deferred<SourceDocumentContent>();
  fireEvent.click(screen.getByRole('button', { name: 'Reload API description a' }));
  await act(async () =>
    next!.resolve({ retrievalURI: 'https://example.test/a', content: api('run') }),
  );
  await screen.findByText('located');
  next = deferred<SourceDocumentContent>();
  fireEvent.click(screen.getByRole('button', { name: 'Reload API description b' }));
  expect(participants()).toContain('Ambiguous destination');
  await act(async () =>
    next!.resolve({ retrievalURI: 'https://example.test/b', content: api('run') }),
  );
  await screen.findByText('ambiguous');
  expect(participants()).toContain('Ambiguous destination');
});

test.each(['provider', 'document'] as const)(
  '%s replacement excludes late completion from old scope',
  async (kind) => {
    const pending = deferred<SourceDocumentContent>();
    let delay = false;
    const old: SourceDocumentProvider = {
      load: async ({ uri }) =>
        delay
          ? pending.promise
          : { retrievalURI: uri, content: api(uri.endsWith('/a') ? 'run' : 'other') },
    };
    const replacement: SourceDocumentProvider = {
      load: async ({ uri }) => ({ retrievalURI: uri, content: api('other') }),
    };
    const { rerender } = render(mount(old));
    await checkAll();
    delay = true;
    fireEvent.click(screen.getByRole('button', { name: 'Reload API description a' }));
    rerender(
      mount(
        kind === 'provider' ? replacement : old,
        undefined,
        kind === 'document' ? structuredClone(doc) : doc,
      ),
    );
    expect(participants()).toContain('Ambiguous destination');
    await act(async () =>
      pending.resolve({ retrievalURI: 'https://example.test/a', content: api('run') }),
    );
    expect(participants()).toContain('Ambiguous destination');
    expect(screen.queryByText('Operation Details')).toBeNull();
  },
);

test('a new pin after unpinned acquisition retains its own invalidation identity', async () => {
  const provider: SourceDocumentProvider = {
    load: async ({ uri, revision }) => ({
      retrievalURI: uri,
      revision,
      content: api(uri.endsWith('/a') ? 'run' : 'other'),
    }),
  };
  const { rerender } = render(mount(provider));
  await checkAll();
  rerender(mount(provider, 'r2'));
  await checkAll();
  fireEvent.click(screen.getByRole('button', { name: 'Invalidate pinned source' }));
  expect(participants()).toContain('Ambiguous destination');
  expect(screen.queryByText('Operation Details')).toBeNull();
});
