import { describe, expect, it } from 'vitest';

import { projectOpenAPI } from '../../../src/utils/contract/OpenAPIAdapter';
import { projectAsyncAPI } from '../../../src/utils/contract/AsyncAPIAdapter';
import { resolveScopedOperation } from '../../../src/utils/contract/OperationStatusResolver';
import { SourceRegistry } from '../../../src/utils/source/SourceRegistry';

const uri = 'https://test/api.yaml';
describe('operation pointer identity', () => {
  it.each(['/a', '/a b', '/é/雪', '/a%20b', '/a~b/c'])('locates encoded path %s', async (path) => {
    const facts = await projectOpenAPI(
      { openapi: '3.1.0', paths: { [path]: { get: { operationId: 'run' } } } },
      uri,
      new SourceRegistry(),
    );
    const token = path.replace(/~/g, '~0').replace(/\//g, '~1');
    const pointer = `#/paths/${encodeURIComponent(token).replace(/~/g, '%7E')}/get`;
    expect(
      resolveScopedOperation({ operationPath: pointer }, [{ state: 'success', facts }]).status,
    ).toBe('located');
    expect(
      resolveScopedOperation({ operationPath: `https://other/api.yaml${pointer}` }, [
        { state: 'success', facts },
      ]).status,
    ).toBe('missing');
  });
  it('locates an encoded event channel without changing candidate ambiguity', async () => {
    const facts = await projectAsyncAPI(
      {
        asyncapi: '3.0.0',
        operations: {
          wait: { action: 'receive', channel: { $ref: '#/channels/a%20b' } },
        },
        channels: { 'a b': { address: 'topic' } },
      },
      uri,
      new SourceRegistry(),
    );
    expect(
      resolveScopedOperation({ channelPath: '#/channels/%61%20b' }, [{ state: 'success', facts }])
        .status,
    ).toBe('located');
    expect(
      resolveScopedOperation({ channelPath: '#/channels/%61%20b' }, [
        { state: 'success', facts },
        { state: 'success', facts },
      ]).status,
    ).toBe('ambiguous');
  });
  it.each(['#/paths/%ZZ/get', '#/paths/~2a/get', '#/paths/~1a~/get'])(
    'diagnoses malformed pointer %s',
    async (pointer) => {
      const facts = await projectOpenAPI(
        { openapi: '3.1.0', paths: { '/a': { get: {} } } },
        uri,
        new SourceRegistry(),
      );
      const result = resolveScopedOperation({ operationPath: pointer }, [
        { state: 'success', facts },
      ]);
      expect(result.status).toBe('unsupported');
      expect(result.diagnostics?.join(' ')).toMatch(/pointer|encoding/i);
    },
  );
});

it('keeps malformed event channel references inspectable alongside healthy operations', async () => {
  const facts = await projectAsyncAPI(
    {
      asyncapi: '3.0.0',
      operations: {
        bad: { action: 'receive', channel: { $ref: '#/channels/bad~2key' } },
        good: { action: 'send', channel: { $ref: '#/channels/topic' } },
      },
      channels: { topic: { address: 'topic' } },
    },
    uri,
    new SourceRegistry(),
  );
  expect(facts.operations.get('good')?.address).toBe('topic');
  expect(facts.operations.get('bad')?.channelPointer).toBe('#/channels/bad~2key');
  expect(facts.unsupportedDiagnostics.join(' ')).toMatch(/Invalid JSON Pointer/);
});
