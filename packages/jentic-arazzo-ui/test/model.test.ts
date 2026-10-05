import { describe, expect, it } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';

const make = (version = '1.1.0') => ({
  arazzo: version,
  info: { title: 'test', version: '1' },
  sourceDescriptions: [],
  workflows: [
    {
      workflowId: 'a',
      _internalId: 'collision',
      successActions: [
        { name: 'match', type: 'goto', workflowId: 'b' },
        { name: 'default', type: 'end' },
      ],
      failureActions: [{ name: 'match', type: 'retry', workflowId: 'b' }],
      steps: [
        {
          stepId: 'init',
          _internalId: 'collision',
          onSuccess: [
            { name: 'match', type: 'goto', workflowId: 'a' },
            { name: 'extra', type: 'end' },
            { reference: '$components.successActions.absent', value: 0 },
          ],
          onFailure: [{ name: 'match', type: 'goto', workflowId: 'b' }],
        },
      ],
    },
    {
      workflowId: 'b',
      _internalId: 'collision',
      steps: [{ stepId: 'init', _internalId: 'collision' }],
    },
  ],
});

describe('shared viewer inspection policy', () => {
  it('keeps step entries first, retains defaults by name/type/channel, and preserves original collections', () => {
    const model = buildViewerModel(inspect(createSnapshot(make())));
    const step = model.workflows[0].steps[0];
    expect(step.effectiveActions.onSuccess.map((a) => a.value.name ?? a.value.reference)).toEqual([
      'match',
      'extra',
      '$components.successActions.absent',
      'default',
    ]);
    expect(step.effectiveActions.onSuccess[0].isOverride).toBe(true);
    expect(step.effectiveActions.onSuccess[2].status).toBe('unresolved');
    expect(step.effectiveActions.onFailure.map((a) => a.value.type)).toEqual(['goto', 'retry']);
    expect(step.actions.onSuccess).toHaveLength(3);
    expect(model.workflows[0].actions.onSuccess).toHaveLength(2);
    expect(model.orderLabel).toBe('Viewer inspection order');
  });

  it('gives scoped identities to colliding authored IDs, preserving authored content in the native snapshot', () => {
    const snapshot = createSnapshot(make());
    const model = buildViewerModel(inspect(snapshot));
    expect(model.workflows[0].steps[0].nodeId).not.toBe(model.workflows[1].steps[0].nodeId);
    expect(snapshot.document.workflows[0]._internalId).toBe('collision');
    expect(model.nodeIds.get('a')!.get('init')).toBe(model.workflows[0].steps[0].nodeId);
  });

  it('preserves parallel channels and self-loop relationships using serialized tuple IDs', () => {
    const model = buildViewerModel(inspect(createSnapshot(make(), { id: 'document' })));
    expect(model.relationships).toHaveLength(3);
    expect(new Set(model.relationships.map((edge) => edge.id)).size).toBe(3);
    expect(
      model.relationships.some((edge) => edge.sourceWorkflowId === edge.targetWorkflowId),
    ).toBe(true);
    expect(model.relationships.every((edge) => JSON.parse(edge.id)[0] === 'document')).toBe(true);
  });

  it.each([0, false, '', null, ['literal'], { selector: '$inputs.query' }])(
    'retains action parameter own-property override %j and does not mutate a definition',
    (override) => {
      const input = make();
      Object.assign(input, {
        components: {
          parameters: { 'auth.token': { name: 'token', value: 'default', in: 'querystring' } },
          successActions: {
            shared: {
              name: 'mapped',
              type: 'goto',
              workflowId: 'b',
              parameters: [
                { reference: '$components.parameters.auth.token', value: override },
                { reference: '$components.parameters.auth.token' },
              ],
            },
          },
        },
      });
      Object.assign(input.workflows[0].steps[0], {
        onSuccess: [{ reference: '$components.successActions.shared' }],
      });
      const before = JSON.stringify(input);
      const step = buildViewerModel(inspect(createSnapshot(input))).workflows[0].steps[0];
      expect(step.effectiveActions.onSuccess[0].parameters.map((p) => p.value.value)).toEqual([
        override,
        'default',
      ]);
      expect(JSON.stringify(input)).toBe(before);
    },
  );
});

