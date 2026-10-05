// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createSnapshot } from '../src/utils/inspection';
import { ArazzoUI } from '../src/ArazzoUI';
const control = vi.hoisted(() => ({ loads: [] as Array<(value: unknown) => void> }));
vi.mock('../src/utils/loading/loadDocument', () => ({
  loadDocument: () => new Promise((resolve) => control.loads.push(resolve)),
}));
vi.mock('../src/components/DocsView', async () => {
  const { useArazzoViewer } = await import('../src/context/ArazzoViewerContext');
  return {
    DocsView: () => {
      const ctx = useArazzoViewer();
      return <div data-testid="title">{ctx.document.info.title}</div>;
    },
  };
});
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));
const doc = (title: string) => ({
  arazzo: '1.1.0',
  info: { title, version: '1' },
  sourceDescriptions: [],
  workflows: [],
});
test('an older asynchronous load cannot overwrite a replacement resolved first', async () => {
  control.loads = [];
  const old = doc('old');
  const replacement = doc('replacement');
  const { rerender } = render(<ArazzoUI document={old} />);
  rerender(<ArazzoUI document={replacement} />);
  await act(async () => {
    control.loads[1]({
      document: replacement,
      snapshot: createSnapshot(replacement),
      diagnostics: [],
    });
  });
  expect(screen.getByTestId('title').textContent).toBe('replacement');
  await act(async () => {
    control.loads[0]({ document: old, snapshot: createSnapshot(old), diagnostics: [] });
  });
  expect(screen.getByTestId('title').textContent).toBe('replacement');
});
