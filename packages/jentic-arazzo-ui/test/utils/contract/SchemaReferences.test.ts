import { describe, expect, it, vi } from 'vitest';

import { projectOpenAPI } from '../../../src/utils/contract/OpenAPIAdapter';
import { projectAsyncAPI } from '../../../src/utils/contract/AsyncAPIAdapter';
import { SourceRegistry } from '../../../src/utils/source/SourceRegistry';

const uri = 'https://test/api.yaml';
function http(schema: object | boolean, schemas: object = {}) {
  return {
    openapi: '3.1.0',
    components: { schemas },
    paths: {
      '/a': {
        post: {
          operationId: 'a',
          requestBody: { content: { 'application/json': { schema } } },
        },
      },
      '/b': { get: { operationId: 'b' } },
    },
  };
}
function event(payload: object) {
  return {
    asyncapi: '3.0.0',
    components: { schemas: { Value: { type: 'string' } } },
    operations: { wait: { action: 'receive', channel: { $ref: '#/channels/topic' } } },
    channels: { topic: { messages: { message: { payload } } } },
  };
}
describe('authored schemas and separately inspected targets', () => {
  it('retains conflicting siblings and referenced declarations per operation', async () => {
    const base = { type: 'object', required: ['id'], properties: { id: { type: 'string' } } };
    const schema = {
      $ref: '#/components/schemas/Base',
      type: 'string',
      required: ['name'],
      properties: { name: { type: 'string' } },
    };
    const facts = await projectOpenAPI(
      http(schema, { Base: base }),
      uri,
      new SourceRegistry(),
      'r1',
    );
    const operation = facts.operations.get('a')!;
    expect(operation.requestBody).toEqual({ content: { 'application/json': { schema } } });
    expect(operation.schemaReferences).toEqual([
      expect.objectContaining({
        authoredReference: schema.$ref,
        declaringURI: uri,
        targetURI: uri,
        revision: 'r1',
        targetPointer: '#/components/schemas/Base',
        declaration: base,
        status: 'located',
        occurrence: '#/paths/~1a/post/requestBody/content/application~1json/schema',
      }),
    ]);
    expect(facts.operations.get('b')?.schemaReferences).toEqual([]);
  });
  it('keeps booleans, nested and recursive references finite', async () => {
    const schema = { $ref: '#/components/schemas/Node' };
    const node = { properties: { child: schema, never: { $ref: '#/components/schemas/Never' } } };
    const facts = await projectOpenAPI(
      http(schema, { Node: node, Never: false }),
      uri,
      new SourceRegistry(),
    );
    const references = facts.operations.get('a')!.schemaReferences!;
    expect(references).toContainEqual(
      expect.objectContaining({ declaration: false, status: 'located' }),
    );
    expect(references).toContainEqual(expect.objectContaining({ status: 'recursive' }));
    expect(JSON.stringify(facts.operations.get('a')?.requestBody)).toContain(schema.$ref);
    expect(() => JSON.stringify(references)).not.toThrow();
  });
  it('resolves chained external targets including boolean documents with provenance', async () => {
    const registry = new SourceRegistry();
    registry.setProvider({
      load: async ({ uri: requested }) => ({
        retrievalURI: requested,
        revision: 'external-r1',
        content: requested.endsWith('outer') ? { $ref: './inner' } : 'false',
      }),
    });
    const facts = await projectOpenAPI(http({ $ref: './outer' }), uri, registry);
    expect(facts.operations.get('a')?.schemaReferences).toContainEqual(
      expect.objectContaining({
        targetURI: 'https://test/inner',
        declaration: false,
        revision: 'external-r1',
        status: 'located',
      }),
    );
  });
  it('ignores literal payloads while traversing schema maps and combinators', async () => {
    const ref = { $ref: '#/components/schemas/Value' };
    const schema = {
      properties: { example: ref, default: ref },
      dependentSchemas: { x: ref },
      allOf: [ref],
      example: ref,
      default: ref,
      enum: [ref],
      'x-data': ref,
    };
    const facts = await projectOpenAPI(
      http(schema, { Value: { type: 'string' } }),
      uri,
      new SourceRegistry(),
    );
    expect(facts.operations.get('a')?.schemaReferences).toHaveLength(4);
    expect(facts.operations.get('a')?.requestBody).toEqual({
      content: { 'application/json': { schema } },
    });
  });
  it.each([
    { $schema: 'https://custom/dialect', $ref: './must-not-load' },
    { $id: 'https://other/schema', properties: { x: { $ref: './must-not-load' } } },
    { $ref: '#named-anchor' },
  ])('diagnoses unsupported schema identities before acquisition: %j', async (schema) => {
    const registry = new SourceRegistry();
    const load = vi.fn();
    registry.setProvider({ load });
    const facts = await projectOpenAPI(http(schema), uri, registry);
    expect(load).not.toHaveBeenCalled();
    expect(facts.unsupportedDiagnostics.join(' ')).toMatch(/unsupported/i);
  });
  it('retains event payload and header refs as schema declarations', async () => {
    const payload = { $ref: '#/components/schemas/Value', minLength: 2 };
    const facts = await projectAsyncAPI(event(payload), uri, new SourceRegistry());
    expect(facts.operations.get('wait')?.messages).toEqual([{ payload }]);
    expect(facts.operations.get('wait')?.schemaReferences).toContainEqual(
      expect.objectContaining({ declaration: { type: 'string' }, status: 'located' }),
    );
  });
  it('does not apply schema sibling merging to OpenAPI Reference Objects', async () => {
    const facts = await projectOpenAPI(
      {
        openapi: '3.0.3',
        components: { responses: { R: { description: 'original' } } },
        paths: {
          '/a': {
            get: {
              operationId: 'a',
              responses: {
                '200': {
                  $ref: '#/components/responses/R',
                  description: 'ignored',
                  content: { fabricated: {} },
                },
              },
            },
          },
        },
      },
      uri,
      new SourceRegistry(),
    );
    expect(facts.operations.get('a')?.responses).toEqual({ '200': { description: 'original' } });
  });
});