describe('action provenance and identity trust', () => {
  it('retains inherited retry defaults with source-step applicability and declaration ownership', () => {
    const input = make();
    input.workflows[0].failureActions = [{ name: 'again', type: 'retry' }] as any;
    Object.assign(input.workflows[0].steps[0], { onFailure: [] });
    const action = buildViewerModel(inspect(createSnapshot(input))).workflows[0].steps[0]
      .effectiveActions.onFailure[0];
    expect(action.status).toBe('resolved');
    expect(action.origin).toBe('workflow');
    expect(action.stepId).toBeUndefined();
    expect(action.applicableStepId).toBe('init');
    expect(action.target).toMatchObject({ kind: 'local-step', workflowId: 'a', stepId: 'init' });
  });

  it('retains unique verified provider tracking IDs and rejects collisions', () => {
    const input = make();
    input.workflows[0]._internalId = 'workflow-a';
    input.workflows[1]._internalId = 'workflow-b';
    input.workflows[0].steps[0]._internalId = 'step-a';
    input.workflows[1].steps[0]._internalId = 'step-b';
    const model = buildViewerModel(inspect(createSnapshot(input, { trustedInternalIds: true })));
    expect(model.nodeIds.get('a')?.get('init')).toBe('workflow-a-step-a');
    expect(model.nodeIds.get('b')?.get('init')).toBe('workflow-b-step-b');
  });

  it('projects repeated missing reusable parameter warnings to each action use without fabricated values', () => {
    const input = make();
    Object.assign(input, {
      components: {
        failureActions: {
          recover: {
            name: 'recover',
            type: 'goto',
            workflowId: 'b',
            parameters: [
              { reference: '$components.parameters.absent', value: 0, 'x-details': 'kept' },
            ],
          },
        },
      },
    });
    Object.assign(input.workflows[0].steps[0], {
      onFailure: [{ reference: '$components.failureActions.recover' }],
    });
    Object.assign(input.workflows[1].steps[0], {
      onFailure: [{ reference: '$components.failureActions.recover' }],
    });
    const model = buildViewerModel(inspect(createSnapshot(input)));
    for (const workflow of model.workflows) {
      const action = workflow.steps[0].effectiveActions.onFailure[0];
      expect(action.parameters[0].value).toEqual({
        reference: '$components.parameters.absent',
        value: 0,
        'x-details': 'kept',
      });
      expect(action.parameters[0].diagnostics[0]).toMatchObject({
        workflowId: workflow.workflowId,
        stepId: 'init',
        declarationPath: ['components', 'failureActions', 'recover', 'parameters', 0],
      });
    }
  });
});

it('flags only prerequisite-only cycle edges, preserving entering and mixed relationships', () => {
  const input = {
    arazzo: '1.0.0',
    info: { title: 'cycles', version: '1' },
    sourceDescriptions: [],
    workflows: [
      { workflowId: 'a', dependsOn: ['b'], steps: [{ stepId: 'call', workflowId: 'c' }] },
      { workflowId: 'b', dependsOn: ['a', 'c'], steps: [] },
      { workflowId: 'c', steps: [{ stepId: 'call', workflowId: 'a' }] },
      { workflowId: 'self', dependsOn: ['self'], steps: [] },
    ],
  };
  const model = buildViewerModel(inspect(createSnapshot(input)));
  const warnings = model.diagnostics.filter(
    (diagnostic) => diagnostic.category === 'prerequisite-cycle',
  );
  expect(warnings).toHaveLength(3);
  expect(warnings.map((diagnostic) => diagnostic.workflowId)).toEqual(['a', 'b', 'self']);
  expect(warnings.every((diagnostic) => diagnostic.path.at(-1) === 0)).toBe(true);
});

it('does not let a verified supplied ID collide with a generated sidecar ID', () => {
  const input = make();
  input.workflows[0]._internalId = 'viewer-["fixed","workflow",1]';
  Object.assign(input.workflows[1], { _internalId: undefined });
  const model = buildViewerModel(
    inspect(createSnapshot(input, { id: 'fixed', trustedInternalIds: true })),
  );
  expect(model.workflows[0].internalId).not.toBe(model.workflows[1].internalId);
  expect(new Set(model.workflows.map((workflow) => workflow.nodeId)).size).toBe(2);
});

it('keeps typed unresolved and unsupported entries visible without suppressing or inventing defaults', () => {
  const input = make();
  Object.assign(input.workflows[0].steps[0], {
    onSuccess: [
      {
        reference: '$components.successActions.absent',
        name: 'match',
        type: 'goto',
        workflowId: 'b',
        value: false,
      },
      { name: 'match', type: 'teleport', workflowId: 'b', 'x-control': true },
    ],
    onFailure: [],
  });
  const model = buildViewerModel(inspect(createSnapshot(input)));
  const actions = model.workflows[0].steps[0].effectiveActions.onSuccess;
  expect(actions.map((action) => action.status)).toEqual([
    'unresolved',
    'unsupported',
    'resolved',
    'resolved',
  ]);
  expect(actions.every((action) => !action.isOverride)).toBe(true);
  expect(actions[0].value.value).toBe(false);
  expect(actions[1].value['x-control']).toBe(true);
  expect(model.relationships.filter((edge) => edge.channel === 'onSuccess')).toHaveLength(1);
});

it('retains defaults when a same-name step transition has conflicting locators', () => {
  const input = make();
  Object.assign(input.workflows[0].steps[0], {
    onSuccess: [{ name: 'match', type: 'goto', workflowId: 'b', stepId: 'init' }],
    onFailure: [],
  });
  const model = buildViewerModel(inspect(createSnapshot(input)));
  expect(
    model.workflows[0].steps[0].effectiveActions.onSuccess.map((action) => action.status),
  ).toEqual(['unsupported', 'resolved', 'resolved']);
  expect(model.relationships.filter((edge) => edge.channel === 'onSuccess')).toHaveLength(1);
});

it('rejects verified tracking combinations that collide under the legacy node-ID format', () => {
  const input = make();
  input.workflows[0]._internalId = 'owner';
  input.workflows[0].steps[0]._internalId = 'part-tail';
  input.workflows[1]._internalId = 'owner-part';
  input.workflows[1].steps[0]._internalId = 'tail';
  const model = buildViewerModel(inspect(createSnapshot(input, { trustedInternalIds: true })));
  expect(model.workflows[0].steps[0].nodeId).not.toBe(model.workflows[1].steps[0].nodeId);
  input.workflows[0].steps[0]._internalId = 'start';
  const reserved = buildViewerModel(inspect(createSnapshot(input, { trustedInternalIds: true })));
  expect(reserved.workflows[0].steps[0].nodeId).not.toBe(
    `${reserved.workflows[0].internalId}-start`,
  );
});
