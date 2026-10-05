import { describe, expect, it } from 'vitest';
import { createSnapshot, inspect, selectProfile } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';

const document = (version = '1.1.0') => ({
  arazzo: version,
  info: { title: 'inspection', version: '99.0' },
  sourceDescriptions: [{ name: 'remote.api', type: 'arazzo', url: 'https://example.org/remote' }],
  workflows: [
    {
      workflowId: 'flow.A',
      successActions: [{ name: 'default', type: 'goto', workflowId: 'flow.B' }],
      steps: [
        { stepId: 'init', onSuccess: [{ name: 'own', type: 'end' }], dependsOn: ['prepare'] },
        { stepId: 'prepare' },
      ],
    },
    { workflowId: 'flow.B', steps: [{ stepId: 'init', dependsOn: ['prepare'] }] },
  ],
});

describe('private inspection profiles', () => {
  it('selects feature versions and retains exact authored versions without mutation', () => {
    const input = document('1.1.27');
    const before = JSON.stringify(input);
    const snapshot = createSnapshot(input);
    expect(snapshot.exactVersion).toBe('1.1.27');
    expect(selectProfile('1.1.27')?.id).toBe('1.1');
    expect(selectProfile('2.0.0')).toBeUndefined();
    expect(inspect(snapshot).workflows).toHaveLength(2);
    expect(JSON.stringify(input)).toBe(before);
    expect(snapshot.authored.result).toBeDefined();
  });

  it('uses scoped prerequisite targets, dotted keys, and role-aware external sources', () => {
    const result = inspect(createSnapshot(document()));
    expect(result.workflows[0].steps[0].prerequisites[0].target.kind).toBe('local-step');
    expect(result.workflows[1].steps[0].prerequisites[0].target.kind).toBe('missing');
    expect(
      result.classifyTarget('$sourceDescriptions.remote.api.flow.A.steps.init', {
        workflowId: 'flow.A',
        role: 'step-prerequisite',
      }),
    ).toMatchObject({
      kind: 'external-step',
      sourceName: 'remote.api',
      workflowId: 'flow.A',
      stepId: 'init',
    });
    expect(
      result.classifyTarget('$workflows.flow.B.steps.init', {
        workflowId: 'flow.A',
        role: 'step-prerequisite',
      }),
    ).toMatchObject({ kind: 'local-step', workflowId: 'flow.B', stepId: 'init' });
  });

  it('keeps unknown profiles raw and older unsupported features opaque', () => {
    const raw = inspect(createSnapshot(document('2.0.0')));
    expect(raw.workflows).toEqual([]);
    expect(buildViewerModel(raw).relationships).toEqual([]);
    expect(raw.diagnostics[0].category).toBe('unsupported-version');
    const old = inspect(createSnapshot(document('1.0.8')));
    expect(old.workflows[0].steps[0].prerequisites).toEqual([]);
    expect(old.diagnostics.some((d) => d.category === 'unsupported-feature')).toBe(true);
  });

  it('inventories only supported structural references and preserves full dotted component keys', () => {
    const input = document();
    Object.assign(input.workflows[0].steps[0], {
      onFailure: [{ reference: '$components.failureActions.fix.token' }],
      parameters: [{ name: 'literal', value: { reference: '$components.parameters.not-real' } }],
    });
    Object.assign(input, {
      components: {
        failureActions: {
          'fix.token': {
            name: 'fix',
            type: 'retry',
            parameters: [{ reference: '$components.parameters.auth.token', value: 0 }],
          },
        },
      },
    });
    const occurrences = selectProfile('1.1.0')!.inventory(input);
    expect(occurrences.map((o) => o.key)).toEqual(['fix.token', 'auth.token']);
    expect(occurrences[1].path).toEqual([
      'components',
      'failureActions',
      'fix.token',
      'parameters',
      0,
    ]);
    expect(
      selectProfile('1.0.0')!
        .inventory(input)
        .map((o) => o.key),
    ).toEqual(['fix.token']);
  });
});

