import { expect, it } from 'vitest';
import { projectOpenAPI } from '../src/utils/contract/OpenAPIAdapter';
import { projectAsyncAPI } from '../src/utils/contract/AsyncAPIAdapter';
import { SourceRegistry } from '../src/utils/source/SourceRegistry';
import { type ReviewProjection, prepareWorkflowReview } from '../src/utils/review/inputs';
import { compareWorkflowRevisions, exportWorkflowReview } from '../src/utils/review';
import { contractDeclarationUser } from '../src/utils/review/contractUsage';
import { consumerCatalog, consumerWorkflow } from './fixtures/upstream-readiness';

const uri = 'https://example.test/pay.json';
const names = ['examples', 'default', 'const', '$ref', 'x-payload'];
const ref = { $ref: '#/components/schemas/Used' };
function contract() {
  return {
    openapi: '3.1.0',
    info: { title: 'Pay', version: '1' },
    paths: {
      '/capture': {
        post: {
          operationId: 'capture',
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: {
                    properties: Object.fromEntries(names.map((name) => [name, ref])),
                    example: { $ref: '#/components/schemas/Literal' },
                    default: { $ref: '#/components/schemas/Literal' },
                    enum: [{ $ref: '#/components/schemas/Literal' }],
                    const: { $ref: '#/components/schemas/Literal' },
                    'x-payload': { $ref: '#/components/schemas/Literal' },
                  },
                  examples: Object.fromEntries(
                    names.map((name) => [name, { $ref: '#/components/examples/Shared' }]),
                  ),
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: { Used: { type: 'string' }, Literal: { type: 'integer' } },
      examples: {
        Shared: { summary: 'Authored example', value: { $ref: '#/components/schemas/Literal' } },
      },
    },
  };
}
async function usage(
  content: object,
  pointers: string[],
  kind: 'openapi' | 'asyncapi' = 'openapi',
  customize?: (projection: ReviewProjection) => void,
) {
  const a = consumerCatalog('complete', 'old');
  const b = consumerCatalog('complete', 'new');
  for (const snapshot of [a, b]) {
    snapshot.documents[1].content = content;
    snapshot.documents[1].kind = kind;
    if (kind === 'asyncapi') {
      const flow = consumerWorkflow();
      flow.sourceDescriptions![0].type = 'asyncapi';
      snapshot.documents[0].content = flow;
    }
  }
  const { baseline } = await prepareWorkflowReview(a, b);
  customize?.(baseline);
  const direct = baseline.index.apiUsages[0];
  expect(direct.status).toBe('located');
  return pointers.map((pointer) =>
    contractDeclarationUser(baseline, direct, {
      documentId: 'pay',
      revision: 'old',
      uri,
      digest: '',
      pointer,
      present: true,
    }),
  );
}
it('projects genuine Example References and preserves their literal values and adversarial map names', async () => {
  const content = contract();
  const facts = await projectOpenAPI(content, uri, new SourceRegistry());
  const response = facts.operations.get('capture')!
    .responses as (typeof content.paths)['/capture']['post']['responses'];
  const media = response['200'].content['application/json'];
  for (const name of names)
    expect(media.examples[name]).toEqual(content.components.examples.Shared);
  expect(media.schema).toEqual(
    content.paths['/capture'].post.responses['200'].content['application/json'].schema,
  );
  expect(facts.operations.get('capture')!.schemaReferences).toHaveLength(names.length);
});
it('counts schema/map references and Example declarations while excluding literal ref values', async () => {
  expect(
    await usage(contract(), [
      '#/components/schemas/Used/type',
      '#/components/examples/Shared/summary',
      '#/components/schemas/Literal/type',
    ]),
  ).toEqual([
    { used: true, bounded: false },
    { used: true, bounded: false },
    { used: false, bounded: false },
  ]);
});
it('pairs AsyncAPI message payload/header schema children with literal examples and extensions', async () => {
  const content = {
    asyncapi: '3.0.0',
    info: { title: 'Pay', version: '1' },
    operations: { capture: { action: 'receive', channel: { $ref: '#/channels/default' } } },
    channels: { default: { messages: { 'x-payload': { $ref: '#/components/messages/$ref' } } } },
    components: {
      messages: {
        $ref: {
          payload: {
            properties: Object.fromEntries(names.map((name) => [name, ref])),
            default: { $ref: '#/components/schemas/Literal' },
          },
          headers: ref,
          examples: [{ payload: { $ref: '#/components/schemas/Literal' } }],
          'x-payload': { $ref: '#/components/schemas/Literal' },
        },
      },
      schemas: { Used: { type: 'string' }, Literal: { type: 'integer' } },
    },
  };
  const facts = await projectAsyncAPI(content, uri, new SourceRegistry());
  expect(facts.operations.get('capture')!.schemaReferences).toHaveLength(names.length + 1);
  expect(facts.operations.get('capture')!.messages).toEqual([content.components.messages.$ref]);
  expect(
    await usage(
      content,
      ['#/components/schemas/Used/type', '#/components/schemas/Literal/type'],
      'asyncapi',
    ),
  ).toEqual([
    { used: true, bounded: false },
    { used: false, bounded: false },
  ]);
});
it('does not follow ignored Reference Object body siblings', async () => {
  const base = contract();
  const content = {
    ...base,
    paths: {
      '/capture': {
        post: {
          operationId: 'capture',
          responses: {
            '200': {
              $ref: '#/components/responses/Shared',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Literal' } } },
            },
          },
        },
      },
    },
    components: { ...base.components, responses: { Shared: { description: 'Shared response' } } },
  };
  expect(
    await usage(content, [
      '#/components/responses/Shared/description',
      '#/components/schemas/Literal/type',
    ]),
  ).toEqual([
    { used: true, bounded: false },
    { used: false, bounded: false },
  ]);
});
it.each([
  { $id: 'https://other.test/schema', properties: { child: ref } },
  { $schema: 'https://other.test/dialect', properties: { child: ref } },
  { $ref: '#named-anchor' },
])('retains unsupported schema semantics without claiming complete usage: %j', async (schema) => {
  const base = contract();
  const content = {
    ...base,
    paths: {
      '/capture': {
        post: {
          operationId: 'capture',
          requestBody: { content: { 'application/json': { schema } } },
        },
      },
    },
  };
  const facts = await projectOpenAPI(content, uri, new SourceRegistry());
  expect(facts.operations.get('capture')!.requestBody).toEqual({
    content: { 'application/json': { schema } },
  });
  expect(facts.unsupportedDiagnostics.join(' ')).toMatch(/unsupported/i);
  expect(await usage(content, ['#/components/schemas/Used/type'])).toEqual([
    { used: false, bounded: true },
  ]);
});
it('keeps recursive schema references finite and retains genuinely reached children', async () => {
  const base = contract();
  const content = {
    ...base,
    paths: {
      '/capture': {
        post: {
          operationId: 'capture',
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } },
          },
        },
      },
    },
    components: {
      ...base.components,
      schemas: {
        ...base.components.schemas,
        Node: { properties: { self: { $ref: '#/components/schemas/Node' }, value: ref } },
      },
    },
  };
  const facts = await projectOpenAPI(content, uri, new SourceRegistry());
  expect(facts.operations.get('capture')!.schemaReferences).toContainEqual(
    expect.objectContaining({ status: 'recursive' }),
  );
  expect(await usage(content, ['#/components/schemas/Used/type'])).toEqual([
    { used: true, bounded: false },
  ]);
});
it('reports depth and visit exhaustion without fabricating consumers', async () => {
  let schema: object = ref;
  for (let i = 0; i < 40; i++) schema = { properties: { child: schema } };
  const base = contract();
  const content = (value: object) => ({
    ...base,
    paths: {
      '/capture': {
        post: {
          operationId: 'capture',
          requestBody: { content: { 'application/json': { schema: value } } },
        },
      },
    },
  });
  expect(await usage(content(schema), ['#/components/schemas/Used/type'])).toEqual([
    { used: false, bounded: true },
  ]);
  const wide = {
    properties: Object.fromEntries(
      Array.from({ length: 10010 }, (_, i) => [`field-${i}`, { type: 'string' }]),
    ),
  };
  expect(await usage(content(wide), ['#/components/schemas/Used/type'])).toEqual([
    { used: false, bounded: true },
  ]);
});

