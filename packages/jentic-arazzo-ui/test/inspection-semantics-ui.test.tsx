// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';

Element.prototype.scrollIntoView = vi.fn();
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));

test('unsupported channel source is shown as authored evidence, not a declared destination', async () => {
  render(
    <ArazzoUI
      document={{
        arazzo: '1.1.0',
        info: { title: 'Mismatched source', version: '1' },
        sourceDescriptions: [{ name: 'api', type: 'openapi', url: './api.yaml' }],
        workflows: [
          {
            workflowId: 'flow',
            steps: [{ stepId: 'one', channelPath: '$sourceDescriptions.api.channels.orders' }],
          },
        ],
      }}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence diagram' }));
  const scene = screen.getByRole('region', { name: 'Sequence flow' });
  expect(within(scene).getByText(/API destination is not established/)).toBeTruthy();
  fireEvent.click(
    within(within(scene).getByRole('list', { name: 'Ordered interactions' })).getByRole('button', {
      name: /^Inspect flow\.one/,
    }),
  );
  const details = screen.getByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('$sourceDescriptions.api.channels.orders');
  expect(details.textContent).toContain('unsupported');
});
