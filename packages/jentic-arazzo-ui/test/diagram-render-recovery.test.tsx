// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { nestedCalls } from './fixtures/connected';
const draw = vi.hoisted(() => vi.fn());
vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), render: draw } }));
Element.prototype.scrollIntoView = vi.fn();
beforeEach(() => {
  draw.mockReset();
});

test('flowchart rejection is visible, retry clears it only after success and descriptions remain available', async () => {
  draw
    .mockRejectedValueOnce(new Error('Renderer could not parse source'))
    .mockResolvedValue({ svg: '<svg data-testid="recovered" />' });
  render(<ArazzoUI document={nestedCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Flowchart' }));
  await screen.findByText('Unable to draw this flowchart');
  expect(screen.getByText('Renderer could not parse source').closest('details')?.open).toBe(false);
  const retry = screen.getByRole('button', { name: 'Retry diagram' });
  retry.focus();
  fireEvent.click(retry);
  await waitFor(() => expect(document.querySelector('[data-testid="recovered"]')).toBeTruthy());
  expect(screen.queryByText('Unable to draw this flowchart')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Flowchart' }));
  fireEvent.click(screen.getByRole('button', { name: 'Step descriptions' }));
  expect(screen.getByRole('button', { name: 'Inspect checkout.firstPayment' })).toBeTruthy();
});
test('error action reads the exact selected workflow without clearing detail selection', async () => {
  draw.mockRejectedValue(new Error('Draw failure'));
  render(<ArazzoUI document={nestedCalls} view="docs" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' }));
  fireEvent.click(screen.getByRole('button', { name: 'Flowchart' }));
  await screen.findByText('Unable to draw this flowchart');
  fireEvent.click(screen.getByRole('button', { name: 'Read step descriptions' }));
  expect(screen.getByRole('button', { name: 'Step descriptions', pressed: true })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Selection details' }).textContent).toContain(
    'checkout.firstPayment',
  );
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close details' }));
});
test.each(['svg', 'error'])(
  'late %s from an obsolete render cannot replace the new document',
  async (kind) => {
    let accept!: (result: { svg: string }) => void;
    let reject!: (error: Error) => void;
    draw
      .mockImplementationOnce(
        () =>
          new Promise((resolve, fail) => {
            accept = resolve;
            reject = fail;
          }),
      )
      .mockResolvedValue({ svg: '<svg data-testid="current" />' });
    const { rerender } = render(<ArazzoUI document={nestedCalls} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Flowchart' }));
    await waitFor(() => expect(accept).toBeTypeOf('function'));
    const replacement = structuredClone(nestedCalls);
    replacement.workflows[0].steps[0].operationId = 'changed-operation';
    rerender(<ArazzoUI document={replacement} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Flowchart' }));
    await waitFor(() => expect(document.querySelector('[data-testid="current"]')).toBeTruthy());
    await act(async () => {
      if (kind === 'svg') accept({ svg: '<svg data-testid="obsolete" />' });
      else reject(new Error('Obsolete error'));
    });
    expect(document.querySelector('[data-testid="obsolete"]')).toBeNull();
    expect(screen.queryByText('Obsolete error')).toBeNull();
  },
);

test('pending retry retains error until success and cannot publish into a replaced source', async () => {
  const { MermaidDiagram } = await import('../src/components/MermaidDiagram');
  let accept!: (result: { svg: string }) => void;
  draw
    .mockRejectedValueOnce(new Error('First failure'))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          accept = resolve;
        }),
    )
    .mockResolvedValue({ svg: '<svg data-testid="replacement" />' });
  const { rerender } = render(<MermaidDiagram source="old" onReadDescriptions={vi.fn()} />);
  await screen.findByText('Unable to draw this flowchart');
  fireEvent.click(screen.getByRole('button', { name: 'Retry diagram' }));
  expect(screen.getByText('Unable to draw this flowchart')).toBeTruthy();
  await waitFor(() => expect(accept).toBeTypeOf('function'));
  rerender(<MermaidDiagram source="new" onReadDescriptions={vi.fn()} />);
  await waitFor(() => expect(document.querySelector('[data-testid="replacement"]')).toBeTruthy());
  await act(async () => accept({ svg: '<svg data-testid="old-retry" />' }));
  expect(document.querySelector('[data-testid="old-retry"]')).toBeNull();
  expect(screen.queryByText('First failure')).toBeNull();
});
