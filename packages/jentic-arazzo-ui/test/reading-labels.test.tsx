// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { nestedCalls } from './fixtures/connected';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
Element.prototype.scrollIntoView = vi.fn();

test('workflow summaries retain exact distinguishing IDs, full long names and ID fallback', async () => {
  const doc = structuredClone(nestedCalls);
  doc.workflows[0].summary = 'A readable journey '.repeat(20);
  doc.workflows[1].summary = 'Repeated summary';
  doc.workflows[2].summary = 'Repeated summary';
  doc.workflows.push({ workflowId: 'no-summary', steps: [{ stepId: 'one', operationId: 'one' }] });
  render(<ArazzoUI document={doc} />);
  const select = await screen.findByRole('combobox', { name: 'Select workflow' });
  const expected = `${doc.workflows[0].summary.trim()} · checkout`;
  expect(within(select).getByRole('option', { name: expected }).getAttribute('title')).toBe(
    expected,
  );
  expect(within(select).getByRole('option', { name: 'Repeated summary · payment' })).toBeTruthy();
  expect(within(select).getByRole('option', { name: 'Repeated summary · audit' })).toBeTruthy();
  expect(within(select).getByRole('option', { name: 'no-summary' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'All workflows' }));
  expect(screen.getByRole('button', { name: 'Open workflow checkout' }).textContent).toBe(expected);
});
test('sequence exposes authored step and qualified operation without generated participant headings', async () => {
  const doc = {
    arazzo: '1.0.1',
    info: { title: 'Labels', version: '1' },
    sourceDescriptions: [{ name: 'api', type: 'openapi' as const, url: './api' }],
    workflows: [
      {
        workflowId: 'root',
        steps: [
          { stepId: 'findAvailablePets', operationId: '$sourceDescriptions.api.findPetsByStatus' },
        ],
      },
    ],
  };
  render(<ArazzoUI document={doc} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence diagram' }));
  const sequence = screen.getByRole('region', { name: 'Sequence root' });
  const list = within(sequence).getByRole('list', { name: 'Ordered interactions' });
  expect(list.textContent).toContain('findAvailablePets · findPetsByStatus');
  expect(list.querySelector('[title*="$sourceDescriptions.api.findPetsByStatus"]')).toBeTruthy();
  expect(sequence.querySelector('[aria-label="Sequence participants"]')!.textContent).not.toMatch(
    /\bP\d+\b/,
  );
  fireEvent.click(
    within(list).getByRole('button', { name: /^View details for root.findAvailablePets/ }),
  );
  expect(screen.getByRole('region', { name: 'Selection details' }).textContent).toContain(
    '$sourceDescriptions.api.findPetsByStatus',
  );
});
test('unknown sequence destinations explain uncertainty without merging occurrences', async () => {
  const doc = {
    arazzo: '1.0.1',
    info: { title: 'Unknown', version: '1' },
    sourceDescriptions: [],
    workflows: [
      {
        workflowId: 'root',
        steps: [
          { stepId: 'a', operationId: 'unknown' },
          { stepId: 'b', operationId: 'unknown' },
        ],
      },
    ],
  };
  render(<ArazzoUI document={doc} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence diagram' }));
  const sequence = screen.getByRole('region', { name: 'Sequence root' });
  expect(sequence.querySelector('[aria-label="Sequence participants"]')!.children).toHaveLength(3);
  expect(sequence.textContent).toContain('The API destination is not established');
  expect(
    within(sequence).getAllByRole('button', { name: /^View details for root\.[ab]/ }),
  ).toHaveLength(2);
});

test('qualified async labels keep send and receive intent and exact channel access', async () => {
  const { interactionReadingLabel, interactionReadingTitle } =
    await import('../src/utils/readingLabels');
  const { buildSequence } = await import('../src/utils/sequence/sequenceModel');
  const { createSnapshot, inspect } = await import('../src/utils/inspection');
  const { buildViewerModel } = await import('../src/utils/model/viewerModel');
  const doc = {
    arazzo: '1.1.0',
    info: { title: 'Events', version: '1' },
    sourceDescriptions: [{ name: 'events', type: 'asyncapi' as const, url: './events' }],
    workflows: [
      {
        workflowId: 'root',
        steps: [
          {
            stepId: 'publish',
            channelPath: '$sourceDescriptions.events.orders',
            action: 'send' as const,
          },
          {
            stepId: 'await',
            channelPath: '$sourceDescriptions.events.orders',
            action: 'receive' as const,
          },
        ],
      },
    ],
  };
  const rows = buildSequence(buildViewerModel(inspect(createSnapshot(doc))), 'root').rows.filter(
    (row) => row.kind === 'operation',
  );
  expect(rows.map(interactionReadingLabel)).toEqual([
    'publish · orders · send',
    'await · orders · receive',
  ]);
  expect(interactionReadingTitle(rows[0])).toContain('$sourceDescriptions.events.orders');
  expect(rows[0].from).toBe(rows[1].to);
  expect(rows[0].to).toBe(rows[1].from);
});
