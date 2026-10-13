import { expect, test } from 'vitest';
import { toValue } from '@speclynx/apidom-core';
import { loadDocument } from '../src/utils/loading/loadDocument';

const input = (): import('../src/types/arazzo').ArazzoDocument => ({
  arazzo: '1.1.0',
  info: { title: 'load', version: '1' },
  sourceDescriptions: [],
  components: {
    inputs: { schema: { type: 'object', properties: { id: { type: 'string' } } } },
    successActions: { finish: { name: 'finish', type: 'end' } },
  },
  workflows: [
    {
      workflowId: 'missing',
      steps: [
        {
          stepId: 'init',
          operationId: 'get',
          onFailure: [
            {
              reference: '$components.failureActions.absent',
              ...{ 'x-original': { flag: false } },
            },
          ],
        },
      ],
    },
    {
      workflowId: 'valid',
      inputs: { $ref: '#/components/inputs/schema' },
      steps: [
        {
          stepId: 'init',
          operationId: 'get',
          onSuccess: [{ reference: '$components.successActions.finish' }],
        },
      ],
    },
  ],
});

test('malformed reusable suffixes are fatal before missing-reference recovery or resolution bypass', async () => {
  for (const suffix of ['absent +garbage', 'absent[0]', 'absent/child', 'absent\n']) {
    const authored = input();
    authored.workflows[0].steps[0].onFailure = [
      { reference: `$components.failureActions.${suffix}` },
    ];
    for (const options of [{ baseURI: 'https://example.test/viewer/' }, {}]) {
      await expect(loadDocument(authored, options)).rejects.toThrow('malformed reusable reference');
    }
  }
});

test('real resolver recovers a missing reusable and still resolves valid schemas/actions in either workflow order', async () => {
  for (const reverse of [false, true]) {
    const authored = input();
    if (reverse) authored.workflows.reverse();
    const before = structuredClone(authored);
    const loaded = await loadDocument(authored, { baseURI: 'https://example.test/viewer/' });
    expect(authored).toEqual(before);
    expect(loaded.document.workflows.find((w) => w.workflowId === 'valid')?.inputs).toEqual(
      authored.components!.inputs!.schema,
    );
    expect(
      loaded.document.workflows.find((w) => w.workflowId === 'valid')?.steps[0].onSuccess,
    ).toEqual([{ name: 'finish', type: 'end' }]);
    expect(
      loaded.document.workflows.find((w) => w.workflowId === 'missing')?.steps[0].onFailure,
    ).toEqual(before.workflows.find((w) => w.workflowId === 'missing')?.steps[0].onFailure);
    expect(toValue(loaded.snapshot.restored.api)).toEqual(loaded.document);
    expect(loaded.diagnostics.some((d) => d.category === 'missing-reference')).toBe(true);
  }
});

test('missing parameter definitions survive reusable-action transclusion and multiple uses with falsy overrides', async () => {
  const authored = {
    arazzo: '1.1.0',
    info: { title: 'uses', version: '1' },
    sourceDescriptions: [],
    components: {
      failureActions: {
        recover: {
          name: 'recover',
          type: 'retry',
          parameters: [
            {
              reference: '$components.parameters.absent.with.dots',
              value: 0,
              'x-meta': { reference: '$components.parameters.literal' },
            },
          ],
        },
      },
    },
    workflows: [
      {
        workflowId: 'uses',
        _internalId: 'authored',
        steps: ['a', 'b'].map((stepId) => ({
          stepId,
          operationId: 'get',
          onFailure: [{ reference: '$components.failureActions.recover' }],
        })),
      },
    ],
    'x-viewerRecoveryToken': 'authored-marker',
  };
  const loaded = await loadDocument(authored, { baseURI: 'https://example.test/viewer/' });
  for (const step of loaded.document.workflows[0].steps)
    expect(step.onFailure?.[0]).toEqual(authored.components.failureActions.recover);
  expect(loaded.document.workflows[0]._internalId).toBe('authored');
  expect(Object.keys(loaded.document)).not.toContain('viewerRecoveryToken');
  expect((loaded.document as unknown as Record<string, unknown>)['x-viewerRecoveryToken']).toBe(
    'authored-marker',
  );
});

test('JSON and YAML inputs retain isolated authored/restored native snapshots', async () => {
  const authored = input();
  for (const text of [
    JSON.stringify(authored),
    'arazzo: 1.0.1\ninfo:\n  title: yaml\n  version: "1"\nsourceDescriptions: []\nworkflows: []\n',
  ]) {
    const loaded = await loadDocument(text, { baseURI: 'https://example.test/viewer/' });
    expect(loaded.snapshot.authored).not.toBe(loaded.snapshot.restored);
    expect(loaded.snapshot.retrievalURI).toBeUndefined();
    expect(loaded.document.arazzo).toMatch(/^1\./);
  }
});

