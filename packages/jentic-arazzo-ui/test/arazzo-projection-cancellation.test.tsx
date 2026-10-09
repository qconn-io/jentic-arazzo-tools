// @vitest-environment jsdom
import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { SourceDocumentProvider, SourceDocumentContent } from '../src/types/source';
import { ArazzoViewerProvider } from '../src/context/ArazzoViewerContext';
import { useContractFacts } from '../src/context/ContractFactsContext';
import { createSnapshot } from '../src/utils/inspection';
import { consumerWorkflow } from './fixtures/upstream-readiness';

afterEach(cleanup);
const source = { name: 'remote', type: 'arazzo' as const, url: 'https://example.test/remote.json' };
function Probe({ onStarted }: { onStarted: (pending: Promise<void>) => void }) {
  const facts = useContractFacts();
  return (
    <>
      <button type="button" onClick={() => onStarted(facts.load(source, false))}>
        Load remote
      </button>
      <output aria-label="Source state">
        {facts.loaded.remote?.state ?? 'idle'}:
        {facts.loaded.remote?.workflowModel?.document.info.title ?? ''}
      </output>
    </>
  );
}

it.each(['document', 'provider', 'unmount'] as const)(
  'does not publish a late native dependency after %s replacement',
  async (replacement) => {
    let settle!: (content: SourceDocumentContent) => void;
    const requested: string[] = [];
    const provider: SourceDocumentProvider = {
      async load({ uri }) {
        requested.push(uri);
        if (uri === source.url) {
          const content = consumerWorkflow();
          content.workflows[1].inputs = { $ref: './slow.json' };
          return { retrievalURI: uri, content };
        }
        return new Promise<SourceDocumentContent>((resolve) => {
          settle = resolve;
        });
      },
    };
    const document = consumerWorkflow();
    document.sourceDescriptions = [source];
    const snapshot = createSnapshot(document, { baseURI: 'https://example.test/root.json' });
    let pending!: Promise<void>;
    const mount = (value = document, sourceProvider = provider) => (
      <ArazzoViewerProvider
        document={value}
        snapshot={value === document ? snapshot : createSnapshot(value)}
        sourceProvider={sourceProvider}
      >
        <Probe
          onStarted={(value) => {
            pending = value;
          }}
        />
      </ArazzoViewerProvider>
    );
    const view = render(mount());
    fireEvent.click(screen.getByRole('button', { name: 'Load remote' }));
    await vi.waitFor(() => expect(settle).toBeDefined());
    if (replacement === 'document')
      view.rerender(mount({ ...document, info: { title: 'Replacement', version: '1' } }));
    else if (replacement === 'provider')
      view.rerender(
        mount(document, {
          async load({ uri }) {
            return { retrievalURI: uri, content: consumerWorkflow() };
          },
        }),
      );
    else view.unmount();
    settle({
      retrievalURI: 'https://example.test/slow.json',
      content: { $ref: './must-not-load.json' },
    });
    await pending;
    await vi.waitFor(() => {
      if (replacement === 'unmount') expect(screen.queryByLabelText('Source state')).toBeNull();
      else expect(screen.getByLabelText('Source state').textContent).toBe('idle:');
    });
    expect(requested).toEqual([source.url, 'https://example.test/slow.json']);
  },
);
