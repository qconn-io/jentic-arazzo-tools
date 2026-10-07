// @vitest-environment jsdom
import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import type { WorkflowCatalogManifest } from '../src/types/catalog';
import { ArazzoCatalog } from '../src/ArazzoCatalog';
vi.mock('../src/ArazzoUI', () => ({
  ArazzoUI: (props: import('../src/types/viewer').ArazzoUIProps) => (
    <div data-testid="viewer">
      {props.documentIdentity} {props.documentRevision} {props.location?.root}
      <button
        type="button"
        onClick={() =>
          props.location && props.onLocationChange?.({ ...props.location, root: 'helper' })
        }
      >
        Switch viewer workflow
      </button>
    </div>
  ),
}));
afterEach(cleanup);
const manifest: WorkflowCatalogManifest = {
  version: 1,
  id: 'shop',
  revision: '1',
  capabilities: [{ id: 'purchase', name: 'Purchase' }],
  documents: [
    {
      id: 'shop',
      revision: 'r1',
      uri: 'https://example.test/shop',
      content: {
        arazzo: '1.0.1',
        info: { title: 'Shop', version: '1' },
        sourceDescriptions: [],
        workflows: [
          { workflowId: 'buy', steps: [{ stepId: 'prepare', workflowId: 'helper' }] },
          { workflowId: 'helper', steps: [] },
        ],
      },
      workflows: [
        { workflowId: 'buy', role: 'entry', capabilities: ['purchase'] },
        { workflowId: 'helper', role: 'helper' },
      ],
    },
  ],
};
it('discovers declared capabilities, keeps unknown owner and opens an exact scoped destination without history', async () => {
  const selection = vi.fn(),
    push = vi.spyOn(history, 'pushState');
  render(<ArazzoCatalog manifest={manifest} onSelectionChange={selection} />);
  await screen.findByRole('button', { name: 'buy — shop / r1' });
  fireEvent.change(screen.getByLabelText('Capability'), { target: { value: 'purchase' } });
  expect(screen.queryByRole('button', { name: 'helper — shop / r1' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'buy — shop / r1' }));
  expect(selection).toHaveBeenCalledWith(
    expect.objectContaining({ documentId: 'shop', revision: 'r1', workflowId: 'buy' }),
  );
  expect(screen.getByTestId('viewer').textContent).toContain('r1 buy');
  expect(screen.getByText('Owner: unknown')).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  push.mockRestore();
});
it('shows classified incoming usage and follows authored source steps', async () => {
  render(
    <ArazzoCatalog
      manifest={manifest}
      defaultSelection={{ documentId: 'shop', revision: 'r1', workflowId: 'helper' }}
    />,
  );
  await screen.findByRole('heading', { name: 'helper' });
  fireEvent.click(screen.getByRole('button', { name: /call from buy.*prepare/ }));
  await waitFor(() => expect(screen.getByTestId('viewer').textContent).toContain('r1 buy'));
});
it('shows unavailable revision and partial coverage without claiming no consumers', async () => {
  const partial = {
    ...manifest,
    documents: [
      ...manifest.documents,
      { id: 'missing', revision: 'r1', uri: 'https://example.test/missing' },
    ],
  };
  render(
    <ArazzoCatalog
      manifest={partial}
      defaultSelection={{ documentId: 'shop', revision: 'gone', workflowId: 'buy' }}
    />,
  );
  await screen.findByText(/Unavailable catalog revision or workflow/);
  expect(screen.getByText(/Partial coverage/)).toBeTruthy();
});

it('updates catalog identity and callbacks when the viewer selects another root', async () => {
  const callback = vi.fn();
  render(
    <ArazzoCatalog
      manifest={manifest}
      defaultSelection={{ documentId: 'shop', revision: 'r1', workflowId: 'buy' }}
      onSelectionChange={callback}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Switch viewer workflow' }));
  await screen.findByRole('heading', { name: 'helper' });
  expect(callback).toHaveBeenCalledWith(
    expect.objectContaining({
      workflowId: 'helper',
      location: expect.objectContaining({ root: 'helper' }),
    }),
  );
});
