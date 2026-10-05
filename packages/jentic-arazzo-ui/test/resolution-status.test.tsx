// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { ArazzoUI } from '../src/ArazzoUI';
import { nestedCalls } from './fixtures/connected';
Element.prototype.scrollIntoView = vi.fn();
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));

test('resolution preflight reports only actually detected causes, retaining combinations', async () => {
  for (const [input, options, reasons] of [
    [nestedCalls, {}, ['base-uri']],
    [
      { ...nestedCalls, $self: 'https://example.test/self' },
      { baseURI: 'https://example.test/' },
      ['self'],
    ],
    [
      {
        ...nestedCalls,
        $self: 'urn:identity',
        components: { inputs: { custom: { $schema: 'urn:custom' } } },
      },
      {},
      ['self', 'schema-dialect', 'base-uri'],
    ],
  ] as const) {
    const loaded = await loadDocument(input, options);
    expect(
      loaded.diagnostics.find((d) => d.code === 'expansion-bypassed')?.resolutionReasons,
    ).toEqual(reasons);
    expect(loaded.document.workflows[0].steps[1].workflowId).toBe('payment');
  }
});

test('one shared status distinguishes unchecked source content and available local calls', async () => {
  const { rerender, container } = render(<ArazzoUI document={nestedCalls} />);
  const control = await screen.findByText('Inspection status');
  fireEvent.click(control);
  const status = screen.getByRole('region', { name: 'Inspection status details' });
  expect(status.textContent).toContain('Source documents were not fetched');
  expect(status.textContent).toContain('does not mean they are invalid or inaccessible');
  fireEvent.click(screen.getByRole('button', { name: 'Sequence' }));
  const sequence = screen.getByRole('region', { name: 'Sequence checkout' });
  expect(sequence.textContent).not.toContain('Schema validation');
  expect(sequence.textContent).not.toContain('unverified');
  expect(sequence.textContent).toContain('charge');
  for (const view of ['diagram', 'split', 'docs'] as const) {
    rerender(<ArazzoUI document={nestedCalls} view={view} />);
    expect(container.querySelectorAll('.arazzo-inspection-status')).toHaveLength(1);
    expect(container.querySelector('.arazzo-diagram-view')?.textContent ?? '').not.toContain(
      'have not been fetched or verified',
    );
    expect(container.querySelector('.arazzo-diagram-view')?.textContent ?? '').not.toContain(
      'does not establish schema validation',
    );
  }
});
