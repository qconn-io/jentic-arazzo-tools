// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArazzoViewerProvider } from '../src/context/ArazzoViewerContext';
import { useViewerSession } from '../src/context/ViewerSessionContext';
import { SelectionDetails } from '../src/components/SelectionDetails';
import { loadDocument } from '../src/utils/loading/loadDocument';

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
Element.prototype.scrollIntoView = vi.fn();
function Probe({ workflow, step }: { workflow: string; step: string }) {
  const session = useViewerSession();
  return (
    <>
      <button onClick={(e) => session.inspectStep(workflow, step, e.currentTarget)}>
        Inspect test
      </button>
      <SelectionDetails />
    </>
  );
}
async function mount(path: string, workflow: string, step: string) {
  const { document: doc } = await loadDocument(
    readFileSync(resolve('public/examples', path), 'utf8'),
  );
  render(
    <ArazzoViewerProvider document={doc}>
      <Probe workflow={workflow} step={step} />
    </ArazzoViewerProvider>,
  );
  fireEvent.click(screen.getByText('Inspect test'));
  return screen.getByRole('region', { name: 'Selection details' });
}
test('small purchase renders selectable payload values and outputs outside advanced JSON', async () => {
  const panel = await mount('digital-product/arazzo.yaml', 'client-journey', 'purchase');
  expect(
    within(panel).getByRole('heading', { name: 'Request body / message payload' }),
  ).toBeTruthy();
  const readable = panel.querySelector('[data-reading-section="Request body / message payload"]')!;
  expect(readable.textContent).toContain('payload');
  expect(readable.querySelector('code')?.textContent).toBeTruthy();
  expect(panel.querySelector('details[data-advanced]')).toHaveProperty('open', false);
});
test('capture recovery presents criteria, limit, delay, source return and separate abort', async () => {
  const panel = await mount(
    'digital-product-stress/arazzo.yaml',
    'capture-authorized-payment',
    'capture-payment',
  );
  const recovery = panel.querySelector(
    '[data-reading-section="Possible actions — viewer inspection order"]',
  )!;
  expect(recovery.textContent).toContain(
    'Recovery before retrying capture-authorized-payment.capture-payment',
  );
  expect(recovery.textContent).toContain('reconcile-payment');
  expect(recovery.textContent).toContain('UNKNOWN');
  expect(recovery.textContent).toContain('503');
  expect(recovery.textContent).toContain('DECLINED');
  expect(recovery.textContent).toContain('Retry limit3');
  expect(recovery.textContent).toContain('Retry delay0.5');
});
test('event receive renders correlation and timeout with bounded retry and polling fallback', async () => {
  const panel = await mount(
    'digital-product-stress/event-based.arazzo.yaml',
    'event-driven-purchase',
    'await-ready',
  );
  const source = panel.querySelector('[data-reading-section="Source / operation"]')!;
  expect(source.textContent).toContain('Correlation$inputs.purchaseId');
  expect(source.textContent).toContain('Timeout12000');
  const recovery = panel.querySelector(
    '[data-reading-section="Possible actions — viewer inspection order"]',
  )!;
  expect(recovery.textContent).toContain('Retry source step event-driven-purchase.await-ready');
  expect(recovery.textContent).toContain('poll-purchase-until-ready');
  expect(recovery.textContent).toContain('One-way transfer');
});

test('default documentation links to shared details without repeating full projection across modes', async () => {
  const { ArazzoUI } = await import('../src/ArazzoUI');
  const { nestedCalls } = await import('./fixtures/connected');

  const mountUI = (view: 'docs' | 'diagram' | 'split') => (
    <ArazzoUI document={nestedCalls} view={view} />
  );
  const { rerender } = render(mountUI('docs'));
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' }));
  const projection = () =>
    screen
      .getByRole('region', { name: 'Selection details' })
      .querySelector('[data-reading-section="Caller-supplied parameters"]')!.textContent;
  const expected = projection();
  expect(document.querySelector('.arazzo-docs-prose')?.textContent).not.toContain(
    'Caller-supplied parameters',
  );
  expect(document.querySelector('.arazzo-docs-prose')?.textContent).not.toContain(
    'Authored action lists',
  );
  for (const view of ['diagram', 'split', 'docs'] as const) {
    rerender(mountUI(view));
    expect(projection()).toBe(expected);
  }
});

test('readable containers and scalar types distinguish absent, empty and exact expressions', async () => {
  const { ReadingDetails, ReadingValue } = await import('../src/components/ReadingDetails');
  const { container } = render(
    <>
      <ReadingDetails
        sections={[
          { kind: 'values', title: 'Absent outputs', rows: [], present: false },
          { kind: 'values', title: 'Empty outputs', rows: [], present: true, value: {} },
          { kind: 'values', title: 'Empty parameters', rows: [], present: true, value: [] },
        ]}
      />
      <div data-testid="bool">
        <ReadingValue value={false} />
      </div>
      <div data-testid="string">
        <ReadingValue value="false" />
      </div>
      <div data-testid="expression">
        <ReadingValue value="$inputs.value" />
      </div>
    </>,
  );
  expect(container.querySelector('[data-reading-section="Absent outputs"]')?.textContent).toContain(
    'Not declared',
  );
  expect(container.querySelector('[data-reading-section="Empty outputs"]')?.textContent).toContain(
    '{}',
  );
  expect(
    container.querySelector('[data-reading-section="Empty parameters"]')?.textContent,
  ).toContain('[]');
  expect(screen.getByTestId('bool').textContent).toContain('boolean');
  expect(screen.getByTestId('string').textContent).toContain('string');
  expect(screen.getByTestId('expression').querySelector('code')?.textContent).toBe('$inputs.value');
});
