// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { nestedCalls } from './fixtures/connected';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
Element.prototype.scrollIntoView = vi.fn();

test('prerequisites precede their exact root, step and repeated callee occurrences', async () => {
  const doc = structuredClone(nestedCalls);
  doc.workflows[0].dependsOn = ['audit'];
  doc.workflows[0].steps[0].dependsOn = [
    'absent',
    '$sourceDescriptions.remote.payment.steps.charge',
  ];
  doc.workflows[1].dependsOn = ['audit'];
  render(<ArazzoUI document={doc} />);
  const sequence = await screen.findByRole('region', { name: 'Sequence checkout' });
  const list = within(sequence).getByRole('list', { name: 'Ordered interactions' });
  const root = within(sequence)
    .getAllByRole('button', { name: /^Inspect checkout · prerequisite/ })
    .find((entry) => entry.tagName === 'BUTTON')!;
  expect(root.closest('ol')).toBeNull();
  expect(root.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const first = within(list).getByRole('button', { name: /^Inspect checkout.prepare · operation/ });
  const dependencies = within(list).getAllByRole('button', {
    name: /^Inspect checkout.prepare · prerequisite/,
  });
  expect(dependencies).toHaveLength(2);
  for (const dependency of dependencies) {
    expect(dependency.closest('li')).toBe(first.closest('li'));
    expect(
      dependency.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  }
  expect(dependencies.map((entry) => entry.textContent).join(' ')).toMatch(/missing/);
  expect(dependencies.map((entry) => entry.textContent).join(' ')).toMatch(/external/);
  const prerequisites = within(list).getAllByRole('button', {
    name: /^Inspect payment · prerequisite/,
  });
  const charges = within(list).getAllByRole('button', {
    name: /^Inspect payment.charge · operation/,
  });
  const calls = within(list).getAllByRole('button', {
    name: /^Inspect checkout\.(firstPayment|secondPayment) · call/,
  });
  expect(prerequisites).toHaveLength(2);
  for (let i = 0; i < 2; i++) {
    expect(prerequisites[i].closest('li')).toBe(calls[i].closest('li'));
    expect(
      prerequisites[i].compareDocumentPosition(charges[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  }
  expect(prerequisites[1].getAttribute('aria-label')).toContain('checkout.secondPayment');
  fireEvent.click(prerequisites[1]);
  const details = screen.getByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('checkout.secondPayment');
  expect(details.textContent).toContain('Prerequisites');
  expect(
    details.querySelector('[data-reading-section="Caller-supplied parameters"]')?.textContent,
  ).toContain('$inputs.amount');
  fireEvent.click(within(details).getByRole('button', { name: 'Close details' }));
  expect(document.activeElement).toBe(prerequisites[1]);
});

test('ordered interaction items are authored steps, with annotations and repeated nested calls scoped to their owners', async () => {
  const petstore = (
    await loadDocument(readFileSync('public/petstore-order-workflow.arazzo.yaml', 'utf8'))
  ).document;
  const first = render(<ArazzoUI document={petstore} />);
  const petstoreList = await screen.findByRole('list', { name: 'Ordered interactions' });
  expect(petstoreList.querySelectorAll(':scope > li')).toHaveLength(5);
  expect(
    [...petstoreList.querySelectorAll(':scope > li')].map(
      (item) => item.querySelector('.arazzo-reading-identity')?.textContent?.match(/^\d+/)?.[0],
    ),
  ).toEqual(['1', '2', '3', '4', '5']);
  expect(petstoreList.querySelectorAll(':scope > li.arazzo-sequence-annotation')).toHaveLength(0);
  first.unmount();

  render(<ArazzoUI document={nestedCalls} />);
  const list = await screen.findByRole('list', { name: 'Ordered interactions' });
  const calls = within(list).getAllByRole('button', {
    name: /^Inspect checkout\.(firstPayment|secondPayment) · call/,
  });
  expect(calls).toHaveLength(2);
  expect(calls.map((call) => call.textContent?.match(/^\d+/)?.[0])).toEqual(['2', '3']);
  expect(calls[0].getAttribute('aria-label')).not.toBe(calls[1].getAttribute('aria-label'));
  const nested = within(list).getAllByRole('button', {
    name: /^Inspect payment\.charge · operation/,
  });
  expect(nested).toHaveLength(2);
  expect(nested.map((step) => step.textContent?.match(/^\d+\.\d+/)?.[0])).toEqual(['2.1', '3.1']);
  expect(
    [...list.querySelectorAll(':scope > li')].every((item) =>
      item.querySelector(
        '.arazzo-reading-identity[aria-label*=" · operation"], .arazzo-reading-identity[aria-label*=" · call"]',
      ),
    ),
  ).toBe(true);
});

test('expanded stress sequence retains participant context and gives every occurrence control a distinct name', async () => {
  const doc = (
    await loadDocument(readFileSync('public/examples/digital-product-stress/arazzo.yaml', 'utf8'))
  ).document;
  render(<ArazzoUI document={doc} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence diagram' }));
  const sequence = screen.getByRole('region', { name: 'Sequence full-stress-journey' });
  for (let i = 0; i < 10; i++) {
    const expand = within(sequence).queryAllByRole('button', { name: /^Expand / });
    if (!expand.length) break;
    expand.forEach((button) => fireEvent.click(button));
  }
  const list = within(sequence).getByRole('list', { name: 'Ordered interactions' });
  const names = within(list)
    .getAllByRole('button')
    .map((el) => el.getAttribute('aria-label') ?? el.textContent);
  expect(new Set(names).size).toBe(names.length);
  const captures = within(list).getAllByRole('button', {
    name: /^Inspect capture-authorized-payment.capture-payment.*operation/,
  });
  expect(captures).toHaveLength(2);
  expect(captures[0].getAttribute('aria-label')).not.toBe(captures[1].getAttribute('aria-label'));
  for (const capture of captures) {
    const item = capture.closest('li')!;
    expect(within(item).getByText('Conditions and recovery (3)')).toBeTruthy();
    fireEvent.click(within(item).getByText('Conditions and recovery (3)'));
    expect(item.textContent).toContain('reconcile-before-capture-retry');
    expect(item.textContent).toContain('release-after-definite-decline');
    expect(item.textContent).toContain('stop-and-reconcile');
    expect(item.textContent).toContain('End');
    expect(item.textContent).toContain('returns to retry capture-payment');
    expect(item.textContent).toContain('$statusCode == 503');
    expect(item.textContent).toContain('$statusCode == 200');
    expect(item.textContent).toContain('retry limit 3');
    expect(item.textContent).toContain('retry delay 0.5');
  }
  expect(sequence.querySelector('svg')?.textContent).toContain('reconcile-before-capture-retry');
  expect(sequence.querySelector('svg')?.textContent).toContain('stop-and-reconcile');
  expect(sequence.querySelector('[aria-label="Sequence participants"]')).toBeTruthy();
  fireEvent.click(captures[1]);
  expect(within(sequence).getByRole('status').textContent).toContain('full-stress-journey');
  expect(within(sequence).getByRole('status').textContent).toContain(
    'capture-authorized-payment.capture-payment',
  );
});

test('receive-step context keeps standard timeout, correlation and prerequisites distinct', async () => {
  const doc = (
    await loadDocument(
      readFileSync('public/examples/digital-product-stress/event-based.arazzo.yaml', 'utf8'),
    )
  ).document;
  render(<ArazzoUI document={doc} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence diagram' }));
  const list = screen.getByRole('list', { name: 'Ordered interactions' });
  const receive = within(list).getByRole('button', {
    name: /^Inspect event-driven-purchase.await-ready · operation/,
  });
  const item = receive.closest('li')!;
  fireEvent.click(within(item).getByText(/^Conditions and recovery/));
  expect(item.textContent).toContain('Timeout: 12000');
  expect(item.textContent).toContain('Correlation: "$inputs.purchaseId"');
  expect(item.textContent).toContain('Prerequisites:');
});

test('the second repeated call retains its own exact mapping after recovery grouping', async () => {
  const doc = (
    await loadDocument(readFileSync('public/examples/digital-product-stress/arazzo.yaml', 'utf8'))
  ).document;
  render(<ArazzoUI document={doc} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence diagram' }));
  const list = screen.getByRole('list', { name: 'Ordered interactions' });
  fireEvent.click(
    within(list).getByRole('button', { name: /^Inspect batch-fulfilment.second-item · call/ }),
  );
  const details = screen.getByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('second-item');
  expect(details.textContent).toContain('2499');
});
