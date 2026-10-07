import { describe, expect, it, vi } from 'vitest';

import { projectOpenAPI } from '../../../src/utils/contract/OpenAPIAdapter';
import { SourceRegistry } from '../../../src/utils/source/SourceRegistry';

const rootUri = 'https://test/api';
function root(ref = './shared#/Response') {
  return {
    openapi: '3.1.0',
    paths: { '/a': { get: { operationId: 'a', responses: { '200': { $ref: ref } } } } },
  };
}
describe('reference dependency reload', () => {
  it('refreshes transitive redirected refs and invalidates shared parents, retaining unrelated sources', async () => {
    const registry = new SourceRegistry();
    let revision = '1';
    const load = vi.fn(async ({ uri }: { uri: string }) => ({
      retrievalURI: uri === 'https://test/shared' ? 'https://cdn.test/shared' : uri,
      revision,
      content: uri.endsWith('/shared')
        ? { Response: { $ref: './inner#/Response' } }
        : uri.endsWith('/inner')
          ? { Response: { description: `revision ${revision}` } }
          : root(),
    }));
    registry.setProvider({ load });
    for (const uri of [rootUri, 'https://test/other']) {
      const content = await registry.acquire(uri);
      await projectOpenAPI(content.content, content.retrievalURI, registry, content.revision);
    }
    await registry.acquire('https://test/unrelated');
    revision = '2';
    registry.reload(rootUri);
    expect(registry.getEntry('https://test/other')).toBeUndefined();
    expect(registry.getEntry('https://test/unrelated')?.state).toBe('located');
    const content = await registry.acquire(rootUri);
    const facts = await projectOpenAPI(
      content.content,
      content.retrievalURI,
      registry,
      content.revision,
    );
    expect(facts.operations.get('a')?.responses).toEqual({ '200': { description: 'revision 2' } });
    expect(
      load.mock.calls.filter(([request]) => request.uri === 'https://test/shared'),
    ).toHaveLength(2);
    expect(
      load.mock.calls.filter(([request]) => request.uri === 'https://cdn.test/inner'),
    ).toHaveLength(2);
  });
  it('retries failed reference acquisitions on root reload', async () => {
    const registry = new SourceRegistry();
    let fail = true;
    registry.setProvider({
      load: async ({ uri }) => {
        if (uri === rootUri) return { retrievalURI: uri, content: root() };
        if (fail) throw new Error('unavailable dependency');
        return { retrievalURI: uri, content: { Response: { description: 'recovered' } } };
      },
    });
    let content = await registry.acquire(rootUri);
    const failed = await projectOpenAPI(content.content, rootUri, registry);
    expect(failed.unsupportedDiagnostics.join(' ')).toContain('unavailable dependency');
    fail = false;
    registry.reload(rootUri);
    content = await registry.acquire(rootUri);
    const recovered = await projectOpenAPI(content.content, rootUri, registry);
    expect(recovered.operations.get('a')?.responses).toEqual({
      '200': { description: 'recovered' },
    });
  });
  it('stops obsolete projection work after a cancelled dependency settles', async () => {
    const registry = new SourceRegistry();
    let settle!: (value: { content: object; retrievalURI: string }) => void;
    const load = vi.fn(async ({ uri }: { uri: string }) => {
      if (uri === rootUri) return { retrievalURI: uri, content: root('./slow#/Response') };
      if (uri === 'https://test/slow')
        return new Promise<{ content: object; retrievalURI: string }>((resolve) => {
          settle = resolve;
        });
      return { retrievalURI: uri, content: { Response: { description: 'must not load' } } };
    });
    registry.setProvider({ load });
    const content = await registry.acquire(rootUri);
    const projection = projectOpenAPI(content.content, rootUri, registry);
    const outcome = projection.then(
      () => 'published',
      () => 'obsolete',
    );
    await vi.waitFor(() => expect(settle).toBeDefined());
    registry.reload(rootUri);
    settle({
      retrievalURI: 'https://test/slow',
      content: { Response: { $ref: './late#/Response' } },
    });
    expect(await outcome).toBe('obsolete');
    expect(load.mock.calls.some(([request]) => request.uri.endsWith('/late'))).toBe(false);
    expect(registry.getEntry('https://test/slow')).toBeUndefined();
  });
});

it('tracks pinned parents separately when multiple revisions share a retrieval URI', async () => {
  const registry = new SourceRegistry();
  registry.setProvider({
    load: async ({ uri, revision }) => ({
      retrievalURI: uri,
      revision,
      content:
        uri === rootUri
          ? root(revision === 'r1' ? './one#/Response' : './two#/Response')
          : { Response: { description: uri } },
    }),
  });
  for (const revision of ['r1', 'r2']) {
    const acquired = await registry.acquire(rootUri, revision);
    await projectOpenAPI(acquired.content, rootUri, registry, revision);
  }
  registry.reload(rootUri, 'r1');
  expect(registry.getEntry('https://test/one')).toBeUndefined();
  expect(registry.getEntry(rootUri, 'r2')?.state).toBe('located');
  expect(registry.getEntry('https://test/two')?.state).toBe('located');
  registry.reload(rootUri, 'r2');
  expect(registry.getEntry('https://test/two')).toBeUndefined();
});

it('does not satisfy an unpinned acquisition with a cached pinned revision', async () => {
  const registry = new SourceRegistry();
  const load = vi.fn(async ({ uri, revision }: { uri: string; revision?: string }) => ({
    retrievalURI: uri,
    revision: revision ?? 'latest',
    content: root(),
  }));
  registry.setProvider({ load });
  await registry.acquire(rootUri, 'r1');
  const latest = await registry.acquire(rootUri);
  expect(latest.revision).toBe('latest');
  expect(load).toHaveBeenCalledTimes(2);
});

it('does not reuse an obsolete redirect alias after the root moves', async () => {
  const registry = new SourceRegistry();
  let destination = 'https://test/old';
  const load = vi.fn(async ({ uri }: { uri: string }) => ({
    retrievalURI: uri === rootUri ? destination : uri,
    content: { description: uri === rootUri ? destination : 'old URI acquired independently' },
  }));
  registry.setProvider({ load });
  await registry.acquire(rootUri);
  registry.reload(rootUri);
  destination = 'https://test/new';
  await registry.acquire(rootUri);
  const old = await registry.acquire('https://test/old');
  expect(old.retrievalURI).toBe('https://test/old');
  expect(load.mock.calls.filter(([request]) => request.uri === 'https://test/old')).toHaveLength(1);
});
