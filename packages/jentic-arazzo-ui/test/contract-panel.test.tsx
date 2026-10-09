// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArazzoViewerProvider } from '../src/context/ArazzoViewerContext';
import { InspectionStatus } from '../src/components/InspectionStatus';
import { ContractPanel } from '../src/components/ContractPanel';
import { createSnapshot } from '../src/utils/inspection';
import type { ArazzoDocument } from '../src/types/arazzo';

const document: ArazzoDocument = {
  arazzo: '1.0.1',
  info: { title: 'Test', version: '1' },
  sourceDescriptions: [{ name: 'api', type: 'openapi', url: './api.yaml' }],
  workflows: [
    {
      workflowId: 'root',
      steps: [{ stepId: 'call', operationId: '$sourceDescriptions.api.get.item' }],
    },
  ],
};
const contract = {
  openapi: '3.1.0',
  info: { title: 'API', version: '1' },
  paths: {
    '/items': { get: { operationId: 'get.item', responses: { '200': { description: 'Item' } } } },
  },
};
test('inspection does not fetch implicitly; explicit load and reload preserve dotted IDs and provenance', async () => {
  const load = vi.fn(async () => ({
    content: contract,
    retrievalURI: 'https://example.test/api.yaml',
    revision: 'r1',
  }));
  render(
    <ArazzoViewerProvider
      document={document}
      snapshot={createSnapshot(document, { baseURI: 'https://example.test/workflow.yaml' })}
      sourceProvider={{ load }}
    >
      <InspectionStatus />
      <ContractPanel workflowId="root" stepId="call" />
    </ArazzoViewerProvider>,
  );
  expect(load).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Load API description api' }));
  await waitFor(() => expect(screen.getByText('located')).toBeTruthy(), { timeout: 5000 });
  expect(load).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('region', { name: 'Inspection status details' }).textContent).toContain(
    'api: API description loaded',
  );
  expect(
    screen.getByRole('region', { name: 'Inspection status details' }).textContent,
  ).not.toContain('API descriptions have not been loaded');
  expect(screen.getByText('r1')).toBeTruthy();
  expect(screen.getByText('Contract profile: openapi 3.1.0')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reload API description api' }));
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByText('located')).toBeTruthy(), { timeout: 5000 });
});
test('embedded inspection without provider retains authored locator without browser fetching', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  render(
    <ArazzoViewerProvider document={document}>
      <ContractPanel workflowId="root" stepId="call" />
    </ArazzoViewerProvider>,
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Load API description api' })).toBeNull();
  expect(screen.getByText('$sourceDescriptions.api.get.item')).toBeTruthy();
  fetch.mockRestore();
});

test('explicit loading keeps focus on stable source context while its button is disabled', async () => {
  let release!: (value: { content: object; retrievalURI: string }) => void;
  const provider = {
    load: () =>
      new Promise<{ content: object; retrievalURI: string }>((resolve) => {
        release = resolve;
      }),
  };
  render(
    <ArazzoViewerProvider
      document={document}
      snapshot={createSnapshot(document, { baseURI: 'https://example.test/workflow.yaml' })}
      sourceProvider={provider}
    >
      <ContractPanel workflowId="root" stepId="call" />
    </ArazzoViewerProvider>,
  );
  const button = screen.getByRole('button', { name: 'Load API description api' });
  button.focus();
  fireEvent.click(button);
  const source = screen.getByRole('region', { name: 'Source api' });
  expect(globalThis.document.activeElement).toBe(source);
  await waitFor(() => expect(release).toBeTypeOf('function'));
  const elsewhere = globalThis.document.createElement('button');
  globalThis.document.body.appendChild(elsewhere);
  elsewhere.focus();
  release({ content: contract, retrievalURI: 'https://example.test/api.yaml' });
  await screen.findByText('located');
  expect(globalThis.document.activeElement).toBe(elsewhere);
  elsewhere.remove();
});

