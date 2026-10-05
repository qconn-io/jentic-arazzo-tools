// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { loadDocument } from '../src/utils/loading/loadDocument';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
Element.prototype.scrollIntoView = vi.fn();

test('expanded stress sequence retains participant context and gives every occurrence control a distinct name', async () => {
  const doc = (
    await loadDocument(readFileSync('public/examples/digital-product-stress/arazzo.yaml', 'utf8'))
  ).document;
  render(<ArazzoUI document={doc} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
  const sequence = screen.getByRole('region', { name: 'Sequence full-stress-journey' });
  for (let i = 0; i < 10; i++) {
    const expand = within(sequence).queryAllByRole('button', { name: /^Expand / });
    if (!expand.length) break;
    expand.forEach((button) => fireEvent.click(button));
  }
  const names = within(sequence)
    .getAllByRole('button')
    .map((el) => el.getAttribute('aria-label') ?? el.textContent);
  expect(new Set(names).size).toBe(names.length);
  const captures = within(sequence).getAllByRole('button', {
    name: /^Inspect capture-authorized-payment.capture-payment.*operation/,
  });
  expect(captures).toHaveLength(2);
  expect(captures[0].getAttribute('aria-label')).not.toBe(captures[1].getAttribute('aria-label'));
  expect(
    within(sequence).getAllByRole('button', {
      name: /^Inspect capture-authorized-payment.capture-payment.*transfer.*retry/,
    }),
  ).toHaveLength(2);
  expect(
    within(sequence).getAllByRole('button', {
      name: /^Inspect capture-authorized-payment.capture-payment.*transfer.*goto/,
    }),
  ).toHaveLength(2);
  expect(sequence.querySelector('[aria-label="Sequence participants"]')).toBeTruthy();
  fireEvent.click(captures[1]);
  expect(within(sequence).getByRole('status').textContent).toContain('full-stress-journey');
  expect(within(sequence).getByRole('status').textContent).toContain(
    'capture-authorized-payment.capture-payment',
  );
});
