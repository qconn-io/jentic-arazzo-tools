import { describe, expect, test } from 'vitest';

import * as fixtures from './fixtures';

describe('early chained-workflow fixtures', () => {
  test('shared 1.0 and 1.1 composition differs only in declared feature version', () => {
    const { arazzo: v10, ...common10 } = fixtures.sharedFeatures10;
    const { arazzo: v11, ...common11 } = fixtures.sharedFeatures11;
    expect(v10).toBe('1.0.1');
    expect(v11).toBe('1.1.0');
    expect(common10).toEqual(common11);
    expect(common10.workflows[1].dependsOn).toEqual(['authWorkflow']);
  });

  test('patch and info versions vary independently without changing common content', () => {
    expect(fixtures.patchVersion).toEqual({ ...fixtures.sharedFeatures10, arazzo: '1.0.9' });
    expect(fixtures.descriptionVersion).toEqual({
      ...fixtures.sharedFeatures10,
      info: { ...fixtures.sharedFeatures10.info, version: '1.1.0' },
    });
    expect(fixtures.sharedFeatures10.info.version).toBe('99.7.3');
  });

  test('new fields in 1.0 and raw future-version content remain authored', () => {
    expect(fixtures.newerFieldsIn10.arazzo).toBe('1.0.1');
    expect(fixtures.newerFieldsIn10.workflows[0].steps[0]).toMatchObject({
      dependsOn: ['prepare'],
      action: 'receive',
      timeout: 5000,
      correlationId: '$message.header#/requestId',
    });
    expect(fixtures.unknownVersion.arazzo).toBe('1.2.0');
    expect(fixtures.unsupportedParsingVersion.arazzo).toBe('9.7.0');
    expect(fixtures.unknownVersion.futureControl).toEqual({
      kind: 'teleport',
      target: 'authWorkflow',
    });
  });

  test('unknown action collides with a recognized default without losing authored content', () => {
    const workflow = fixtures.provenance.workflows[0];
    expect(workflow.steps[0].onFailure[0]).toMatchObject({
      name: 'future',
      type: 'teleport',
      unknownAction: { active: true },
    });
    expect(workflow.failureActions[0]).toMatchObject({ name: 'future', type: 'goto' });
  });

  test('identity, retrieval URI, custom dialect, relative references and extension payloads are distinct', () => {
    expect(fixtures.provenance.$self).not.toBe(fixtures.retrievalURI);
    expect(fixtures.provenance.workflows[0].inputs).toMatchObject({
      $schema: 'https://dialects.example.test/custom',
      $id: 'schemas/input.json',
      $ref: './relative.json',
    });
    expect(fixtures.provenance['x-recovery-marker']).toEqual({
      reference: '$components.parameters.not-a-reference',
    });
    expect(fixtures.provenance.workflows[0]._internalId).toBe(
      fixtures.provenance.workflows[0].steps[0]._internalId,
    );
    expect(fixtures.sharedFeatures10).not.toHaveProperty('$self');
    expect(fixtures.sharedFeatures10).not.toHaveProperty('retrievalURI');
  });

  test('unknown fields and extensions exist at every authored structural level', () => {
    const doc = fixtures.provenance;
    expect(doc.unknownRoot).toEqual({ future: true });
    expect(doc.sourceDescriptions[0]).toMatchObject({
      unknownSource: 7,
      'x-source': { nested: true },
    });
    expect(doc.workflows[0]).toMatchObject({ unknownWorkflow: false, 'x-workflow': ['opaque'] });
    expect(doc.workflows[0].steps[0]).toMatchObject({
      unknownStep: null,
      'x-step': { reference: '$components.failureActions.fake' },
    });
    expect(doc.workflows[0].steps[0].parameters[0]).toMatchObject({
      unknownParameter: [],
      'x-parameter': 0,
    });
    expect(doc.workflows[0].steps[0].onFailure[0]['x-action']).toBe(false);
    expect(doc.workflows[0].inputs['x-schema']).toEqual({ custom: true });
  });

  test('workflow permutations have identical per-workflow contents and isolated objects', () => {
    const first = fixtures.missingReferencesFirst;
    const last = fixtures.missingReferencesLast;
    expect(first.workflows.map((workflow) => workflow.workflowId)).toEqual(['missing', 'valid']);
    expect(last.workflows.map((workflow) => workflow.workflowId)).toEqual(['valid', 'missing']);
    first.workflows.forEach((workflow) => {
      const counterpart = last.workflows.find(
        (candidate) => candidate.workflowId === workflow.workflowId,
      );
      expect(counterpart).toEqual(workflow);
      expect(counterpart).not.toBe(workflow);
    });
    expect(last.components).toEqual(first.components);
    expect(last.components).not.toBe(first.components);
  });

  test('valid references coexist with repeated component actions containing missing zero-valued parameters', () => {
    const doc = fixtures.missingReferencesFirst;
    expect(doc.workflows[1].inputs).toEqual({ $ref: '#/components/inputs/order' });
    expect(doc.workflows[1].steps).toHaveLength(2);
    for (const step of doc.workflows[1].steps) {
      expect(step.onFailure).toEqual([{ reference: '$components.failureActions.recover' }]);
      expect(step.onSuccess).toEqual([{ reference: '$components.successActions.done' }]);
      expect(step.parameters).toEqual([{ reference: '$components.parameters.token', value: 0 }]);
    }
    expect(doc.components.failureActions.recover.parameters).toEqual([
      { reference: '$components.parameters.absent', value: 0, 'x-use': 'keep' },
    ]);
    expect(doc.workflows[0].steps[0].onFailure[0]).toMatchObject({
      reference: '$components.failureActions.absent',
      value: false,
      'x-authored': { keep: true },
    });
  });

  test('absent components and absent parameter/action buckets are separate cases', () => {
    expect(fixtures.absentComponents).not.toHaveProperty('components');
    expect(fixtures.absentBucket.components).not.toHaveProperty('parameters');
    expect(fixtures.absentBucket.components).not.toHaveProperty('failureActions');
    expect(fixtures.absentBucket.workflows).toEqual(fixtures.absentComponents.workflows);
  });

  test('reference-shaped literals occupy values, criteria, examples, descriptions and extensions', () => {
    const doc = fixtures.referenceShapedLiterals;
    expect(doc.info.description).toBe('$components.parameters.description');
    expect(doc['x-extension'].reference).toBe('$components.failureActions.extension');
    expect(doc.workflows[0].inputs.examples[0].reference).toBe('$components.parameters.example');
    expect(doc.workflows[0].steps[0].parameters.map((parameter) => parameter.value)).toEqual([
      { reference: '$components.parameters.object' },
      '$components.parameters.string',
    ]);
    expect(doc.workflows[0].steps[0].successCriteria[0].condition).toContain(
      '$components.parameters.criterion',
    );
    expect(doc.workflows[0].steps[0].onFailure[0].parameters[0].reference).toBe(
      '$components.parameters.dotted.key',
    );
    expect(doc.components.parameters['dotted.key'].value).toBe(0);
  });

  test('every falsy/structured/expression/selector override has an own value property; omission does not', () => {
    const actions = fixtures.parameterOverrides.workflows[0].steps[0].onFailure;
    fixtures.overrideValues.forEach((value, index) => {
      expect(Object.hasOwn(actions[index].parameters[0], 'value')).toBe(true);
      expect(actions[index].parameters[0]).toMatchObject({
        reference: '$components.parameters.shared',
        value,
      });
    });
    expect(Object.hasOwn(actions[actions.length - 1].parameters[0], 'value')).toBe(false);
    expect(fixtures.parameterOverrides.components.parameters.shared.value).toBe(
      'component-default',
    );
  });

  test('duplicate init IDs and authored tracking collisions retain different owning contents', () => {
    const [a, b, c] = fixtures.scopedActions.workflows;
    expect([a, b, c].map((workflow) => workflow.steps[0].stepId)).toEqual(['init', 'init', 'init']);
    expect(a.steps[0]._internalId).toBe(b.steps[0]._internalId);
    expect(a.steps[0].parameters).toEqual([{ name: 'owner', value: 'A' }]);
    expect(b.steps[0].parameters).toEqual([{ name: 'owner', value: 'B' }]);
    expect(b.steps[0].onFailure).toEqual([{ name: 'B-only', type: 'end' }]);
  });

  test('action fixtures preserve partial overrides, additions, criteria, channel/type collisions and empty lists', () => {
    const a = fixtures.scopedActions.workflows[0];
    expect(a.successActions?.map((action) => action.name)).toEqual(['same', 'default-end']);
    expect(a.failureActions?.map((action) => [action.name, action.type])).toEqual([
      ['same', 'retry'],
      ['same', 'goto'],
      ['default-end', 'end'],
    ]);
    expect(a.steps[0].onFailure?.map((action) => ('name' in action ? action.name : null))).toEqual([
      'same',
      'extra',
    ]);
    expect(a.steps[0].onFailure?.[0]).toMatchObject({
      criteria: [{ condition: '$statusCode >= 400' }],
    });
    expect(a.failureActions[0].criteria).toEqual([{ condition: '$statusCode == 401' }]);
    expect(a.steps[3]).toMatchObject({ onSuccess: [], onFailure: [] });
    expect(a.steps[4].onFailure).toEqual([{ reference: '$components.failureActions.absent' }]);
  });

  test('bare prepare prerequisite resolves contextually and call ownership differs from destination', () => {
    const [a, b] = fixtures.scopedActions.workflows;
    expect(a.steps[2]).toMatchObject({
      stepId: 'call',
      workflowId: 'flowB',
      dependsOn: ['prepare', '$workflows.flowB.steps.init'],
    });
    expect(a.steps.some((step) => step.stepId === 'prepare')).toBe(true);
    expect(b.steps.some((step) => step.stepId === 'prepare')).toBe(false);
    expect(b.steps[1].dependsOn).toEqual(['prepare']);
  });

  test('external/local collisions, absent/wrong source kinds, missing/malformed/dotted targets remain authored', () => {
    const doc = fixtures.classifiedTargets;
    expect(doc.workflows[0].steps[0].dependsOn).toEqual([
      'missing',
      '$workflows.flowB.steps.init',
      '$sourceDescriptions.remote.flowB.steps.init',
      '$sourceDescriptions.absent.flowB.steps.init',
      '$sourceDescriptions.http.flowB.steps.init',
      '$workflows.flowB.steps.absent',
      '$workflows.absent.steps.init',
      '$workflows.',
      '$workflows.dotted.workflow.steps.dotted.step',
    ]);
    expect(doc.workflows[0].steps[1].workflowId).toBe('$sourceDescriptions.remote.flowB');
    expect(doc.workflows[1].workflowId).toBe('flowB');
    expect(doc.sourceDescriptions.find((source) => source.name === 'http')?.type).toBe('openapi');
    expect(doc.sourceDescriptions.some((source) => source.name === 'absent')).toBe(false);
    expect(doc.workflows[3].steps[0].stepId).toBe('dotted.step');
  });

  test('replacement changes only shared component definitions', () => {
    const { components: before, ...beforeRest } = fixtures.replacementBefore;
    const { components: after, ...afterRest } = fixtures.replacementAfter;
    expect(afterRest).toEqual(beforeRest);
    expect(before.parameters.token.value).toBe('old');
    expect(after.parameters.token.value).toBe('new');
    expect(before.failureActions.recovery.type).toBe('retry');
    expect(after.failureActions.recovery.type).toBe('end');
    expect(before).not.toBe(after);
  });

  test('async send/receive retain timeout, correlation, prerequisites and complete querystrings', () => {
    const [send, receive, webhook] = fixtures.asynchronous.workflows[0].steps;
    expect(send).toMatchObject({
      action: 'send',
      timeout: 5000,
      correlationId: '$inputs.requestId',
    });
    expect(receive).toMatchObject({
      action: 'receive',
      timeout: 0,
      dependsOn: ['send'],
      correlationId: '$message.header#/requestId',
    });
    expect(send.parameters?.[0]).toEqual({
      name: 'query',
      in: 'querystring',
      value: 'q={$inputs.q}&literal=a%26b&empty=',
    });
    expect(webhook.parameters?.[0].value).toBe('fixed=true&n=0');
  });

  test('opaque and ambiguous sources, conflicting locators and participant/label collisions are explicit', () => {
    const doc = fixtures.asynchronous;
    const steps = doc.workflows[0].steps;
    expect(steps[2].operationPath).toBe('$sourceDescriptions.http.webhooks.orderReceived.post');
    expect(steps[3].operationPath).toBe('urn:vendor:operation:emit');
    expect(steps[4].operationId).toBe('sharedOperation');
    expect(doc.sourceDescriptions[3].type).toBe('future-source');
    expect(steps[6]).toMatchObject({
      operationId: 'send',
      channelPath: 'channels/orders',
      workflowId: 'messages',
    });
    expect(doc.sourceDescriptions[0].name.replace(/\W/g, '')).toBe(
      doc.sourceDescriptions[1].name.replace(/\W/g, ''),
    );
    expect(steps[7].stepId).toContain('"[]|\n');
    expect(steps[7].onFailure?.[0].parameters[0].value).toContain('" and [brackets]|\n');
  });

  test('dense graph preserves parallel channels/source steps, calls, self-loop and disconnected workflow', () => {
    const graph = fixtures.relationshipGraph;
    const a = graph.workflows[1];
    expect(a.dependsOn).toEqual(['entry', 'wfB']);
    expect(a.steps[0].workflowId).toBe('wfB');
    expect(a.steps[0].onSuccess?.[0]).toEqual(a.steps[0].onFailure?.[0]);
    expect(a.steps[1].onFailure?.[0]).toEqual(a.steps[0].onFailure?.[0]);
    expect(a.steps[0].onFailure?.[1]).toMatchObject({
      name: 'self',
      type: 'retry',
      workflowId: 'wfA',
    });
    expect(graph.workflows[2].dependsOn).toEqual(['wfA']);
    expect(graph.workflows[3].dependsOn).toEqual(['wfB']);
    expect(graph.workflows[4].dependsOn).toEqual(['selfPrerequisite']);
    expect(graph.workflows[5]).not.toHaveProperty('dependsOn');
  });

  test('runtime and mixed cycles differ from prerequisite-only cycles', () => {
    expect(
      fixtures.callRecoveryCycle.workflows.every(
        (workflow) => !Object.hasOwn(workflow, 'dependsOn'),
      ),
    ).toBe(true);
    expect(fixtures.callRecoveryCycle.workflows[0].steps[0].workflowId).toBe('callB');
    expect(fixtures.callRecoveryCycle.workflows[1].steps[0].onFailure?.[0].workflowId).toBe(
      'callA',
    );
    expect(fixtures.mixedCycle.workflows[0]).toMatchObject({
      dependsOn: ['mixedB'],
      steps: [{ workflowId: 'mixedB' }],
    });
    expect(fixtures.mixedCycle.workflows[1]).not.toHaveProperty('dependsOn');
  });

  test('unlinked grid has multiple columns worth of workflows without authored relationships', () => {
    expect(fixtures.unlinkedGraph.workflows).toHaveLength(7);
    for (const workflow of fixtures.unlinkedGraph.workflows) {
      expect(workflow).not.toHaveProperty('dependsOn');
      expect(workflow.steps[0]).not.toHaveProperty('workflowId');
      expect(workflow.steps[0]).not.toHaveProperty('onFailure');
    }
  });

  test('multiple local prerequisites deliberately differ from authored array order', () => {
    expect(fixtures.localPrerequisites.workflows[0].steps.map((step) => step.stepId)).toEqual([
      'processPayment',
      'validateCard',
      'checkInventory',
    ]);
    expect(fixtures.localPrerequisites.workflows[0].steps[0].dependsOn).toEqual([
      'validateCard',
      'checkInventory',
    ]);
  });

  test('fatal inputs cover syntax, root, duplicate identity, malformed reusable and schema dereference cases', () => {
    expect(() => JSON.parse(fixtures.fatalInputs.invalidJSON)).toThrow();
    expect(JSON.parse(fixtures.fatalInputs.unusableRoot)).toBe(42);
    expect(fixtures.fatalInputs.invalidYAML).toContain('[');
    expect(fixtures.fatalInputs.duplicateWorkflows.workflows[0]).toEqual(
      fixtures.fatalInputs.duplicateWorkflows.workflows[1],
    );
    expect(
      fixtures.fatalInputs.duplicateSteps.workflows[0].steps.map((step) => step.stepId),
    ).toEqual(['init', 'init']);
    expect(
      fixtures.fatalInputs.malformedReusable.workflows[0].steps[0].parameters[0].reference,
    ).toBe('$components.parameters[');
    expect(fixtures.fatalInputs.brokenSchema.workflows[0].inputs.$ref).toBe(
      '#/components/inputs/absent',
    );
  });
});
