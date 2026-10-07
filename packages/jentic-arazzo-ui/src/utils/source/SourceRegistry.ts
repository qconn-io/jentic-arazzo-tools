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

function estimateSize(obj: string | object): number {
  if (typeof obj === 'string') {
    return new TextEncoder().encode(obj).length;
  }
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch {
    throw new Error('Unable to measure source size: content must be serializable');
  }
}

export interface SourceValidityToken {
  key: string;
  generation: number;
  epoch: number;
}

export class SourceRegistry {
  private entries = new Map<string, RegistryEntryState>();
  private provider: SourceDocumentProvider | null = null;
  private providerGeneration = 0;
  private activeRequests = 0;
  private queue: Array<{ start: () => void; signal: AbortSignal }> = [];
  private listeners = new Set<() => void>();
  private version = 0;
  private reservations = new Set<string>();
  private epochs = new Map<string, number>();
  private dependencies = new Map<string, Set<string>>();
  private aliases = new Map<string, Set<string>>();

  constructor(public budget: SourceRegistryScopeBudget = { ...DEFAULT_REGISTRY_BUDGET }) {
    this.validateBudget();
  }

  private validateBudget(): void {
    for (const [name, value] of Object.entries(this.budget)) {
      if (!Number.isSafeInteger(value) || value < (name === 'maxReferenceDepth' ? 0 : 1)) {
        throw new Error(`Invalid source registry budget: ${name}`);
      }
    }
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getSnapshot = (): number => this.version;

  private notify(): void {
    this.version++;
    this.listeners.forEach((listener) => listener());
  }

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

  private resolveKey(uri: string, revision?: string): string {
    const canonical = this.resolveUri(uri).resolvedUri;
    const direct = this.getCacheKey(canonical, revision);
    if (this.entries.has(direct) || this.reservations.has(direct)) return direct;
    const aliases = [...(this.aliases.get(canonical) ?? [])];
    return (
      aliases.find((key) => this.entries.has(key) && JSON.parse(key)[1] === (revision ?? null)) ??
      direct
    );
  }

  public captureValidity(uri: string, revision?: string): SourceValidityToken {
    let key = this.resolveKey(uri, revision);
    // Adapters receive returned provenance, which need not have been a requested pin.
    if (!this.entries.has(key)) {
      const unpinned = this.resolveKey(uri);
      if (this.entries.has(unpinned)) key = unpinned;
    }
    return { key, generation: this.providerGeneration, epoch: this.epochs.get(key) ?? 0 };
  }

  public isCurrent(token: SourceValidityToken): boolean {
    return (
      token.generation === this.providerGeneration &&
      token.epoch === (this.epochs.get(token.key) ?? 0)
    );
  }

  public registerDependency(parentUri: string | SourceValidityToken, dependencyUri: string): void {
    const parent = typeof parentUri === 'string' ? this.resolveKey(parentUri) : parentUri.key;
    const child = this.resolveKey(dependencyUri);
    if (parent === child) return;
    const children = this.dependencies.get(parent) ?? new Set<string>();
    children.add(child);
    this.dependencies.set(parent, children);
  }

  public getEntry(uri: string, revision?: string): RegistryEntryState | undefined {
    return this.entries.get(this.resolveKey(uri, revision));
  }

  public resolveUri(uri: string, baseUri?: string): { resolvedUri: string; error?: string } {
    try {
      const url = new URL(uri);
      url.hash = '';
      return { resolvedUri: url.href };
    } catch {
      // Relative URI
      if (!baseUri) {
        return { resolvedUri: uri, error: 'Relative URI provided without a base URI' };
      }
      try {
        const url = new URL(uri, baseUri);
        url.hash = '';
        return { resolvedUri: url.href };
      } catch {
        return {
          resolvedUri: uri,
          error: `Invalid URI or base URI: ${uri} relative to ${baseUri}`,
        };
      }
    }
  }

  private acquireSemaphore(signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(new Error('Aborted'));
    if (this.activeRequests < this.budget.maxConcurrent) {
      this.activeRequests++;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const abort = () => {
        this.queue = this.queue.filter((queued) => queued !== item);
        reject(new Error('Aborted'));
      };
      const item = {
        signal,
        start: () => {
          signal.removeEventListener('abort', abort);
          this.activeRequests++;
          resolve();
        },
      };
      this.queue.push(item);
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  private releaseSemaphore(): void {
    this.activeRequests--;
    while (this.queue.length && this.activeRequests < this.budget.maxConcurrent) {
      const item = this.queue.shift()!;
      if (!item.signal.aborted) item.start();
    }
  }

  public acquire(
    uri: string,
    revision?: string,
    baseUri?: string,
    depth: number = 0,
  ): Promise<SourceDocumentContent> {
    this.validateBudget();
    if (!this.provider) {
      return Promise.reject(new Error('No source provider available'));
    }

    const { resolvedUri, error } = this.resolveUri(uri, baseUri);
    const cacheKey = this.resolveKey(resolvedUri, revision);

    if (error) {
      const state = { state: 'absent-base' as const, message: error };
      this.entries.set(cacheKey, state);
      this.notify();
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

    if (depth > this.budget.maxReferenceDepth) {
      const msg = `Maximum reference depth exceeded (${this.budget.maxReferenceDepth})`;
      this.entries.set(cacheKey, { state: 'limit-exceeded', message: msg });
      this.notify();
      return Promise.reject(new Error(msg));
    }

    if (this.reservations.size >= this.budget.maxDocuments) {
      const msg = `Maximum document count exceeded (${this.budget.maxDocuments})`;
      this.entries.set(cacheKey, { state: 'limit-exceeded', message: msg });
      this.notify();
      return Promise.reject(new Error(msg));
    }

    const controller = new AbortController();
    const generation = this.providerGeneration;
    const currentProvider = this.provider;

    this.reservations.add(cacheKey);
    const isCurrent = () =>
      this.providerGeneration === generation &&
      !controller.signal.aborted &&
      this.entries.get(cacheKey) === loading;
    let rejectAbort!: (error: Error) => void;
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = reject;
    });
    const abort = () =>
      rejectAbort(
        new Error(
          this.providerGeneration !== generation
            ? 'Provider replaced during acquisition'
            : 'Aborted',
        ),
      );
    controller.signal.addEventListener('abort', abort, { once: true });

    const acquisition = (async () => {
      await this.acquireSemaphore(controller.signal);
      try {
        if (controller.signal.aborted) throw new Error('Aborted');
        // Keep the physical slot until load settles, even if the provider ignores abort.
        const content = await currentProvider.load({
          uri: resolvedUri,
          revision,
          signal: controller.signal,
        });
        if (!isCurrent()) throw new Error('Aborted');
        if (revision !== undefined && revision !== content.revision) {
          throw new Error(
            `Revision mismatch: requested ${revision}, got ${content.revision ?? 'no revision'}`,
          );
        }
        const size = estimateSize(content.content);
        if (size > this.budget.maxSizeBytes) {
          throw new Error(`Size limit exceeded (${size} > ${this.budget.maxSizeBytes})`);
        }
        for (const [alias, keys] of this.aliases) {
          keys.delete(cacheKey);
          if (!keys.size) this.aliases.delete(alias);
        }
        const retrievalURI = this.resolveUri(content.retrievalURI).resolvedUri;
        const aliases = this.aliases.get(retrievalURI) ?? new Set<string>();
        aliases.add(cacheKey);
        this.aliases.set(retrievalURI, aliases);
        this.entries.set(cacheKey, { state: 'located', content });
        this.notify();
        return content;
      } catch (err) {
        if (isCurrent()) {
          this.reservations.delete(cacheKey);
          const error = err instanceof Error ? err : new Error(String(err));
          this.entries.set(
            cacheKey,
            error.message.includes('Size limit exceeded')
              ? { state: 'limit-exceeded', message: error.message }
              : { state: 'failed', error },
          );
          this.notify();
        }
        throw err;
      } finally {
        this.releaseSemaphore();
      }
    })();
    const promise = Promise.race([acquisition, aborted]).finally(() => {
      controller.signal.removeEventListener('abort', abort);
    });
    const loading: Extract<RegistryEntryState, { state: 'loading' }> = {
      state: 'loading',
      promise,
      controller,
    };
    this.entries.set(cacheKey, loading);
    this.notify();
    return promise;
  }

  public reload(uri: string, revision?: string, baseUri?: string): void {
    const { resolvedUri } = this.resolveUri(uri, baseUri);
    const root = this.resolveKey(resolvedUri, revision);
    const invalidated = new Set<string>();
    const visit = (key: string) => {
      if (invalidated.has(key)) return;
      invalidated.add(key);
      for (const child of this.dependencies.get(key) ?? []) visit(child);
    };
    visit(root);
    // Invalidate ancestors' facts too, without discarding their unrelated dependencies.
    let changed = true;
    while (changed) {
      changed = false;
      for (const [parent, children] of this.dependencies) {
        if (!invalidated.has(parent) && [...children].some((child) => invalidated.has(child))) {
          invalidated.add(parent);
          changed = true;
        }
      }
    }
    for (const key of invalidated) {
      this.epochs.set(key, (this.epochs.get(key) ?? 0) + 1);
      const entry = this.entries.get(key);
      if (entry?.state === 'loading') entry.controller.abort();
      this.entries.delete(key);
      this.reservations.delete(key);
      this.dependencies.delete(key);
    }
    for (const [uri, aliases] of this.aliases) {
      for (const key of invalidated) aliases.delete(key);
      if (!aliases.size) this.aliases.delete(uri);
    }
    // Existing validity tokens keep their original key; aliases are only for live content.
    this.notify();
  }

  public cancelAll(): void {
    for (const entry of this.entries.values()) {
      if (entry.state === 'loading') {
        entry.controller.abort();
      }
    }
    this.providerGeneration++;
    this.entries.clear();
    this.reservations.clear();
    this.dependencies.clear();
    this.aliases.clear();
    this.epochs.clear();
    this.notify();
  }

  private getCacheKey(uri: string, revision?: string): string {
    return JSON.stringify([uri, revision ?? null]);
  }
}