test('shared dependency reload hides affected facts and keeps unrelated panels loaded', async () => {
  const { within } = await import('@testing-library/react');
  const sources = ['a', 'b', 'c'];
  const doc: ArazzoDocument = {
    ...document,
    sourceDescriptions: sources.map((name) => ({
      name,
      type: 'openapi',
      url: `https://example.test/${name}`,
    })),
    workflows: [
      {
        workflowId: 'root',
        steps: sources.map((name) => ({
          stepId: name,
          operationId: `$sourceDescriptions.${name}.run`,
        })),
      },
    ],
  };
  let revision = '1';
  const load = vi.fn(async ({ uri }: { uri: string }) => ({
    retrievalURI: uri,
    revision,
    content: uri.endsWith('/shared')
      ? { Response: { description: `dependency ${revision}` } }
      : {
          openapi: '3.1.0',
          paths: {
            '/run': {
              get: {
                operationId: 'run',
                responses: {
                  '200': uri.endsWith('/c')
                    ? { description: 'unrelated' }
                    : { $ref: './shared#/Response' },
                },
              },
            },
          },
        },
  }));
  const { container } = render(
    <ArazzoViewerProvider document={doc} sourceProvider={{ load }}>
      {sources.map((name) => (
        <ContractPanel key={name} workflowId="root" stepId={name} />
      ))}
    </ArazzoViewerProvider>,
  );
  const panels = [...container.querySelectorAll('.arazzo-contract-panel')].map((panel) =>
    within(panel as HTMLElement),
  );
  for (let i = 0; i < sources.length; i++) {
    fireEvent.click(panels[i].getByRole('button', { name: `Load API description ${sources[i]}` }));
    await waitFor(() => expect(panels[i].getByText('located')).toBeTruthy());
  }
  revision = '2';
  fireEvent.click(panels[0].getByRole('button', { name: 'Reload API description a' }));
  await waitFor(() => expect(panels[0].getByText('located')).toBeTruthy());
  expect(panels[0].getByText(/dependency 2/)).toBeTruthy();
  expect(panels[1].queryByText('Operation Details')).toBeNull();
  expect(panels[1].getByRole('button', { name: 'Load API description b' })).toBeTruthy();
  expect(panels[2].getByText('located')).toBeTruthy();
  expect(load.mock.calls.filter(([request]) => request.uri.endsWith('/c'))).toHaveLength(1);
});

