// @vitest-environment jsdom
import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ArazzoCatalog } from '../src/ArazzoCatalog';
import type { WorkflowCatalogManifest } from '../src/types/catalog';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));
Element.prototype.scrollIntoView = vi.fn();
afterEach(cleanup);
const contract = (summary: string) => ({
  openapi: '3.1.0',
  info: { title: 'Pay', version: '1' },
  paths: { '/capture': { post: { operationId: 'capture', summary, responses: {} } } },
});
it('inspects the same exact contract revision as the index, including two source names at one URI', async () => {
  const manifest: WorkflowCatalogManifest = {
    version: 1,
    id: 'catalog',
    revision: '1',
    documents: [
      {
        id: 'shop',
        revision: '1',
        uri: 'https://example.test/shop.yaml',
        content: {
          arazzo: '1.0.1',
          info: { title: 'Shop', version: '1' },
          sourceDescriptions: [
            { name: 'pay-old', type: 'openapi', url: './pay.json' },
            { name: 'pay-new', type: 'openapi', url: './pay.json' },
          ],
          workflows: [
            {
              workflowId: 'buy',
              steps: [{ stepId: 'capture', operationId: '$sourceDescriptions.pay-new.capture' }],
            },
          ],
        },
        sources: {
          'pay-old': { documentId: 'pay', revision: 'old' },
          'pay-new': { documentId: 'pay', revision: 'new' },
        },
      },
      {
        id: 'pay',
        revision: 'old',
        uri: 'https://example.test/pay.json',
        kind: 'openapi',
        content: contract('Old capture declaration'),
      },
      {
        id: 'pay',
        revision: 'new',
        uri: 'https://example.test/pay.json',
        kind: 'openapi',
        content: contract('New capture declaration'),
      },
    ],
  };
  render(
    <ArazzoCatalog
      manifest={manifest}
      defaultSelection={{
        documentId: 'shop',
        revision: '1',
        workflowId: 'buy',
        location: {
          version: 1,
          document: 'https://example.test/shop.yaml',
          revision: '1',
          root: 'buy',
          view: 'docs',
          subview: 'docs',
          selection: { kind: 'step', workflowId: 'buy', stepId: 'capture' },
        },
      }}
    />,
  );
  const load = await screen.findByRole(
    'button',
    { name: 'Load source pay-new' },
    { timeout: 5000 },
  );
  fireEvent.click(load);
  const details = await screen.findByRole('region', { name: 'Selection details' });
  await waitFor(() => expect(details.textContent).toContain('Revision: new'));
  expect(details.textContent).toContain('New capture declaration');
  expect(details.textContent).toContain('Revision: new');
  expect(details.textContent).not.toContain('Old capture declaration');
});
