import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SourceRegistry } from '../../../src/utils/source/SourceRegistry';
import {
  SourceDocumentProvider,
  SourceDocumentContent,
  SourceDocumentRequest,
} from '../../../src/types/source';

describe('SourceRegistry', () => {
  let registry: SourceRegistry;
  let mockProvider: { load: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    registry = new SourceRegistry({
      maxConcurrent: 4,
      maxDocuments: 32,
      maxReferenceDepth: 8,
      maxSizeBytes: 10 * 1024 * 1024,
    });
    mockProvider = {
      load: vi.fn(),
    };
    registry.setProvider(mockProvider as unknown as SourceDocumentProvider);
  });

  it('resolves relative siblings with base URI', async () => {
    mockProvider.load.mockResolvedValue({
      content: 'test',
      retrievalURI: 'http://example.com/api.yaml',
    });

    await registry.acquire('api.yaml', undefined, 'http://example.com/base.yaml');

    expect(mockProvider.load).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'http://example.com/api.yaml',
      }),
    );
  });

  it('fails with absent upload base for relative URI', async () => {
    await expect(registry.acquire('api.yaml')).rejects.toThrow(
      'Relative URI provided without a base URI',
    );

    const entry = registry.getEntry('api.yaml');
    expect(entry?.state).toBe('absent-base');
  });

  it('handles provider replacement correctly (late results)', async () => {
    let resolveFirstLoad: (val: any) => void;
    mockProvider.load.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirstLoad = resolve;
      }),
    );

    const acquirePromise = registry.acquire('http://example.com/api.yaml');
    await Promise.resolve(); // Let semaphore resolve and load be called

    // Replace provider
    registry.setProvider({ load: vi.fn() } as unknown as SourceDocumentProvider);

    // Resolve first load
    resolveFirstLoad!({ content: 'test', retrievalURI: 'http://example.com/api.yaml' });

    await expect(acquirePromise).rejects.toThrow('Provider replaced during acquisition');
  });

  it('rejects on revision mismatch', async () => {
    mockProvider.load.mockResolvedValue({
      content: 'test',
      retrievalURI: 'http://example.com/api.yaml',
      revision: 'v2',
    });

    await expect(registry.acquire('http://example.com/api.yaml', 'v1')).rejects.toThrow(
      'Revision mismatch: requested v1, got v2',
    );
  });

  it('handles isolated source failures', async () => {
    const error = new Error('Network error');
    mockProvider.load.mockRejectedValue(error);

    await expect(registry.acquire('http://example.com/api.yaml')).rejects.toThrow('Network error');

    const entry = registry.getEntry('http://example.com/api.yaml');
    expect(entry?.state).toBe('failed');
    if (entry?.state === 'failed') {
      expect(entry.error).toBe(error);
    }
  });

  it('deduplicates requests for the same URI', async () => {
    let resolveLoad: (val: any) => void;
    mockProvider.load.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const p1 = registry.acquire('http://example.com/api.yaml');
    const p2 = registry.acquire('http://example.com/api.yaml');

    expect(p1).toBe(p2); // Should return the exact same promise
    await Promise.resolve(); // Let semaphore resolve
    expect(mockProvider.load).toHaveBeenCalledTimes(1);

    resolveLoad!({ content: 'test', retrievalURI: 'http://example.com/api.yaml' });
    await p1;
  });

  it('allows reloading to invalidate entries', async () => {
    mockProvider.load.mockResolvedValue({
      content: 'test',
      retrievalURI: 'http://example.com/api.yaml',
    });
    await registry.acquire('http://example.com/api.yaml');

    registry.reload('http://example.com/api.yaml');
    expect(registry.getEntry('http://example.com/api.yaml')).toBeUndefined();

    await registry.acquire('http://example.com/api.yaml');
    expect(mockProvider.load).toHaveBeenCalledTimes(2);
  });

  it('cancels loading on reload', async () => {
    let abortSignal: AbortSignal;
    mockProvider.load.mockImplementation((req: SourceDocumentRequest) => {
      abortSignal = req.signal!;
      return new Promise(() => {}); // never resolves
    });

    registry.acquire('http://example.com/api.yaml');
    await Promise.resolve(); // Let semaphore resolve
    registry.reload('http://example.com/api.yaml');

    expect(abortSignal!.aborted).toBe(true);
  });

  describe('limits', () => {
    it('enforces max documents', async () => {
      registry.budget.maxDocuments = 1;
      mockProvider.load.mockResolvedValue({ content: '1', retrievalURI: 'http://ex.com/1' });
      await registry.acquire('http://example.com/1');

      await expect(registry.acquire('http://example.com/2')).rejects.toThrow(
        'Maximum document count exceeded (1)',
      );

      expect(registry.getEntry('http://example.com/2')?.state).toBe('limit-exceeded');
    });

    it('enforces max reference depth', async () => {
      registry.budget.maxReferenceDepth = 2;
      await expect(
        registry.acquire('http://example.com/1', undefined, undefined, 2),
      ).rejects.toThrow('Maximum reference depth exceeded (2)');

      expect(registry.getEntry('http://example.com/1')?.state).toBe('limit-exceeded');
    });

    it('enforces max size limit', async () => {
      registry.budget.maxSizeBytes = 10;
      mockProvider.load.mockResolvedValue({
        content: 'this is a very long string that exceeds 10 bytes',
        retrievalURI: 'http://example.com/1',
      });

      await expect(registry.acquire('http://example.com/1')).rejects.toThrow(/Size limit exceeded/);

      expect(registry.getEntry('http://example.com/1')?.state).toBe('limit-exceeded');
    });

    it('enforces concurrency limit', async () => {
      registry.budget.maxConcurrent = 1;

      let resolveFirst: any;
      mockProvider.load.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      );
      mockProvider.load.mockReturnValueOnce(
        new Promise((resolve) => {
          resolve({ content: '2', retrievalURI: 'http://example.com/2' });
        }),
      );

      const p1 = registry.acquire('http://example.com/1');
      const p2 = registry.acquire('http://example.com/2');

      await Promise.resolve(); // Let semaphore resolve

      // p2 should be queued
      expect(mockProvider.load).toHaveBeenCalledTimes(1);

      resolveFirst({ content: '1', retrievalURI: 'http://example.com/1' });
      await p1;

      // after p1 resolves, p2 should start
      await p2;
      expect(mockProvider.load).toHaveBeenCalledTimes(2);
    });
  });
});