describe('source-neutral bindings and profile extension contract', () => {
  it('keeps bare source IDs unverified, conflicting locators ambiguous, and authored async metadata opaque', () => {
    const input = document();
    input.sourceDescriptions = [
      { name: 'bus', type: 'asyncapi', url: 'https://example.org/bus' },
    ] as any;
    Object.assign(input.workflows[0].steps[0], {
      operationId: 'publish',
      action: 'send',
      timeout: 0,
      correlationId: '$inputs.trace',
    });
    Object.assign(input.workflows[0].steps[1], {
      channelPath: '$sourceDescriptions.bus.channels.orders',
      action: 'receive',
    });
    Object.assign(input.workflows[1].steps[0], {
      operationId: 'opaque-id',
      operationPath: '$sourceDescriptions.bus.messages.entry',
      'x-data': { reference: '$components.parameters.literal' },
    });
    const inspected = inspect(createSnapshot(input));
    expect(inspected.workflows[0].steps[0].sourceBinding).toMatchObject({
      status: 'unverified',
      verification: 'unverified',
      intent: 'send',
      timeout: 0,
      correlationId: '$inputs.trace',
    });
    expect(inspected.workflows[0].steps[0].sourceBinding.sourceName).toBeUndefined();
    expect(inspected.workflows[0].steps[1].sourceBinding).toMatchObject({
      status: 'declared',
      sourceName: 'bus',
      sourceType: 'asyncapi',
    });
    expect(inspected.workflows[1].steps[0].sourceBinding.status).toBe('ambiguous');
    expect(
      buildViewerModel(inspected).relationships.filter((edge) => edge.kind === 'call'),
    ).toEqual([]);
    expect(inspected.support.execution).toBe('not-established');
  });

  it('permits a private future profile to reuse domain extraction without consumer version dispatch', () => {
    const known = selectProfile('1.1.0')!;
    const future = {
      ...known,
      id: '9.4',
      extract: (snapshot: Parameters<typeof inspect>[0]) => ({
        ...known.extract(snapshot),
        profileId: '9.4',
      }),
    };
    const inspection = inspect(createSnapshot(document('9.4.2')), future);
    expect(inspection.profileId).toBe('9.4');
    expect(buildViewerModel(inspection).workflows).toHaveLength(2);
    expect(buildViewerModel(inspection).relationships).toHaveLength(2);
  });
});

it('recognizes a braced source locator without interpreting its pointer or method', () => {
  const input = document();
  input.sourceDescriptions = [
    { name: 'api.dotted', type: 'openapi', url: 'https://example.org/oas' },
  ] as any;
  Object.assign(input.workflows[0].steps[0], {
    operationPath: '{$sourceDescriptions.api.dotted.url}#/webhooks/order/post',
  });
  const binding = inspect(createSnapshot(input)).workflows[0].steps[0].sourceBinding;
  expect(binding.sourceName).toBe('api.dotted');
  expect(binding.sourceType).toBe('openapi');
  expect(binding.locators).toEqual({
    operationPath: '{$sourceDescriptions.api.dotted.url}#/webhooks/order/post',
  });
  expect(binding).not.toHaveProperty('method');
});

it('keeps dotted external source prefix ambiguity and missing-role targets non-navigable', () => {
  const input = document();
  input.sourceDescriptions.push({
    name: 'remote',
    type: 'arazzo',
    url: 'https://example.org/remote-prefix',
  });
  const inspected = inspect(createSnapshot(input));
  expect(
    inspected.classifyTarget('$sourceDescriptions.remote.api.flow.A', { role: 'call' }).kind,
  ).toBe('ambiguous');
  expect(inspected.classifyTarget('$workflows.absent.steps.init', { role: 'call' }).kind).toBe(
    'malformed',
  );
  expect(
    inspected.classifyTarget('$workflows.flow.A', {
      workflowId: 'flow.B',
      role: 'step-prerequisite',
    }).kind,
  ).toBe('malformed');
});

it('keeps extension vocabulary opaque and reports 1.1-only source/parameter fields in older profiles', () => {
  const input = document('1.0.0');
  input.sourceDescriptions = [
    {
      name: 'events',
      type: 'asyncapi',
      url: 'https://example.org/bus',
      'x-spec': { future: true },
    },
  ] as any;
  Object.assign(input.workflows[0], {
    parameters: [{ name: 'whole-query', in: 'querystring', value: { $futureKeyword: 1 } }],
    inputs: { $schema: 'urn:custom:dialect', $futureKeyword: 1 },
    'x-control': { future: true },
  });
  const snapshot = createSnapshot(input);
  const inspected = inspect(snapshot);
  expect(
    inspected.diagnostics.some((diagnostic) => diagnostic.code === 'unsupported-asyncapi'),
  ).toBe(true);
  expect(
    inspected.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === 'unsupported-querystring' && diagnostic.stepId === undefined,
    ),
  ).toBe(true);
  expect(
    inspected.diagnostics.some((diagnostic) =>
      diagnostic.path.some((part) => String(part).startsWith('x-')),
    ),
  ).toBe(false);
  expect(inspected.raw.workflows[0].inputs).toEqual({
    $schema: 'urn:custom:dialect',
    $futureKeyword: 1,
  });
});

