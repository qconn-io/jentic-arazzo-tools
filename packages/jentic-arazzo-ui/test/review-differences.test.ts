import { expect, it } from 'vitest';
import { compareWorkflowRevisions, exportWorkflowReview } from '../src/utils/review';
import type { WorkflowReviewSnapshot } from '../src/types/review';
const flow = {
  arazzo: '1.0.1',
  info: { title: 'Shop', version: '1' },
  sourceDescriptions: [{ name: 'pay', type: 'openapi', url: './pay.json' }],
  components: {
    failureActions: {
      shared: { name: 'recover', type: 'retry', retryLimit: 2, workflowId: 'recover' },
    },
  },
  workflows: [
    {
      workflowId: 'entry',
      steps: [
        { stepId: 'first', workflowId: 'buy' },
        { stepId: 'second', workflowId: 'buy' },
      ],
    },
    {
      workflowId: 'buy',
      steps: [
        {
          stepId: 'capture',
          operationId: 'capture',
          parameters: [{ name: 'amount', in: 'query', value: 0 }],
          successCriteria: [{ condition: '$statusCode == 200' }],
          onFailure: [{ reference: '$components.failureActions.shared' }],
        },
        {
          stepId: 'revoke',
          operationId: 'revoke',
          onFailure: [{ reference: '$components.failureActions.shared' }],
        },
      ],
    },
    { workflowId: 'recover', dependsOn: ['$workflows.buy'], steps: [] },
  ],
};
const api = {
  openapi: '3.1.0',
  info: { title: 'Pay', version: '1' },
  paths: {
    '/capture': {
      post: {
        operationId: 'capture',
        responses: {
          '200': {
            description: 'Captured',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Evidence' } } },
          },
        },
      },
    },
    '/revoke': { post: { operationId: 'revoke', responses: {} } },
  },
  components: {
    schemas: { Evidence: { type: 'object', properties: { state: { type: 'string' } } } },
  },
};
function pair() {
  const snapshot = (revision: string): WorkflowReviewSnapshot => ({
    version: 1,
    id: 'shop',
    revision,
    documents: [
      {
        id: 'flow',
        revision,
        uri: 'https://example.test/flow.json',
        content: structuredClone(flow),
        workflows: [{ workflowId: 'entry', role: 'entry' }],
        sources: { pay: { documentId: 'pay', revision } },
      },
      {
        id: 'pay',
        revision,
        uri: 'https://example.test/pay.json',
        kind: 'openapi',
        content: structuredClone(api),
      },
    ],
  });
  return { a: snapshot('old'), b: snapshot('new') };
}
it('canonicalizes whitespace and object keys but preserves falsy edits and sequence order', async () => {
  const { a, b } = pair();
  b.documents[0].content = JSON.stringify(flow, Object.keys(flow).reverse());
  // Use recursive key reversal; JSON replacer arrays would drop nested authored keys.
  const reverse = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(reverse)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .reverse()
              .map(([k, x]) => [k, reverse(x)]),
          )
        : v;
  b.documents[0].content = JSON.stringify(reverse(flow), null, 4);
  expect((await compareWorkflowRevisions(a, b)).findings).toHaveLength(0);
  const next = structuredClone(flow);
  next.workflows[0].steps.reverse();
  const capture = next.workflows[1].steps[0];
  if ('parameters' in capture) capture.parameters![0].value = 1;
  b.documents[0].content = next;
  const result = await compareWorkflowRevisions(a, b);
  expect(
    result.findings.some((f) => f.category === 'actions' && f.before?.pointer.endsWith('/steps')),
  ).toBe(true);
  expect(result.findings.find((f) => f.before?.value === 0)?.after?.value).toBe(1);
});
it('reports removed steps, criteria, recovery targets and shared declarations once', async () => {
  const { a, b } = pair();
  const next = structuredClone(flow);
  next.components.failureActions.shared = {
    ...next.components.failureActions.shared,
    type: 'goto',
    workflowId: 'entry',
  };
  next.workflows[1].steps.pop();
  const capture = next.workflows[1].steps[0];
  if ('successCriteria' in capture) capture.successCriteria![0].condition = '$statusCode == 202';
  b.documents[0].content = next;
  const result = await compareWorkflowRevisions(a, b);
  const shared = result.findings.filter((f) =>
    f.before?.pointer.includes('/components/failureActions/shared/type'),
  );
  expect(shared).toHaveLength(1);
  expect(shared[0].effects.filter((e) => e.side === 'baseline')).toHaveLength(2);
  const removed = result.findings.find(
    (f) => f.kind === 'removed' && f.before?.stepId === 'revoke',
  )!;
  expect(removed.before?.location?.revision).toBe('old');
  expect(removed.after?.present).toBe(false);
  expect(result.findings.some((f) => f.category === 'criteria')).toBe(true);
  expect(removed.baselineImpact.paths.some((p) => p.entry.workflowId === 'entry')).toBe(true);
});
it('reports renames as removal/addition unless explicitly matched and rejects implicit match collisions', async () => {
  const { a, b } = pair();
  const next = structuredClone(flow);
  next.workflows[1].workflowId = 'purchase';
  b.documents[0].content = next;
  const result = await compareWorkflowRevisions(a, b);
  expect(result.findings.some((f) => f.kind === 'removed' && f.before?.workflowId === 'buy')).toBe(
    true,
  );
  const matched = await compareWorkflowRevisions(a, b, {
    matches: [
      {
        before: { documentId: 'flow', workflowId: 'buy' },
        after: { documentId: 'flow', workflowId: 'purchase' },
      },
    ],
  });
  expect(matched.findings.some((f) => f.kind === 'removed' && f.before?.workflowId === 'buy')).toBe(
    false,
  );
  await expect(
    compareWorkflowRevisions(a, pair().b, {
      matches: [
        {
          before: { documentId: 'flow', workflowId: 'buy' },
          after: { documentId: 'flow', workflowId: 'entry' },
        },
      ],
    }),
  ).rejects.toThrow(/match/);
});
it('locates schema and response users without combining revisions; bounds classified cycles', async () => {
  const { a, b } = pair();
  const next = structuredClone(api);
  next.components.schemas.Evidence.properties.state.type = 'integer';
  b.documents[1].content = next;
  const result = await compareWorkflowRevisions(a, b, { maxRelationships: 2, maxPaths: 1 });
  const finding = result.findings.find((f) => f.category === 'contracts')!;
  expect(finding.baselineImpact.direct.map((u) => u.location.selection?.stepId)).toContain(
    'capture',
  );
  expect(finding.baselineImpact.direct.every((u) => u.from.revision === 'old')).toBe(true);
  expect(finding.candidateImpact.direct.every((u) => u.from.revision === 'new')).toBe(true);
  expect(finding.baselineImpact.truncated).toBe(true);
  const full = await compareWorkflowRevisions(a, b);
  expect(
    full.findings[0].baselineImpact.paths.flatMap((p) => p.relationships).map((r) => r.kind),
  ).toContain('call');
});
it('exports deterministic portable results and marks missing historic contracts as unknown', async () => {
  const { a, b } = pair();
  a.documents[1].content = undefined;
  const result = await compareWorkflowRevisions(a, b);
  expect(result.baseline.coverage.some((c) => c.state !== 'loaded')).toBe(true);
  expect(result.findings.filter((f) => f.category === 'contracts')).toHaveLength(0);
  expect(exportWorkflowReview(result, 'json')).toBe(
    exportWorkflowReview(await compareWorkflowRevisions(a, b), 'json'),
  );
  expect(exportWorkflowReview(result, 'markdown')).toContain('undetermined');
  expect(exportWorkflowReview(result, 'markdown')).toContain('old');
  expect(exportWorkflowReview(result, 'json')).not.toMatch(/registry|sourceProvider|approved/);
});
it('preserves payload absence, null, false and empty string; categorizes locators, timeout and retry order', async () => {
  const { a, b } = pair();
  const before = {
    ...flow,
    workflows: [
      {
        workflowId: 'buy',
        steps: [
          {
            stepId: 'capture',
            operationId: 'capture',
            requestBody: { payload: { zero: 0, no: false, empty: '', nil: null } },
            timeout: 10,
            onFailure: [
              { name: 'a', type: 'retry', retryLimit: 2 },
              { name: 'b', type: 'end' },
            ],
          },
        ],
      },
    ],
  };
  a.documents[0].content = before;
  a.documents[0].workflows = [];
  b.documents[0].content = {
    ...before,
    sourceDescriptions: [{ name: 'pay', type: 'openapi', url: './other.json' }],
    workflows: [
      {
        workflowId: 'buy',
        steps: [
          {
            ...before.workflows[0].steps[0],
            timeout: 0,
            operationId: 'other',
            requestBody: { payload: { zero: false, no: null, empty: false } },
            onFailure: [...before.workflows[0].steps[0].onFailure].reverse(),
          },
        ],
      },
    ],
  };
  b.documents[0].workflows = [];
  const result = await compareWorkflowRevisions(a, b);
  expect(result.findings.find((f) => f.before?.pointer.endsWith('/nil'))?.kind).toBe('removed');
  expect(result.findings.find((f) => f.before?.pointer.endsWith('/empty'))?.before?.value).toBe('');
  expect(result.findings.find((f) => f.before?.pointer.endsWith('/timeout'))?.after?.value).toBe(0);
  expect(new Set(result.findings.map((f) => f.category))).toEqual(
    new Set(['mappings', 'actions', 'sources']),
  );
});
it('retains prerequisite, retry and descriptive classes with inspectable finite cycles', async () => {
  const { a, b } = pair();
  for (const s of [a, b]) s.documents[0].workflows!.push({ workflowId: 'recover' });
  for (const s of [a, b])
    s.associations = [
      {
        id: 'describes',
        from: { documentId: 'flow', revision: s.revision, workflowId: 'entry' },
        to: { documentId: 'flow', revision: s.revision, workflowId: 'recover' },
        description: 'Declared association',
      },
    ];
  const next = structuredClone(flow);
  next.components.failureActions.shared.retryLimit = 0;
  b.documents[0].content = next;
  const result = await compareWorkflowRevisions(a, b);
  const finding = result.findings.find((f) => f.before?.pointer.endsWith('/retryLimit'))!;
  expect(finding.effects).toHaveLength(4);
  const kinds = finding.baselineImpact.paths.flatMap((p) => p.relationships.map((r) => r.kind));
  expect(kinds).toContain('call');
  expect(kinds).toContain('descriptive');
  expect(finding.baselineImpact.cycles.length).toBeGreaterThan(0);
  expect(finding.baselineImpact.cycles.flat().some((k) => k.includes('recover'))).toBe(true);
});
it('retains raw declaration differences when contract semantics are unsupported', async () => {
  const { a, b } = pair();
  a.documents[1].content = { openapi: '9.0.0', custom: { response: false } };
  b.documents[1].content = { openapi: '9.0.0', custom: { response: 0 } };
  const result = await compareWorkflowRevisions(a, b);
  expect(
    result.findings.find((f) => f.before?.pointer === '#/custom/response')?.before?.value,
  ).toBe(false);
  expect(result.baseline.coverage.some((c) => c.state === 'unsupported')).toBe(true);
});
it('finds external schemas, shared response declarations and inherited path parameters', async () => {
  const { a, b } = pair();
  for (const s of [a, b]) {
    s.documents[1].content = {
      openapi: '3.1.0',
      info: { title: 'Pay', version: '1' },
      paths: {
        '/capture': {
          parameters: [{ name: 'trace', in: 'header', schema: { type: 'string' } }],
          post: {
            operationId: 'capture',
            responses: { '200': { $ref: '#/components/responses/Evidence' } },
          },
        },
      },
      components: {
        responses: {
          Evidence: {
            description: 'Evidence',
            content: {
              'application/json': {
                schema: { $ref: 'https://example.test/schema.json#/components/schemas/Evidence' },
              },
            },
          },
        },
      },
    };
    s.documents.push({
      id: 'schema',
      revision: s.revision,
      uri: 'https://example.test/schema.json',
      kind: 'openapi',
      content: {
        openapi: '3.1.0',
        info: { title: 'Schemas', version: '1' },
        components: { schemas: { Evidence: { type: 'string' } } },
      },
    });
  }
  b.documents[1].content = {
    ...(b.documents[1].content as object),
    paths: {
      '/capture': {
        parameters: [{ name: 'trace', in: 'header', schema: { type: 'integer' } }],
        post: {
          operationId: 'capture',
          responses: { '200': { $ref: '#/components/responses/Evidence' } },
        },
      },
    },
    components: {
      responses: {
        Evidence: {
          description: 'New evidence',
          content: {
            'application/json': {
              schema: { $ref: 'https://example.test/schema.json#/components/schemas/Evidence' },
            },
          },
        },
      },
    },
  };
  b.documents[2].content = {
    openapi: '3.1.0',
    info: { title: 'Schemas', version: '1' },
    components: { schemas: { Evidence: { type: 'integer' } } },
  };
  const r = await compareWorkflowRevisions(a, b);
  for (const f of r.findings.filter((f) => f.category === 'contracts'))
    expect(
      f.baselineImpact.direct.some((u) => u.location.selection?.stepId === 'capture'),
      f.before?.pointer,
    ).toBe(true);
});
it('excludes consumers overriding root security and servers', async () => {
  const { a, b } = pair();
  const contract = (revision: string) => ({
    openapi: '3.1.0',
    info: { title: 'Pay', version: '1' },
    security: [{ [revision]: [] }],
    servers: [{ url: `https://${revision}.test` }],
    paths: {
      '/capture': {
        post: {
          operationId: 'capture',
          security: [],
          servers: [{ url: 'https://override.test' }],
          responses: {},
        },
      },
    },
  });
  a.documents[1].content = contract('old');
  b.documents[1].content = contract('new');
  const r = await compareWorkflowRevisions(a, b);
  expect(
    r.findings.every(
      (f) => f.baselineImpact.direct.length === 0 && f.candidateImpact.direct.length === 0,
    ),
  ).toBe(true);
});
it('excludes prerequisite paths targeting a different scoped step', async () => {
  const content = (description: string) => ({
    arazzo: '1.1.0',
    info: { title: 'Scope', version: '1' },
    sourceDescriptions: [],
    workflows: [
      {
        workflowId: 'entry',
        steps: [{ stepId: 'wait', dependsOn: ['$workflows.target.steps.other'] }],
      },
      { workflowId: 'target', steps: [{ stepId: 'changed', description }, { stepId: 'other' }] },
    ],
  });
  const { a, b } = pair();
  a.documents = [a.documents[0]];
  b.documents = [b.documents[0]];
  for (const s of [a, b]) {
    s.documents[0].sources = undefined;
  }
  a.documents[0].content = content('old');
  b.documents[0].content = content('new');
  const r = await compareWorkflowRevisions(a, b);
  expect(r.findings[0].baselineImpact.direct).toHaveLength(0);
  expect(r.findings[0].baselineImpact.paths).toHaveLength(0);
});
it('categorizes contract extensions as authored metadata', async () => {
  const { a, b } = pair();
  a.documents[1].content = { ...api, 'x-review': false };
  b.documents[1].content = { ...api, 'x-review': true };
  const result = await compareWorkflowRevisions(a, b);
  expect(result.findings[0].category).toBe('metadata');
});
it('preserves a supplied digest pin when historic contract bytes are missing', async () => {
  const { a, b } = pair();
  a.documents[1].content = undefined;
  a.documents[1].expectedDigest = `sha256:${'1'.repeat(64)}`;
  const result = await compareWorkflowRevisions(a, b);
  expect(result.baseline.documents.find((d) => d.documentId === 'pay')?.digest).toBe(
    a.documents[1].expectedDigest,
  );
});
it('locates referenced path-item declarations and excludes shadowed parameter schemas', async () => {
  const { a, b } = pair();
  const make = (type: string) => ({
    openapi: '3.1.0',
    info: { title: 'Pay', version: '1' },
    paths: { '/capture': { $ref: '#/components/pathItems/Capture' } },
    components: {
      pathItems: {
        Capture: {
          parameters: [{ $ref: '#/components/parameters/Trace' }],
          post: {
            operationId: 'capture',
            parameters: [{ name: 'trace', in: 'header', schema: { type: 'boolean' } }],
            responses: { '200': { description: type } },
          },
        },
      },
      parameters: {
        Trace: { name: 'trace', in: 'header', schema: { $ref: '#/components/schemas/Trace' } },
      },
      schemas: { Trace: { type } },
    },
  });
  a.documents[1].content = make('string');
  b.documents[1].content = make('integer');
  const r = await compareWorkflowRevisions(a, b);
  const response = r.findings.find((f) => f.before?.pointer.includes('/responses/'))!;
  expect(response.baselineImpact.direct.map((r) => r.location.selection?.stepId)).toContain(
    'capture',
  );
  const shadowed = r.findings.find((f) => f.before?.pointer.includes('/schemas/Trace/'))!;
  expect(shadowed.baselineImpact.direct).toHaveLength(0);
});
it('discloses partial schema inspection profiles instead of claiming complete coverage', async () => {
  const { a, b } = pair();
  a.documents[1].content = { ...api, jsonSchemaDialect: 'https://unknown.test/dialect' };
  b.documents[1].content = { ...api, jsonSchemaDialect: 'https://unknown.test/other' };
  const r = await compareWorkflowRevisions(a, b);
  expect(r.baseline.coverage.some((c) => c.state === 'unsupported')).toBe(true);
  expect(r.findings[0].baselineImpact.complete).toBe(false);
});
