import { describe, expect, it } from 'vitest';
import { projectOpenAPI } from '../../../src/utils/contract/OpenAPIAdapter';
import { projectAsyncAPI } from '../../../src/utils/contract/AsyncAPIAdapter';
import { resolveScopedOperation } from '../../../src/utils/contract/OperationStatusResolver';
import { SourceRegistry } from '../../../src/utils/source/SourceRegistry';

describe('inspection contract fidelity', () => {
  it('retains duplicates, HTTP alternatives and inherited declarations', async () => {
    const facts = await projectOpenAPI(
      {
        openapi: '3.1.0',
        security: [{ key: [] }],
        servers: [{ url: '/api' }],
        paths: {
          '/a': {
            parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
            get: {
              operationId: 'duplicate',
              parameters: [{ name: 'q', in: 'query', schema: { type: 'integer' } }],
              responses: { '404': { description: 'absent' } },
              requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
            },
          },
          '/b': { get: { operationId: 'duplicate', security: [] } },
        },
      },
      'https://test/api',
      new SourceRegistry(),
      'r1',
    );
    expect(facts.operations.size).toBe(2);
    const op = [...facts.operations.values()][0];
    expect(op.security).toEqual([{ key: [] }]);
    expect(op.servers).toEqual([{ url: '/api' }]);
    expect(op.responses).toEqual({ '404': { description: 'absent' } });
    expect(op.parameters[0].schema).toEqual({ type: 'integer' });
    expect([...facts.operations.values()][1].security).toEqual([]);
    expect(
      resolveScopedOperation({ operationId: 'duplicate' }, [{ state: 'success', facts }]).status,
    ).toBe('ambiguous');
    expect(
      resolveScopedOperation({ operationPath: '#/paths/~1a/get' }, [{ state: 'success', facts }])
        .status,
    ).toBe('located');
  });
  it('preserves partial lookup and scoped document identity', async () => {
    const facts = await projectOpenAPI(
      { openapi: '3.0.0', paths: { '/a': { get: { operationId: 'get.a' } } } },
      'https://test/api',
      new SourceRegistry(),
    );
    expect(
      resolveScopedOperation({ operationId: 'get.a' }, [
        { state: 'success', facts },
        { state: 'idle' },
      ]).status,
    ).toBe('not-loaded');
    expect(
      resolveScopedOperation({ operationPath: 'https://other/api#/paths/~1a/get' }, [
        { state: 'success', facts },
      ]).status,
    ).toBe('missing');
  });
  it('preserves recursive references and reports unsupported schemas', async () => {
    const response = {
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } },
    };
    const requestBody = {
      content: {
        'application/json': { schema: { $schema: 'https://custom/schema', type: 'object' } },
      },
    };
    const facts = await projectOpenAPI(
      {
        openapi: '3.1.0',
        components: {
          schemas: {
            Node: { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } },
          },
        },
        paths: {
          '/a': { get: { operationId: 'a', responses: { '200': response } } },
          '/b': { get: { operationId: 'b', requestBody } },
        },
      },
      'https://test/api',
      new SourceRegistry(),
    );
    expect(facts.unsupportedDiagnostics.join(' ')).toMatch(/recursive|cycle/i);
    expect(facts.unsupportedDiagnostics.join(' ')).toContain('https://custom/schema');
    expect(() => JSON.stringify([...facts.operations.values()])).not.toThrow();
  });
  it('resolves event operation/channel/message refs with payload and correlation', async () => {
    const facts = await projectAsyncAPI(
      {
        asyncapi: '3.0.0',
        operations: { receive: { $ref: '#/components/operations/Receive' } },
        components: {
          operations: {
            Receive: {
              action: 'receive',
              channel: { $ref: '#/channels/orders' },
              messages: [{ $ref: '#/channels/orders/messages/created' }],
            },
          },
        },
        channels: {
          orders: {
            address: 'orders.created',
            messages: {
              created: {
                headers: { type: 'object' },
                payload: { type: 'string' },
                correlationId: { location: '$message.header#/id' },
              },
            },
          },
        },
      },
      'https://test/events',
      new SourceRegistry(),
    );
    const op = facts.operations.get('receive');
    expect(op?.address).toBe('orders.created');
    expect(op?.messages).toEqual([
      {
        headers: { type: 'object' },
        payload: { type: 'string' },
        correlationId: { location: '$message.header#/id' },
      },
    ]);
    expect(
      resolveScopedOperation({ channelPath: '#/channels/orders' }, [{ state: 'success', facts }])
        .status,
    ).toBe('located');
  });
  it('rejects unsupported versions before acquiring references', async () => {
    const registry = new SourceRegistry();
    registry.setProvider({
      load: async () => {
        throw new Error('must not acquire');
      },
    });
    const facts = await projectOpenAPI(
      { openapi: '3.2.0', paths: { '/a': { $ref: 'https://elsewhere/path' } } },
      'https://test/api',
      registry,
    );
    expect(facts.dialect).toBe('unsupported');
    expect(facts.rawContent).toEqual({
      openapi: '3.2.0',
      paths: { '/a': { $ref: 'https://elsewhere/path' } },
    });
  });
});