it('rejects duplicate scoped identities on synchronous known-profile supplied snapshots', () => {
  const input = document();
  input.workflows[1].workflowId = input.workflows[0].workflowId;
  expect(() => inspect(createSnapshot(input))).toThrow(/duplicate workflow/i);
  const steps = document();
  steps.workflows[0].steps[1].stepId = 'init';
  expect(() => inspect(createSnapshot(steps))).toThrow(/duplicate.*step/i);
});

it('uses reference role to disambiguate indexed workflow IDs containing a step-expression separator', () => {
  const input = document();
  input.workflows[1].workflowId = 'flow.A.steps.init';
  const inspected = inspect(createSnapshot(input));
  expect(inspected.classifyTarget('$workflows.flow.A.steps.init', { role: 'call' })).toMatchObject({
    kind: 'local-workflow',
    workflowId: 'flow.A.steps.init',
  });
  expect(
    inspected.classifyTarget('$workflows.flow.A.steps.init', {
      role: 'step-prerequisite',
      workflowId: 'flow.A',
    }),
  ).toMatchObject({ kind: 'local-step', workflowId: 'flow.A', stepId: 'init' });
  expect(inspected.classifyTarget('$workflows.flow.A.steps.init', { role: 'action' }).kind).toBe(
    'ambiguous',
  );
});

it('warns for unknown async intent without creating transport semantics or warning on extension data', () => {
  const input = document();
  Object.assign(input.workflows[0].steps[0], {
    action: 'teleport',
    channelPath: 'opaque-channel',
    'x-action': 'teleport',
  });
  const inspected = inspect(createSnapshot(input));
  expect(inspected.workflows[0].steps[0].sourceBinding.intent).toBeUndefined();
  expect(
    inspected.diagnostics.some((diagnostic) => diagnostic.code === 'unsupported-async-intent'),
  ).toBe(true);
  expect(inspected.workflows[0].steps[0].value.action).toBe('teleport');
});

it('distinguishes malformed empty expression identifiers from valid missing targets', () => {
  const inspected = inspect(createSnapshot(document()));
  expect(inspected.classifyTarget('$workflows.', { role: 'call' }).kind).toBe('malformed');
  expect(
    inspected.classifyTarget('$workflows.missing.steps.', {
      role: 'step-prerequisite',
      workflowId: 'flow.A',
    }).kind,
  ).toBe('malformed');
  expect(
    inspected.classifyTarget('$workflows.missing.steps.init', {
      role: 'step-prerequisite',
      workflowId: 'flow.A',
    }).kind,
  ).toBe('missing');
});

it('retains URI provenance while assigning distinct supplied snapshot revisions at the same location', () => {
  const first = createSnapshot(document(), {
    baseURI: 'https://example.org/same',
    retrievalURI: 'https://example.org/same',
  });
  const second = createSnapshot(document(), {
    baseURI: 'https://example.org/same',
    retrievalURI: 'https://example.org/same',
  });
  expect(first.id).not.toBe(second.id);
  expect(first.baseURI).toBe(second.baseURI);
  expect(first.self).toBeUndefined();
});

it('classifies action workflow and step fields according to their locator role', () => {
  const input = document();
  input.workflows[1].workflowId = 'flow.A.steps.init';
  Object.assign(input.workflows[0].steps[0], {
    onSuccess: [
      { name: 'workflow', type: 'goto', workflowId: '$workflows.flow.A.steps.init' },
      { name: 'step', type: 'goto', stepId: '$workflows.flow.A.steps.init' },
    ],
  });
  const actions = inspect(createSnapshot(input)).workflows[0].steps[0].actions.onSuccess;
  expect(actions[0].target).toMatchObject({
    kind: 'local-workflow',
    workflowId: 'flow.A.steps.init',
  });
  expect(actions[1].target).toMatchObject({
    kind: 'local-step',
    workflowId: 'flow.A',
    stepId: 'init',
  });
});

it('warns at a reusable querystring parameter use in an older profile while retaining its raw value', () => {
  const input = document('1.0.0');
  Object.assign(input, {
    components: {
      parameters: { wholeQuery: { name: 'query', in: 'querystring', value: 'n=0&empty=' } },
    },
  });
  Object.assign(input.workflows[0].steps[0], {
    parameters: [{ reference: '$components.parameters.wholeQuery' }],
  });
  const inspected = inspect(createSnapshot(input));
  expect(inspected.workflows[0].steps[0].parameters[0].value.value).toBe('n=0&empty=');
  expect(inspected.workflows[0].steps[0].parameters[0].diagnostics).toContainEqual(
    expect.objectContaining({
      code: 'unsupported-querystring',
      workflowId: 'flow.A',
      stepId: 'init',
      declarationPath: ['components', 'parameters', 'wholeQuery'],
    }),
  );
});
