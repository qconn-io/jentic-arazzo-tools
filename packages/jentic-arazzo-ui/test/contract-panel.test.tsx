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
  fireEvent.click(screen.getByRole('button', { name: 'Load source api' }));
  await waitFor(() => expect(screen.getByText('located')).toBeTruthy(), { timeout: 5000 });
  expect(load).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('region', { name: 'Inspection status details' }).textContent).toContain(
    'api: acquired',
  );
  expect(
    screen.getByRole('region', { name: 'Inspection status details' }).textContent,
  ).not.toContain('Source documents were not fetched');
  expect(screen.getByText('r1')).toBeTruthy();
  expect(screen.getByText('Contract profile: openapi 3.1.0')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reload source api' }));
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
  expect(screen.queryByRole('button', { name: 'Load source api' })).toBeNull();
  expect(screen.getByText('$sourceDescriptions.api.get.item')).toBeTruthy();
  fetch.mockRestore();
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
    fireEvent.click(panels[i].getByRole('button', { name: `Load source ${sources[i]}` }));
    await waitFor(() => expect(panels[i].getByText('located')).toBeTruthy());
  }
  revision = '2';
  fireEvent.click(panels[0].getByRole('button', { name: 'Reload source a' }));
  await waitFor(() => expect(panels[0].getByText('located')).toBeTruthy());
  expect(panels[0].getByText(/dependency 2/)).toBeTruthy();
  expect(panels[1].queryByText('Operation Details')).toBeNull();
  expect(panels[1].getByRole('button', { name: 'Load source b' })).toBeTruthy();
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
  fireEvent.click(screen.getByRole('button', { name: 'Load source api' }));
  await screen.findByText('located');
  fireEvent.click(screen.getByText('Toggle inspector'));
  fireEvent.click(screen.getByText('Toggle inspector'));
  expect(screen.getByText('located')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});