it.each([{ $id: 'https://other.test/scope/' }, { $schema: 'https://custom.test/dialect' }])(
  'checks enclosing schema context when a pointer jumps into a nested schema: %j',
  async (context) => {
    const registry = new SourceRegistry();
    const load = vi.fn(async ({ uri }: { uri: string }) => ({
      retrievalURI: uri,
      content: { type: 'string' },
    }));
    registry.setProvider({ load });
    const facts = await projectOpenAPI(
      http(
        { $ref: '#/components/schemas/Outer/properties/nested' },
        { Outer: { ...context, properties: { nested: { $ref: 'leaf.json' } } } },
      ),
      uri,
      registry,
    );
    expect(load).not.toHaveBeenCalled();
    expect(facts.unsupportedDiagnostics.join(' ')).toMatch(/unsupported/i);
    expect(facts.operations.get('a')?.schemaReferences).toContainEqual(
      expect.objectContaining({ status: 'unsupported' }),
    );
  },
);

it('retains actual schema occurrence pointers in referenced operations and path items', async () => {
  const registry = new SourceRegistry();
  const events = await projectAsyncAPI(
    {
      asyncapi: '3.0.0',
      operations: { wait: { $ref: '#/components/operations/shared' } },
      components: {
        operations: {
          shared: {
            action: 'receive',
            channel: { $ref: '#/channels/topic' },
            messages: [{ payload: { $ref: '#/components/schemas/Value' } }],
          },
        },
        schemas: { Value: { type: 'string' } },
      },
      channels: { topic: { address: 'topic' } },
    },
    uri,
    registry,
  );
  expect(events.operations.get('wait')?.schemaReferences).toContainEqual(
    expect.objectContaining({
      occurrence: '#/components/operations/shared/messages/0/payload',
      declaringURI: uri,
    }),
  );
  registry.setProvider({
    load: async () => ({
      retrievalURI: 'https://cdn.test/path',
      content: {
        Path: {
          post: {
            operationId: 'a',
            requestBody: { content: { 'application/json': { schema: { $ref: '#/Value' } } } },
          },
        },
        Value: { type: 'string' },
      },
    }),
  });
  const api = await projectOpenAPI(
    { openapi: '3.1.0', paths: { '/a': { $ref: 'https://cdn.test/path#/Path' } } },
    uri,
    registry,
  );
  expect(api.operations.get('a')?.schemaReferences).toContainEqual(
    expect.objectContaining({
      occurrence: '#/Path/post/requestBody/content/application~1json/schema',
      declaringURI: 'https://cdn.test/path',
    }),
  );
});
