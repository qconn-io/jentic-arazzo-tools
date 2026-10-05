import { SourceDocumentProvider, SourceDocumentContent } from '../../types/source';

export interface SourceRegistryScopeBudget {
  maxConcurrent: number;
  maxDocuments: number;
  maxReferenceDepth: number;
  maxSizeBytes: number;
}

export const DEFAULT_REGISTRY_BUDGET: SourceRegistryScopeBudget = {
  maxConcurrent: 4,
  maxDocuments: 32,
  maxReferenceDepth: 8,
  maxSizeBytes: 10 * 1024 * 1024, // 10 MiB
};

export type RegistryEntryState =
  | { state: 'loading'; promise: Promise<SourceDocumentContent>; controller: AbortController }
  | { state: 'located'; content: SourceDocumentContent }
  | { state: 'failed'; error: Error }
  | { state: 'absent-base'; message: string }
  | { state: 'limit-exceeded'; message: string };

function estimateSize(obj: any): number {
  if (typeof obj === 'string') {
    // Rough estimate of UTF-8 byte size for string
    return new TextEncoder().encode(obj).length;
  }
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch {
    return 0;
  }
}

export class SourceRegistry {
  private entries = new Map<string, RegistryEntryState>();
  private provider: SourceDocumentProvider | null = null;
  private providerGeneration = 0;
  private activeRequests = 0;
  private queue: Array<() => void> = [];

  constructor(public budget: SourceRegistryScopeBudget = DEFAULT_REGISTRY_BUDGET) {}

  public setProvider(provider: SourceDocumentProvider | null) {
    if (this.provider !== provider) {
      this.provider = provider;
      this.providerGeneration++;
      this.cancelAll(); // On provider replacement, cancel inflight requests
    }
  }

  public getProviderGeneration(): number {
    return this.providerGeneration;
  }

  public getEntry(uri: string, revision?: string): RegistryEntryState | undefined {
    return this.entries.get(this.getCacheKey(uri, revision));
  }

  public resolveUri(uri: string, baseUri?: string): { resolvedUri: string; error?: string } {
    try {
      return { resolvedUri: new URL(uri).href };
    } catch {
      // Relative URI
      if (!baseUri) {
        return { resolvedUri: uri, error: 'Relative URI provided without a base URI' };
      }
      try {
        return { resolvedUri: new URL(uri, baseUri).href };
      } catch (e) {
        return {
          resolvedUri: uri,
          error: `Invalid URI or base URI: ${uri} relative to ${baseUri}`,
        };
      }
    }
  }

  private async acquireSemaphore(): Promise<void> {
    if (this.activeRequests < this.budget.maxConcurrent) {
      this.activeRequests++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  private releaseSemaphore(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      resolve();
    } else {
      this.activeRequests--;
    }
  }

  public acquire(
    uri: string,
    revision?: string,
    baseUri?: string,
    depth: number = 0,
  ): Promise<SourceDocumentContent> {
    if (!this.provider) {
      return Promise.reject(new Error('No source provider available'));
    }

    const { resolvedUri, error } = this.resolveUri(uri, baseUri);
    const cacheKey = this.getCacheKey(resolvedUri, revision);

    if (error) {
      const state = { state: 'absent-base' as const, message: error };
      this.entries.set(cacheKey, state);
      return Promise.reject(new Error(error));
    }

    const existing = this.entries.get(cacheKey);
    if (existing) {
      if (existing.state === 'loading') return existing.promise;
      if (existing.state === 'located') return Promise.resolve(existing.content);
      if (existing.state === 'failed') return Promise.reject(existing.error);
      if (existing.state === 'absent-base') return Promise.reject(new Error(existing.message));
      if (existing.state === 'limit-exceeded') return Promise.reject(new Error(existing.message));
    }

    if (depth >= this.budget.maxReferenceDepth) {
      const msg = `Maximum reference depth exceeded (${this.budget.maxReferenceDepth})`;
      this.entries.set(cacheKey, { state: 'limit-exceeded', message: msg });
      return Promise.reject(new Error(msg));
    }

    if (!existing && this.entries.size >= this.budget.maxDocuments) {
      const msg = `Maximum document count exceeded (${this.budget.maxDocuments})`;
      this.entries.set(cacheKey, { state: 'limit-exceeded', message: msg });
      return Promise.reject(new Error(msg));
    }

    const controller = new AbortController();
    const generation = this.providerGeneration;
    const currentProvider = this.provider;

    const promise = (async () => {
      await this.acquireSemaphore();
      try {
        if (controller.signal.aborted) {
          throw new Error('Aborted');
        }

        const content = await currentProvider.load({
          uri: resolvedUri,
          revision,
          signal: controller.signal,
        });

        if (this.providerGeneration !== generation) {
          throw new Error('Provider replaced during acquisition');
        }

        if (revision && content.revision && revision !== content.revision) {
          throw new Error(`Revision mismatch: requested ${revision}, got ${content.revision}`);
        }

        const size = estimateSize(content.content);
        if (size > this.budget.maxSizeBytes) {
          throw new Error(`Size limit exceeded (${size} > ${this.budget.maxSizeBytes})`);
        }

        this.entries.set(cacheKey, { state: 'located', content });
        return content;
      } catch (err) {
        if (this.providerGeneration === generation) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes('Size limit exceeded')) {
            this.entries.set(cacheKey, { state: 'limit-exceeded', message: errMsg });
          } else {
            this.entries.set(cacheKey, { state: 'failed', error: err as Error });
          }
        }
        throw err;
      } finally {
        this.releaseSemaphore();
      }
    })();

    this.entries.set(cacheKey, { state: 'loading', promise, controller });
    return promise;
  }

  public reload(uri: string, revision?: string, baseUri?: string): void {
    const { resolvedUri } = this.resolveUri(uri, baseUri);
    const cacheKey = this.getCacheKey(resolvedUri, revision);
    const existing = this.entries.get(cacheKey);
    if (existing && existing.state === 'loading') {
      existing.controller.abort();
    }
    this.entries.delete(cacheKey);
  }

  public cancelAll(): void {
    for (const entry of this.entries.values()) {
      if (entry.state === 'loading') {
        entry.controller.abort();
      }
    }
    this.entries.clear();
    // Also clear the queue to prevent hanging requests from starting
    for (const resolve of this.queue) {
      resolve(); // Let them fail on AbortController signal
    }
    this.queue = [];
    this.activeRequests = 0;
  }

  private getCacheKey(uri: string, revision?: string): string {
    return revision ? `${uri}@@${revision}` : uri;
  }
}
