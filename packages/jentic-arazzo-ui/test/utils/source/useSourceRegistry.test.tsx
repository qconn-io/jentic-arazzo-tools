// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useSourceRegistry } from '../../../src/utils/source/useSourceRegistry';
import { SourceDocumentContent } from '../../../src/types/source';

it('resets on document replacement and rerenders when registry state changes', async () => {
  let resolve!: (content: SourceDocumentContent) => void;
  const provider = {
    load: () =>
      new Promise<SourceDocumentContent>((done) => {
        resolve = done;
      }),
  };
  let renders = 0;
  const { result, rerender, unmount } = renderHook(
    ({ scope }) => {
      renders++;
      return useSourceRegistry(provider, undefined, scope);
    },
    { initialProps: { scope: {} } },
  );
  const registry = result.current;
  let pending!: Promise<SourceDocumentContent>;
  act(() => {
    pending = registry.acquire('https://example.com/api');
  });
  const rejection = expect(pending).rejects.toThrow('Aborted');
  await act(async () => {
    await Promise.resolve();
  });
  expect(renders).toBeGreaterThan(1);
  rerender({ scope: {} });
  expect(result.current).toBe(registry);
  expect(registry.getEntry('https://example.com/api')).toBeUndefined();
  resolve({ content: 'old', retrievalURI: 'https://example.com/api' });
  await act(async () => {
    await rejection;
  });
  expect(registry.getEntry('https://example.com/api')).toBeUndefined();
  unmount();
});
