import { createServer } from 'node:http';
import { it, expect } from 'vitest';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { projectArazzo } from '../src/utils/contract/ArazzoAdapter';
import { SourceRegistry } from '../src/utils/source/SourceRegistry';
import { consumerWorkflow } from './fixtures/upstream-readiness';

it('retains a recursive external schema and still expands an unrelated local schema', async () => {
  const registry = new SourceRegistry();
  registry.setProvider({
    async load({ uri }) {
      return {
        content: { $ref: '#/$defs/loop', $defs: { loop: { $ref: '#/$defs/loop' } } },
        retrievalURI: uri,
      };
    },
  });
  const flow = consumerWorkflow();
  flow.components = { inputs: { valid: { type: 'string' } } };
  flow.workflows[0].inputs = { $ref: '#/components/inputs/valid' };
  flow.workflows[1].inputs = { $ref: './recursive.json' };
  const model = await projectArazzo(flow, 'https://example.test/flow.json', registry);
  expect(model.document.workflows[0].inputs).toEqual({ type: 'string' });
  expect(model.document.workflows[1].inputs).toEqual({ $ref: './recursive.json' });
  expect(
    model.inspection.snapshot.diagnostics?.some((d) => /circular|recursive/i.test(d.message)),
  ).toBe(true);
});

it('resolves external schema children against the returned retrieval URI', async () => {
  const requested: string[] = [];
  const registry = new SourceRegistry();
  registry.setProvider({
    async load({ uri }) {
      requested.push(uri);
      if (uri === 'https://example.test/input.json')
        return {
          content: { type: 'object', properties: { amount: { $ref: './amount.json' } } },
          retrievalURI: 'https://cdn.example.test/schemas/input.json',
          revision: 'schema-v1',
        };
      if (uri === 'https://cdn.example.test/schemas/amount.json')
        return { content: { type: 'integer' }, retrievalURI: uri, revision: 'amount-v1' };
      throw new Error(`Wrong declaring base: ${uri}`);
    },
  });
  const flow = consumerWorkflow();
  flow.workflows[1].inputs = { $ref: './input.json' };
  const model = await projectArazzo(flow, 'https://example.test/flow.json', registry);
  expect(requested).toEqual([
    'https://example.test/input.json',
    'https://cdn.example.test/schemas/amount.json',
  ]);
  expect(model.document.workflows[1].inputs).toEqual({
    type: 'object',
    properties: { amount: { type: 'integer' } },
  });
});

it('never interprets supplied content as a retrieval address', async () => {
  let hits = 0;
  const server = createServer((_request, response) => {
    hits++;
    response.end(JSON.stringify(consumerWorkflow()));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture server port');
    const content = `http://127.0.0.1:${address.port}/flow.json`;
    await expect(loadDocument(content, { contentOnly: true })).rejects.toThrow(
      'No contract object',
    );
    expect(hits).toBe(0);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it('acquires only the selected primary URL while leaving its external input schema authored', async () => {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url ?? '');
    response.setHeader('Content-Type', 'application/json');
    const flow = consumerWorkflow();
    flow.workflows[1].inputs = { $ref: './schema.json' };
    response.end(JSON.stringify(request.url === '/flow.json' ? flow : { type: 'object' }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture server port');
    const uri = `http://127.0.0.1:${address.port}/flow.json`;
    const loaded = await loadDocument(uri);
    expect(requests).toEqual(['/flow.json']);
    expect(loaded.snapshot.retrievalURI).toBe(uri);
    expect(loaded.document.workflows[1].inputs).toEqual({ $ref: './schema.json' });
    expect(loaded.diagnostics.some((d) => d.originalReference === './schema.json')).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