describe('reference provenance', () => {
  it('resolves encoded and chained operation references with channel identity', async () => {
    const facts = await projectAsyncAPI(
      {
        asyncapi: '3.0.0',
        operations: { wait: { $ref: '#/components/operations/purchase%20ready' } },
        components: {
          operations: {
            'purchase ready': { $ref: '#/components/operations/actual' },
            actual: { action: 'receive', channel: { $ref: '#/channels/orders' } },
          },
        },
        channels: { orders: { address: 'orders' } },
      },
      'https://test/events',
      new SourceRegistry(),
    );
    expect(facts.operations.get('wait')?.channelPointer).toBe('#/channels/orders');
    expect(
      resolveScopedOperation({ channelPath: '#/channels/orders' }, [{ state: 'success', facts }])
        .status,
    ).toBe('located');
  });
  it('resolves nested external references relative to returned retrieval URI', async () => {
    const registry = new SourceRegistry();
    registry.setProvider({
      load: async ({ uri }) => {
        if (uri === 'https://test/redirect.yaml')
          return {
            retrievalURI: 'https://cdn.test/contracts/outer.yaml',
            content: { $ref: 'inner.yaml' },
          };
        if (uri === 'https://cdn.test/contracts/inner.yaml')
          return { retrievalURI: uri, content: { type: 'string' } };
        throw new Error(`Unexpected URI ${uri}`);
      },
    });
    const facts = await projectOpenAPI(
      {
        openapi: '3.1.0',
        paths: {
          '/a': {
            get: {
              operationId: 'a',
              parameters: [{ name: 'q', in: 'query', schema: { $ref: 'redirect.yaml' } }],
            },
          },
        },
      },
      'https://test/api',
      registry,
    );
    expect(facts.operations.get('a')?.parameters[0].schema).toEqual({ $ref: 'redirect.yaml' });
    expect(facts.operations.get('a')?.schemaReferences).toContainEqual(
      expect.objectContaining({
        declaration: { type: 'string' },
        targetURI: 'https://cdn.test/contracts/inner.yaml',
      }),
    );
  });
});

