// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { ArazzoUIStandalone } from '../src/ArazzoUIStandalone';
import { nestedCalls } from './fixtures/connected';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Element.prototype.scrollIntoView = vi.fn();
test.each([
  [false, undefined, 0],
  [false, 'automatic', 3],
  [false, 'manual', 0],
  [true, undefined, 3],
  [true, 'manual', 0],
  [true, 'automatic', 3],
] as const)(
  'entry standalone=%s policy=%s authorizes %s APIs',
  async (standalone, policy, count) => {
    const load = vi.fn(async ({ uri }: { uri: string }) => ({
      content: { openapi: '3.1.0', paths: {} },
      retrievalURI: uri,
    }));
    const Component = standalone ? ArazzoUIStandalone : ArazzoUI;
    render(
      <Component document={nestedCalls} sourceProvider={{ load }} apiDescriptionLoading={policy} />,
    );
    await screen.findByText(/^API descriptions ·/);
    await act(async () => {});
    expect(load).toHaveBeenCalledTimes(count);
  },
);