it('retains local reference revision identity even beside another revision of the same URI', async () => {
  expect(
    await usage(contract(), ['#/components/schemas/Used/type'], 'openapi', (p) => {
      const source = p.documents.find((doc) => doc.definition.id === 'pay')!;
      p.documents.push({
        ...source,
        definition: { ...source.definition, id: 'other-pay', revision: 'other' },
      });
    }),
  ).toEqual([{ used: true, bounded: false }]);
});
it('keeps ambiguous external reference targets partial instead of picking a revision', async () => {
  const base = contract();
  const content = {
    ...base,
    paths: {
      '/capture': {
        post: {
          operationId: 'capture',
          requestBody: {
            content: { 'application/json': { schema: { $ref: './external.json#/Value' } } },
          },
        },
      },
    },
  };
  expect(
    await usage(content, ['#/components/schemas/Used/type'], 'openapi', (p) => {
      for (const revision of ['first', 'second'])
        p.documents.push({
          definition: {
            id: revision,
            kind: 'openapi',
            uri: 'https://example.test/external.json',
            revision,
          },
          raw: { Value: { type: 'string' } },
          digest: '',
        });
    }),
  ).toEqual([{ used: false, bounded: true }]);
});
it('retains OpenAPI encoding headers as declarations while preserving encoding literals', async () => {
  const base = contract();
  const content = {
    ...base,
    paths: {
      '/capture': {
        post: {
          operationId: 'capture',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: { type: 'object' },
                encoding: {
                  default: {
                    headers: {
                      'x-payload': {
                        schema: ref,
                        example: { $ref: '#/components/schemas/Literal' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  const facts = await projectOpenAPI(content, uri, new SourceRegistry());
  expect(facts.operations.get('capture')!.schemaReferences).toHaveLength(1);
  expect(
    await usage(content, ['#/components/schemas/Used/type', '#/components/schemas/Literal/type']),
  ).toEqual([
    { used: true, bounded: false },
    { used: false, bounded: false },
  ]);
});
it('retains supported AsyncAPI security, binding and correlation Reference Objects with literal protocol bodies', async () => {
  const content = {
    asyncapi: '3.0.0',
    info: { title: 'Pay', version: '1' },
    operations: {
      capture: {
        action: 'receive',
        channel: { $ref: '#/channels/default' },
        security: [{ $ref: '#/components/securitySchemes/default' }],
        bindings: { $ref: '#/components/operationBindings/default' },
      },
    },
    channels: {
      default: {
        messages: {
          default: {
            correlationId: { $ref: '#/components/correlationIds/default' },
            payload: { type: 'string' },
          },
        },
      },
    },
    components: {
      securitySchemes: { default: { type: 'httpApiKey', in: 'header', name: 'key' } },
      operationBindings: {
        default: { kafka: { 'x-payload': { $ref: '#/components/schemas/Literal' } } },
      },
      correlationIds: { default: { location: '$message.header#/trace' } },
      schemas: { Literal: { type: 'integer' } },
    },
  };
  const facts = await projectAsyncAPI(content, uri, new SourceRegistry());
  expect(facts.operations.get('capture')!.security).toEqual([
    content.components.securitySchemes.default,
  ]);
  expect(
    await usage(
      content,
      [
        '#/components/securitySchemes/default/name',
        '#/components/operationBindings/default/kafka',
        '#/components/correlationIds/default/location',
        '#/components/schemas/Literal/type',
      ],
      'asyncapi',
    ),
  ).toEqual([
    { used: true, bounded: false },
    { used: true, bounded: false },
    { used: true, bounded: false },
    { used: false, bounded: false },
  ]);
});

it('exports structural usage deterministically with direct users and scoped entry paths', async () => {
  const a = consumerCatalog('complete', 'old');
  const b = consumerCatalog('complete', 'new');
  const before = contract();
  const after = contract();
  after.components.schemas.Used.type = 'integer';
  after.components.schemas.Literal.type = 'string';
  a.documents[1].content = before;
  b.documents[1].content = after;
  const first = await compareWorkflowRevisions(a, b);
  const second = await compareWorkflowRevisions(a, b);
  const genuine = first.findings.find(
    (f) => f.before?.pointer === '#/components/schemas/Used/type',
  )!;
  const literal = first.findings.find(
    (f) => f.before?.pointer === '#/components/schemas/Literal/type',
  )!;
  expect(genuine.baselineImpact.direct).toHaveLength(1);
  expect(
    genuine.baselineImpact.paths.map((path) => path.relationships[0].location.selection?.stepId),
  ).toEqual(['first-item', 'second-item']);
  expect(genuine.before?.revision).toBe('old');
  expect(genuine.after?.revision).toBe('new');
  expect(literal.baselineImpact.direct).toEqual([]);
  expect(literal.candidateImpact.direct).toEqual([]);
  for (const format of ['json', 'markdown'] as const)
    expect(exportWorkflowReview(first, format)).toBe(exportWorkflowReview(second, format));
});
