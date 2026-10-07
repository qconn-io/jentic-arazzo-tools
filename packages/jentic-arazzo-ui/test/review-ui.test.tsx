// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ArazzoWorkflowReview } from '../src/ArazzoWorkflowReview';
import type { WorkflowReviewSnapshot } from '../src/types/review';
Element.prototype.scrollIntoView = vi.fn();
afterEach(cleanup);
const snapshot = (revision: string, steps: object[]): WorkflowReviewSnapshot => ({
  version: 1,
  id: 'shop',
  revision,
  documents: [
    {
      id: 'flow',
      revision,
      uri: 'https://test/flow',
      content: {
        arazzo: '1.0.1',
        info: { title: 'Purchase', version: '1' },
        sourceDescriptions: [],
        workflows: [{ workflowId: 'buy', steps }],
      },
    },
  ],
});
it('filters findings, reads removed baseline content and exports without changing host history', async () => {
  const before = snapshot('old', [
    { stepId: 'revoke', operationId: 'revoke', description: 'Removed compensation' },
  ]);
  const after = snapshot('new', []);
  const onExport = vi.fn(),
    onLocationRequest = vi.fn();
  const url = location.href;
  render(
    <ArazzoWorkflowReview
      baseline={before}
      candidate={after}
      onExport={onExport}
      onLocationRequest={onLocationRequest}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: /structure.*revoke/ }));
  expect(
    within(screen.getByRole('region', { name: 'Before · old' })).getByText('Removed compensation'),
  ).toBeTruthy();
  expect(
    within(screen.getByRole('region', { name: 'After · new' })).getByText(
      'Absent in this revision',
    ),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Open before location' }));
  expect(onLocationRequest).toHaveBeenCalledWith(
    'baseline',
    expect.objectContaining({
      revision: 'old',
      selection: expect.objectContaining({ stepId: 'revoke' }),
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));
  expect(onExport.mock.calls[0][1]).toContain('undetermined');
  expect(location.href).toBe(url);
  fireEvent.change(screen.getByLabelText('Finding category'), { target: { value: 'criteria' } });
  expect(screen.getByText('No findings in this category')).toBeTruthy();
});
it('shows invalid identities before presenting results and suppresses obsolete inputs', async () => {
  const a = snapshot('old', []),
    b = snapshot('new', []);
  const view = render(<ArazzoWorkflowReview baseline={a} candidate={b} />);
  view.rerender(<ArazzoWorkflowReview baseline={a} candidate={a} />);
  expect((await screen.findByRole('alert')).textContent).toMatch(/distinct/);
  expect(screen.queryByRole('button', { name: 'Export JSON' })).toBeNull();
});
it('opens old mappings with old contracts and new mappings with new contracts', async () => {
  const make = (revision: string, value: number): WorkflowReviewSnapshot => ({
    version: 1,
    id: 'shop',
    revision,
    documents: [
      {
        id: 'flow',
        revision,
        uri: 'https://test/flow',
        sources: { pay: { documentId: 'pay', revision } },
        content: {
          arazzo: '1.0.1',
          info: { title: 'Shop', version: '1' },
          sourceDescriptions: [{ name: 'pay', type: 'openapi', url: 'https://test/pay' }],
          workflows: [
            {
              workflowId: 'buy',
              steps: [
                {
                  stepId: 'capture',
                  operationId: 'capture',
                  parameters: [{ name: 'amount', in: 'query', value }],
                },
              ],
            },
          ],
        },
      },
      {
        id: 'pay',
        revision,
        uri: 'https://test/pay',
        kind: 'openapi',
        content: {
          openapi: '3.1.0',
          info: { title: 'Pay', version: '1' },
          paths: {
            '/capture': {
              post: { operationId: 'capture', summary: `${revision} declaration`, responses: {} },
            },
          },
        },
      },
    ],
  });
  render(<ArazzoWorkflowReview baseline={make('old', 0)} candidate={make('new', 1)} />);
  fireEvent.click(await screen.findByRole('button', { name: /mappings.*value/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Open before location' }));
  const before = screen.getByRole('region', { name: 'Before · old' });
  fireEvent.click(
    await within(before).findByRole('button', { name: 'Load source pay' }, { timeout: 5000 }),
  );
  await waitFor(() => expect(before.textContent).toContain('old declaration'), { timeout: 5000 });
  fireEvent.click(screen.getByRole('button', { name: 'Open after location' }));
  const after = screen.getByRole('region', { name: 'After · new' });
  fireEvent.click(
    await within(after).findByRole('button', { name: 'Load source pay' }, { timeout: 5000 }),
  );
  await waitFor(() => expect(after.textContent).toContain('new declaration'), { timeout: 5000 });
  expect(after.textContent).not.toContain('old declaration');
});
