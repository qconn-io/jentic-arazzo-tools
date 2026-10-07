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

    const pending = registry.acquire('http://example.com/api.yaml');
    const rejection = expect(pending).rejects.toThrow('Aborted');
    await Promise.resolve(); // Let semaphore resolve
    registry.reload('http://example.com/api.yaml');

    expect(abortSignal!.aborted).toBe(true);
    await rejection;
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
        registry.acquire('http://example.com/1', undefined, undefined, 3),
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

const result = (content = 'ok'): SourceDocumentContent => ({
  content,
  retrievalURI: 'https://example.com/api',
});
const deferred = () => {
  let resolve!: (value: SourceDocumentContent) => void;
  const promise = new Promise<SourceDocumentContent>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('registry invalidation and provenance', () => {
  it('rejects pinned content without revision provenance', async () => {
    const registry = new SourceRegistry();
    registry.setProvider({ load: async () => result() });
    await expect(registry.acquire('https://example.com/api', 'pinned')).rejects.toThrow(
      'Revision mismatch',
    );
  });

  it.each(['reload', 'cancelAll'] as const)(
    '%s ignores late completion and preserves a replacement',
    async (action) => {
      const registry = new SourceRegistry();
      const first = deferred();
      const second = deferred();
      let calls = 0;
      registry.setProvider({ load: () => (++calls === 1 ? first.promise : second.promise) });
      const old = registry.acquire('https://example.com/api');
      const rejected = expect(old).rejects.toThrow(/Abort/);
      await Promise.resolve();
      if (action === 'reload') registry.reload('https://example.com/api');
      else registry.cancelAll();
      const replacement = registry.acquire('https://example.com/api');
      await Promise.resolve();
      second.resolve(result('new'));
      await replacement;
      first.resolve(result('old'));
      await rejected;
      expect(registry.getEntry('https://example.com/api')).toMatchObject({
        state: 'located',
        content: { content: 'new' },
      });
    },
  );

  it('keeps physical concurrency bounded when a cancelled provider ignores abort', async () => {
    const registry = new SourceRegistry({
      maxConcurrent: 1,
      maxDocuments: 3,
      maxReferenceDepth: 8,
      maxSizeBytes: 100,
    });
    const first = deferred();
    let calls = 0;
    registry.setProvider({
      load: () => {
        calls++;
        return first.promise;
      },
    });
    const old = registry.acquire('https://example.com/old');
    const rejection = old.catch(() => undefined);
    await Promise.resolve();
    registry.cancelAll();
    registry.setProvider({
      load: async () => {
        calls++;
        return result();
      },
    });
    const current = registry.acquire('https://example.com/new');
    await Promise.resolve();
    expect(calls).toBe(1);
    first.resolve(result());
    await rejection;
    await current;
    expect(calls).toBe(2);
  });

  it('counts acquisitions rather than failed and limit markers', async () => {
    const registry = new SourceRegistry({
      maxConcurrent: 1,
      maxDocuments: 1,
      maxReferenceDepth: 1,
      maxSizeBytes: 100,
    });
    registry.setProvider({
      load: async ({ uri }) => {
        if (uri.endsWith('bad')) throw new Error('bad');
        return result();
      },
    });
    await expect(registry.acquire('relative')).rejects.toThrow();
    await expect(
      registry.acquire('https://example.com/deep', undefined, undefined, 2),
    ).rejects.toThrow();
    await expect(registry.acquire('https://example.com/bad')).rejects.toThrow('bad');
    await expect(registry.acquire('https://example.com/good')).resolves.toEqual(result());
  });

  it('deduplicates canonical document URIs independently of fragments', async () => {
    const registry = new SourceRegistry();
    let calls = 0;
    registry.setProvider({
      load: async () => {
        calls++;
        return result();
      },
    });
    await registry.acquire('https://example.com/api#/one');
    await registry.acquire('https://example.com/api#/two');
    expect(calls).toBe(1);
    expect(registry.getEntry('https://example.com/api#/two')?.state).toBe('located');
  });

  it.each([0, -1, NaN, Infinity, 1.5])('rejects invalid concurrency budget %s', (maxConcurrent) => {
    expect(
      () =>
        new SourceRegistry({
          maxConcurrent,
          maxDocuments: 1,
          maxReferenceDepth: 1,
          maxSizeBytes: 100,
        }),
    ).toThrow(/budget/i);
  });
});

it('cancels queued acquisitions without starting their provider loads', async () => {
  const registry = new SourceRegistry({
    maxConcurrent: 1,
    maxDocuments: 3,
    maxReferenceDepth: 8,
    maxSizeBytes: 100,
  });
  const first = deferred();
  const visited: string[] = [];
  registry.setProvider({
    load: ({ uri }) => {
      visited.push(uri);
      return first.promise;
    },
  });
  const active = registry.acquire('https://example.com/active');
  const queued = registry.acquire('https://example.com/queued');
  const rejected = Promise.all([
    expect(active).rejects.toThrow('Aborted'),
    expect(queued).rejects.toThrow('Aborted'),
  ]);
  await Promise.resolve();
  const generation = registry.getProviderGeneration();
  registry.cancelAll();
  await rejected;
  expect(registry.getProviderGeneration()).toBeGreaterThan(generation);
  first.resolve(result());
  await Promise.resolve();
  expect(visited).toEqual(['https://example.com/active']);
  expect(registry.getEntry('https://example.com/active')).toBeUndefined();
  expect(registry.getEntry('https://example.com/queued')).toBeUndefined();
});

it.each(['maxDocuments', 'maxReferenceDepth', 'maxSizeBytes'] as const)(
  'rejects nonfinite %s budgets',
  (field) => {
    expect(
      () =>
        new SourceRegistry({
          maxConcurrent: 1,
          maxDocuments: 3,
          maxReferenceDepth: 8,
          maxSizeBytes: 100,
          [field]: Infinity,
        }),
    ).toThrow(/budget/i);
  },
);

it('rejects source objects whose size cannot be measured', async () => {
  const registry = new SourceRegistry({
    maxConcurrent: 1,
    maxDocuments: 1,
    maxReferenceDepth: 8,
    maxSizeBytes: 10,
  });
  const content: { value: string; self?: object } = { value: 'oversized source content' };
  content.self = content;
  registry.setProvider({
    load: async () => ({ content, retrievalURI: 'https://example.com/api' }),
  });
  await expect(registry.acquire('https://example.com/api')).rejects.toThrow(
    'Unable to measure source size',
  );
  expect(registry.getEntry('https://example.com/api')?.state).toBe('failed');
});