it('retains schema property names that coincide with literal keywords', async () => {
  const facts = await projectOpenAPI(
    {
      openapi: '3.1.0',
      components: { schemas: { Value: { type: 'string' } } },
      paths: {
        '/a': {
          get: {
            operationId: 'a',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      example: { $ref: '#/components/schemas/Value' },
                      default: { $ref: '#/components/schemas/Value' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    'https://test/api',
    new SourceRegistry(),
  );
  const request = facts.operations.get('a')?.requestBody;
  expect(JSON.stringify(request)).toContain('$ref');
  expect(facts.operations.get('a')?.schemaReferences).toHaveLength(2);
});

it('retains external operation channel provenance', async () => {
  const registry = new SourceRegistry();
  registry.setProvider({
    load: async () => ({
      retrievalURI: 'https://test/components',
      content: {
        operation: { action: 'receive', channel: { $ref: '#/channels/orders' } },
        channels: { orders: { address: 'orders' } },
      },
    }),
  });
  const facts = await projectAsyncAPI(
    { asyncapi: '3.0.0', operations: { wait: { $ref: 'components#/operation' } } },
    'https://test/events',
    registry,
  );
  expect(facts.operations.get('wait')?.channelPointer).toBe(
    'https://test/components#/channels/orders',
  );
  expect(
    resolveScopedOperation({ channelPath: 'https://test/components#/channels/orders' }, [
      { state: 'success', facts },
    ]).status,
  ).toBe('located');
});

it('does not interpret schemas under an unsupported default dialect', async () => {
  const registry = new SourceRegistry();
  registry.setProvider({
    load: async () => {
      throw new Error('unsupported schemas must not acquire');
    },
  });
  const schema = { $ref: 'https://custom.test/schema' };
  const facts = await projectOpenAPI(
    {
      openapi: '3.1.0',
      jsonSchemaDialect: 'https://custom.test/dialect',
      paths: {
        '/a': { get: { operationId: 'a', parameters: [{ name: 'q', in: 'query', schema }] } },
      },
    },
    'https://test/api',
    registry,
  );
  expect(facts.operations.get('a')?.parameters[0].schema).toEqual(schema);
  expect(facts.unsupportedDiagnostics).toHaveLength(1);
  expect(facts.unsupportedDiagnostics[0]).toContain('https://custom.test/dialect');
});

it('allows eight external hops and retains the ninth reference', async () => {
  const registry = new SourceRegistry();
  registry.setProvider({
    load: async ({ uri }) => {
      const hop = Number(new URL(uri).pathname.slice(1));
      return { retrievalURI: uri, content: { $ref: `https://test/${hop + 1}` } };
    },
  });
  const facts = await projectOpenAPI(
    {
      openapi: '3.1.0',
      paths: {
        '/a': {
          get: {
            operationId: 'a',
            parameters: [{ name: 'q', in: 'query', schema: { $ref: 'https://test/1' } }],
          },
        },
      },
    },
    'https://test/api',
    registry,
  );
  expect(facts.operations.get('a')?.parameters[0].schema).toEqual({ $ref: 'https://test/1' });
  expect(facts.operations.get('a')?.schemaReferences).toContainEqual(
    expect.objectContaining({ authoredReference: 'https://test/9', status: 'unresolved' }),
  );
  expect(registry.getEntry('https://test/8')?.state).toBe('located');
  expect(registry.getEntry('https://test/9')).toBeUndefined();
});

it('preserves a schema with an unsupported local dialect before following its ref', async () => {
  const schema = { $schema: 'https://custom.test/dialect', $ref: '#/components/schemas/Value' };
  const facts = await projectOpenAPI(
    {
      openapi: '3.1.0',
      components: { schemas: { Value: { type: 'string' } } },
      paths: {
        '/a': { get: { operationId: 'a', parameters: [{ name: 'q', in: 'query', schema }] } },
      },
    },
    'https://test/api',
    new SourceRegistry(),
  );
  expect(facts.operations.get('a')?.parameters[0].schema).toEqual(schema);
  expect(facts.unsupportedDiagnostics.join(' ')).toContain('https://custom.test/dialect');
});

it('preserves operations when an authored ID collides with another operation pointer', async () => {
  const facts = await projectOpenAPI(
    {
      openapi: '3.1.0',
      paths: {
        '/a': { get: { operationId: 'duplicate' } },
        '/b': { get: { operationId: 'duplicate' } },
        '/c': { get: { operationId: '#/paths/~1a/get' } },
      },
    },
    'https://test/api',
    new SourceRegistry(),
  );
  expect(facts.operations.size).toBe(3);
  expect(
    resolveScopedOperation({ operationId: 'duplicate' }, [{ state: 'success', facts }]).status,
  ).toBe('ambiguous');
  expect(
    resolveScopedOperation({ operationId: '#/paths/~1a/get' }, [{ state: 'success', facts }])
      .operation?.path,
  ).toBe('/c');
});

describe('AsyncAPI schema formats', () => {
  it('retains unsupported payload/header formats with targeted diagnostics', async () => {
    const payload = {
      schemaFormat: 'application/vnd.apache.avro+json;version=1.9.0',
      schema: { $ref: '#/components/schemas/Value' },
    };
    const headers = {
      schemaFormat: 'application/vnd.google.protobuf;version=3',
      schema: 'message Header {}',
    };
    const facts = await projectAsyncAPI(
      {
        asyncapi: '3.0.0',
        components: { schemas: { Value: { type: 'string' } } },
        operations: { receive: { action: 'receive', channel: { $ref: '#/channels/orders' } } },
        channels: { orders: { address: 'orders', messages: { created: { payload, headers } } } },
      },
      'https://test/events',
      new SourceRegistry(),
    );
    expect(facts.operations.get('receive')?.messages).toEqual([{ payload, headers }]);
    expect(facts.unsupportedDiagnostics.join(' ')).toContain(
      'application/vnd.apache.avro+json;version=1.9.0',
    );
    expect(facts.unsupportedDiagnostics.join(' ')).toContain(
      'application/vnd.google.protobuf;version=3',
    );
  });
  it.each([
    'application/vnd.aai.asyncapi+json;version=3.0.0',
    'application/schema+json;version=draft-07',
    'application/vnd.oai.openapi+yaml;version=3.0.0',
  ])('inspects declared supported format %s', async (schemaFormat) => {
    const facts = await projectAsyncAPI(
      {
        asyncapi: '3.0.0',
        components: { schemas: { Value: { type: 'string' } } },
        operations: { receive: { action: 'receive', channel: { $ref: '#/channels/orders' } } },
        channels: {
          orders: {
            messages: {
              created: {
                payload: { schemaFormat, schema: { $ref: '#/components/schemas/Value' } },
              },
            },
          },
        },
      },
      'https://test/events',
      new SourceRegistry(),
    );
    expect(facts.operations.get('receive')?.messages).toEqual([
      { payload: { schemaFormat, schema: { $ref: '#/components/schemas/Value' } } },
    ]);
    expect(facts.unsupportedDiagnostics).toEqual([]);
  });
});