test('explicitly loaded facts survive inspector unmount and are shared with another inspector', async () => {
  const load = vi.fn(async () => ({
    content: contract,
    retrievalURI: 'https://example.test/api.yaml',
  }));
  function Switch() {
    const [open, setOpen] = React.useState(true);
    return (
      <>
        <button onClick={() => setOpen(!open)}>Toggle inspector</button>
        {open && <ContractPanel workflowId="root" stepId="call" />}
      </>
    );
  }
  render(
    <ArazzoViewerProvider
      document={document}
      snapshot={createSnapshot(document, { baseURI: 'https://example.test/workflow.yaml' })}
      sourceProvider={{ load }}
    >
      <Switch />
    </ArazzoViewerProvider>,
  );
  expect(load).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Load API description api' }));
  await screen.findByText('located');
  fireEvent.click(screen.getByText('Toggle inspector'));
  fireEvent.click(screen.getByText('Toggle inspector'));
  expect(screen.getByText('located')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

test('advanced source provenance hides implementation generations while revision, methods and declared bodies stay contextual', async () => {
  const load = vi.fn(async () => ({
    content: {
      ...contract,
      paths: {
        '/items': {
          post: {
            operationId: 'get.item',
            requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
            responses: { '200': { description: 'Authored response' } },
          },
        },
      },
    },
    retrievalURI: 'https://example.test/api.yaml',
    revision: 'r1',
  }));
  render(
    <ArazzoViewerProvider
      document={document}
      snapshot={createSnapshot(document, { baseURI: 'https://example.test/workflow.yaml' })}
      sourceProvider={{ load }}
    >
      <ContractPanel workflowId="root" stepId="call" />
    </ArazzoViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load API description api' }));
  await screen.findByText('located');
  const generation = screen.getByText(/Provider generation:/);
  const advanced = generation.closest('details')!;
  expect(advanced).toBeTruthy();
  expect(advanced.open).toBe(false);
  expect(advanced.querySelector('summary')?.textContent).toBe('Advanced source provenance');
  expect(screen.getByText('r1').closest('details')?.querySelector('summary')?.textContent).toBe(
    'Source acquisition details',
  );
  expect(screen.getByText('get.item POST /items')).toBeTruthy();
  expect(
    screen
      .getByText('Request media types and schemas')
      .closest('details')
      ?.parentElement?.closest('[data-advanced]'),
  ).toBeNull();
  expect(screen.getByText('Response alternatives (declared, not observed)')).toBeTruthy();
  fireEvent.click(advanced.querySelector('summary')!);
  expect(advanced.open).toBe(true);
  expect(load).toHaveBeenCalledTimes(1);
});

test('bare single-source IDs retain source identity when an explicitly checked operation is missing', async () => {
  const doc: ArazzoDocument = {
    ...document,
    workflows: [{ workflowId: 'root', steps: [{ stepId: 'call', operationId: 'absent' }] }],
  };
  render(
    <ArazzoViewerProvider
      document={doc}
      snapshot={createSnapshot(doc, { baseURI: 'https://example.test/flow' })}
      sourceProvider={{
        load: async () => ({ content: contract, retrievalURI: 'https://example.test/api.yaml' }),
      }}
    >
      <ContractPanel workflowId="root" stepId="call" />
    </ArazzoViewerProvider>,
  );
  expect(screen.getByText(/Destination source:/).textContent).toBe('Destination source: api');
  fireEvent.click(screen.getByRole('button', { name: 'Load API description api' }));
  await screen.findByText('missing');
  expect(screen.getByText(/Destination source:/).textContent).toBe('Destination source: api');
});

test('reader sees unchecked identity and a viewer limitation with technical details separate', () => {
  render(
    <ArazzoViewerProvider document={document}>
      <ContractPanel workflowId="root" stepId="call" />
    </ArazzoViewerProvider>,
  );
  expect(screen.getByText('API description not loaded')).toBeTruthy();
  expect(screen.getByText('This operation has not been checked.')).toBeTruthy();
  expect(screen.getByText('API-description loading is unavailable in this viewer.')).toBeTruthy();
  expect(
    screen.getByText('not-loaded').closest('details')?.querySelector('summary')?.textContent,
  ).toBe('Technical lookup details');
});
test.each([
  ['missing', { ...contract, paths: {} }, 'Operation not found'],
  [
    'ambiguous',
    {
      ...contract,
      paths: {
        '/a': { get: { operationId: 'get.item' } },
        '/b': { get: { operationId: 'get.item' } },
      },
    },
    'Multiple matching operations',
  ],
  ['unsupported', { strange: true }, 'Unsupported API description'],
])('reader wording for %s preserves technical lookup code', async (code, content, message) => {
  render(
    <ArazzoViewerProvider
      document={document}
      snapshot={createSnapshot(document, { baseURI: 'https://example.test/flow' })}
      sourceProvider={{
        load: async () => ({ content, retrievalURI: 'https://example.test/api.yaml' }),
      }}
    >
      <ContractPanel workflowId="root" stepId="call" />
    </ArazzoViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load API description api' }));
  await screen.findByText(message);
  expect(screen.getByText(code).closest('details')).toBeTruthy();
});
test('loading and denied acquisition show explicit recoverable states', async () => {
  let deny!: (error: Error) => void;
  render(
    <ArazzoViewerProvider
      document={document}
      snapshot={createSnapshot(document, { baseURI: 'https://example.test/flow' })}
      sourceProvider={{
        load: () =>
          new Promise((_, reject) => {
            deny = reject;
          }),
      }}
    >
      <ContractPanel workflowId="root" stepId="call" />
    </ArazzoViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load API description api' }));
  expect(screen.getByText('Checking API description')).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Checking API description api' }).hasAttribute('disabled'),
  ).toBe(true);
  await waitFor(() => expect(deny).toBeTypeOf('function'));
  deny(new Error('Access denied by provider'));
  await screen.findByText('API description unavailable');
  expect(
    screen.getByText('Access denied by provider', { selector: '[role="status"]' }),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Retry API description api' })).toBeTruthy();
});

test('partial candidate checking never presents a unique operation', async () => {
  const doc = {
    ...document,
    sourceDescriptions: ['a', 'b'].map((name) => ({
      name,
      type: 'openapi' as const,
      url: `https://example.test/${name}`,
    })),
    workflows: [{ workflowId: 'root', steps: [{ stepId: 'call', operationId: 'get.item' }] }],
  };
  render(
    <ArazzoViewerProvider
      document={doc}
      sourceProvider={{ load: async ({ uri }) => ({ content: contract, retrievalURI: uri }) }}
    >
      <ContractPanel workflowId="root" stepId="call" />
    </ArazzoViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load API description a' }));
  await screen.findByRole('button', { name: 'Reload API description a' });
  expect(
    screen.getByText(
      'Some possible API descriptions remain unchecked. A unique operation has not been established.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Operation found')).toBeNull();
  expect(screen.queryByRole('region', { name: 'Operation declaration' })).toBeNull();
});
