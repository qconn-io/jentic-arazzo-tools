// @vitest-environment jsdom
import React, { createRef } from 'react';
import { expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import type { ArazzoUIRef } from '../src/types/viewer';
vi.mock('../src/components/DocsView', async () => {
  const { useArazzoViewer } = await import('../src/context/ArazzoViewerContext');
  return {
    DocsView: () => {
      const ctx = useArazzoViewer();
      return (
        <div data-testid="docs">{ctx.inspection.diagnostics.map((d) => d.message).join(' ')}</div>
      );
    },
  };
});
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));

const input = {
  arazzo: '1.1.0',
  info: { title: 'loading', version: '1' },
  sourceDescriptions: [],
  workflows: [
    {
      workflowId: 'A',
      _internalId: 'authored-id',
      steps: [
        {
          stepId: 'init',
          operationId: 'get',
          onFailure: [{ reference: '$components.failureActions.missing', value: 0 }],
        },
      ],
    },
  ],
  'x-marker': false,
};

test('real component loading shows missing-reference warnings and getDocument retains authored content without decoration', async () => {
  const ref = createRef<ArazzoUIRef>();
  const original = structuredClone(input);
  render(<ArazzoUI document={input} ref={ref} />);
  await waitFor(() => expect(screen.getByTestId('docs').textContent).toContain('Missing reusable'));
  expect(ref.current?.getDocument()).toEqual(original);
  expect(input).toEqual(original);
});

test('fatal reusable expressions render a load-error card rather than a semantic view', async () => {
  const document = {
    ...input,
    workflows: [
      {
        workflowId: 'A',
        steps: [{ stepId: 'init', parameters: [{ reference: '$components.parameters' }] }],
      },
    ],
  };
  const { container } = render(<ArazzoUI document={document} />);
  await waitFor(() => expect(container.textContent).toContain('malformed reusable'));
  expect(screen.queryByTestId('docs')).toBeNull();
});

test('parseable unknown profiles display raw content, limitations and retrieval through the existing ref', async () => {
  const document = { ...input, arazzo: '1.2.0', unknown: { keep: false } };
  const ref = createRef<ArazzoUIRef>();
  const { container } = render(<ArazzoUI document={document} ref={ref} />);
  await waitFor(() => expect(container.querySelector('pre')?.textContent).toContain('unknown'));
  expect(screen.queryByTestId('docs')).toBeNull();
  expect(ref.current?.getDocument()).toEqual(document);
});