test('unknown parseable profile is raw and bypasses known workflow identity/dereferencing assumptions', async () => {
  const authored = {
    arazzo: '1.2.3',
    info: { title: 'future', version: '1.0' },
    sourceDescriptions: [],
    workflows: [{ strange: true }],
    components: { inputs: { broken: { $ref: '#/absent' } } },
  };
  const loaded = await loadDocument(authored);
  expect(loaded.document).toEqual(authored);
  expect(loaded.snapshot.exactVersion).toBe('1.2.3');
});

test.each([
  '{"arazzo": "1.0.1",',
  'arazzo: 1.0.1\ninfo: [broken\n',
  { arazzo: '1.0.1' },
  { ...input(), workflows: [input().workflows[0], input().workflows[0]] },
  {
    ...input(),
    workflows: [{ workflowId: 'duplicate', steps: [{ stepId: 'same' }, { stepId: 'same' }] }],
  },
  {
    ...input(),
    workflows: [
      {
        workflowId: 'malformed',
        steps: [{ stepId: 'one', parameters: [{ reference: '$components.parameters' }] }],
      },
    ],
  },
  {
    ...input(),
    workflows: [
      { workflowId: 'schema', inputs: { $ref: '#/components/inputs/absent' }, steps: [] },
    ],
  },
])(
  'fatal syntax, root, identity, malformed expression or schema failures reject rather than return a partial document: %j',
  async (authored) => {
    await expect(
      loadDocument(authored, { baseURI: 'https://example.test/viewer/' }),
    ).rejects.toThrow();
  },
);

test('unsupported $self and schema dialect expansion preserves authored identity and references explicitly', async () => {
  for (const authored of [
    { ...input(), $self: 'https://identity.test/spec.json' },
    {
      ...input(),
      components: {
        inputs: {
          custom: {
            $schema: 'https://dialect.test/custom',
            $id: 'relative.json',
            $ref: '#/unknown',
          },
        },
      },
    },
  ]) {
    const loaded = await loadDocument(authored, { baseURI: 'https://retrieval.test/viewer/' });
    expect(loaded.document).toEqual(authored);
    expect(loaded.snapshot.retrievalURI).toBeUndefined();
    expect(loaded.snapshot.baseURI).toBe('https://retrieval.test/viewer/');
    expect(loaded.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phase: 'resolution', category: 'unsupported-resolution' }),
      ]),
    );
  }
});

test('unavailable base metadata remains unavailable and expansion bypass is explicit', async () => {
  const loaded = await loadDocument(input());
  expect(loaded.snapshot.baseURI).toBeUndefined();
  expect(loaded.snapshot.retrievalURI).toBeUndefined();
  expect(loaded.document).toEqual(input());
  expect(loaded.diagnostics[0].category).toBe('unsupported-resolution');
});

test('unrepresentable specification versions reject with a distinct parsing failure', async () => {
  const authored = { ...input(), arazzo: '9.0.0' };
  const original = structuredClone(authored);
  await expect(loadDocument(authored)).rejects.toThrow('Failed to parse');
  expect(authored).toEqual(original);
});

test('URL parsing retains real retrieval metadata and does not fetch source descriptions', async () => {
  const { createServer } = await import('node:http');
  let requests = 0;
  const authored = {
    ...input(),
    sourceDescriptions: [
      { name: 'unfetched', type: 'openapi' as const, url: 'https://unfetched.invalid/api.json' },
    ],
  };
  const server = createServer((_request, response) => {
    requests += 1;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(authored));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address() as import('node:net').AddressInfo;
    const url = `http://127.0.0.1:${address.port}/workflow.json`;
    const loaded = await loadDocument(url, { baseURI: 'https://wrong-base.invalid/' });
    expect(loaded.snapshot.retrievalURI).toBe(url);
    expect(loaded.snapshot.baseURI).toBe(url);
    expect(loaded.document.sourceDescriptions).toEqual(authored.sourceDescriptions);
    expect(requests).toBe(1);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('native valid reusable expansion preserves authored occurrence extensions and declaration extensions', async () => {
  const authored = {
    arazzo: '1.1.0',
    info: { title: 'extensions', version: '1' },
    sourceDescriptions: [],
    components: {
      parameters: {
        token: { name: 'token', value: 'default', 'x-definition': { literal: false } },
      },
    },
    workflows: [
      {
        workflowId: 'A',
        steps: [
          {
            stepId: 'init',
            operationId: 'get',
            parameters: [
              { reference: '$components.parameters.token', value: false, 'x-use': { keep: 0 } },
            ],
          },
        ],
      },
    ],
  };
  const loaded = await loadDocument(authored, { baseURI: 'https://example.test/viewer/' });
  expect(loaded.document.workflows[0].steps[0].parameters?.[0]).toEqual({
    name: 'token',
    value: false,
    'x-definition': { literal: false },
    'x-use': { keep: 0 },
  });
});
