// @vitest-environment jsdom
import React from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ArazzoUIProps } from '../src/types/viewer';
import type { SourceDocumentContent } from '../src/types/source';
import type { ArazzoDocument } from '../src/types/arazzo';
import { ArazzoUIStandalone } from '../src/ArazzoUIStandalone';

vi.mock('../src/ArazzoUI', () => ({
  ArazzoUI: (props: ArazzoUIProps) => (
    <div>
      <output data-testid="source-props">
        {JSON.stringify({
          document: props.document,
          base: props.baseURI,
          identity: props.documentIdentity,
          revision: props.documentRevision,
          root: props.activeWorkflowId,
        })}
      </output>
      <button
        onClick={() =>
          props.onExternalNavigation?.({
            documentUri: 'https://external.test/flow.yaml',
            revision: 'r1',
            workflowId: 'child',
          })
        }
      >
        Navigate external
      </button>
    </div>
  ),
}));
const document: ArazzoDocument = {
  arazzo: '1.0.1',
  info: { title: 'Primary', version: '1' },
  sourceDescriptions: [],
  workflows: [],
};
const external = { ...document, info: { title: 'External', version: '1' } };
const props = () => JSON.parse(screen.getByTestId('source-props').textContent!);
beforeEach(() => history.replaceState(null, '', '/'));

test('external navigation preserves retrieved document identity and revision; a new URL clears external provenance', async () => {
  render(
    <ArazzoUIStandalone
      document={document}
      sourceProvider={{
        load: async () => ({
          content: external,
          retrievalURI: 'https://external.test/actual.yaml',
          revision: 'r1',
        }),
      }}
    />,
  );
  fireEvent.click(screen.getByText('Navigate external'));
  await waitFor(() => expect(props().identity).toBe('https://external.test/actual.yaml'));
  expect(props()).toMatchObject({
    base: 'https://external.test/actual.yaml',
    revision: 'r1',
    root: 'child',
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Arazzo document URL' }), {
    target: { value: 'https://new.test/new.yaml' },
  });
  fireEvent.click(screen.getByText('Explore'));
  expect(props().base).toBeUndefined();
  expect(props().root).toBeUndefined();
  expect(props().revision).toBeUndefined();
});

test('a late external load cannot replace a newer document and its request is cancelled', async () => {
  let complete!: (value: SourceDocumentContent) => void;
  let signal: AbortSignal | undefined;
  render(
    <ArazzoUIStandalone
      document={document}
      sourceProvider={{
        load: (request) => {
          signal = request.signal;
          return new Promise((resolve) => {
            complete = resolve;
          });
        },
      }}
    />,
  );
  fireEvent.click(screen.getByText('Navigate external'));
  await waitFor(() => expect(signal).toBeDefined());
  fireEvent.change(screen.getByRole('textbox', { name: 'Arazzo document URL' }), {
    target: { value: 'https://new.test/new.yaml' },
  });
  fireEvent.click(screen.getByText('Explore'));
  complete({ content: external, retrievalURI: 'https://external.test/flow.yaml', revision: 'r1' });
  await waitFor(() => expect(signal?.aborted).toBe(true));
  expect(props().document).toBe('https://new.test/new.yaml');
});

test('external revision mismatch remains inspectable without replacing the primary document', async () => {
  render(
    <ArazzoUIStandalone
      document={document}
      sourceProvider={{
        load: async () => ({
          content: external,
          retrievalURI: 'https://external.test/flow.yaml',
          revision: 'r2',
        }),
      }}
    />,
  );
  fireEvent.click(screen.getByText('Navigate external'));
  await waitFor(() =>
    expect(screen.getByText(/Revision mismatch/).textContent).toMatch(/revision mismatch/i),
  );
  expect(props().document).toEqual(document);
});

test('host document replacement clears external base, root and identity', async () => {
  const provider = {
    load: async () => ({
      content: external,
      retrievalURI: 'https://external.test/flow.yaml',
      revision: 'r1',
    }),
  };
  const { rerender } = render(<ArazzoUIStandalone document={document} sourceProvider={provider} />);
  fireEvent.click(screen.getByText('Navigate external'));
  await waitFor(() => expect(props().root).toBe('child'));
  const replacement = { ...document, info: { title: 'New primary', version: '1' } };
  rerender(<ArazzoUIStandalone document={replacement} sourceProvider={provider} />);
  await waitFor(() => expect(props().document).toEqual(replacement));
  expect(props().base).toBeUndefined();
  expect(props().root).toBeUndefined();
  expect(props().identity).not.toBe('https://external.test/flow.yaml');
});
