import { expect, test } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { generateDocumentation } from '../src/utils/documentation/docGenerator';
import { generateMermaidFlowchart } from '../src/utils/documentation/mermaidFlowchartGenerator';
import { projectOccurrenceDetails } from '../src/utils/sequence/occurrenceDetails';
import { buildSequence } from '../src/utils/sequence/sequenceModel';
import type { ArazzoDocument } from '../src/types/arazzo';
import { parameterSemantics } from './fixtures/inspection-semantics';

test('step applicable parameters retain inheritance, overrides, and unresolved provenance', () => {
  const input = structuredClone(parameterSemantics);
  const model = buildViewerModel(inspect(createSnapshot(input)));
  const inherited = model.stepsByWorkflow.get('caller')!.get('inherited')!;
  const overridden = model.stepsByWorkflow.get('caller')!.get('overridden')!;
  const call = model.stepsByWorkflow.get('caller')!.get('call')!;
  expect(inherited.parameters).toEqual([]);
  expect(
    inherited.applicableParameters.map((p) => [p.value.name, p.value.in, p.value.value, p.origin]),
  ).toEqual([
    ['token', 'header', 'workflow-token', 'workflow'],
    ['query', 'querystring', 'a=1&b={$inputs.b}', 'workflow'],
    ['amount', undefined, '$inputs.amount', 'workflow'],
    [undefined, undefined, undefined, 'workflow'],
  ]);
  expect(
    overridden.applicableParameters.map((p) => [p.value.name, p.value.in, p.origin, p.isOverride]),
  ).toEqual([
    ['query', 'querystring', 'workflow', false],
    ['amount', undefined, 'workflow', false],
    [undefined, undefined, 'workflow', false],
    ['token', 'header', 'step', true],
    ['token', 'query', 'step', false],
  ]);
  expect(overridden.applicableParameters[3]).toMatchObject({
    path: ['workflows', 0, 'steps', 1, 'parameters', 0],
    declarationPath: ['components', 'parameters', 'token'],
    applicableWorkflowId: 'caller',
    applicableStepId: 'overridden',
  });
  expect(overridden.applicableParameters[2].status).toBe('unresolved');
  expect(call.applicableParameters.map((p) => p.value.value)).toContain('$inputs.amount');
  expect(
    model.relationships.find((r) => r.kind === 'call')?.parameters.map((p) => p.value.value),
  ).toContain('$inputs.amount');
  expect(parameterSemantics).toEqual(input);
});

test.each([
  ['channelPath', 'openapi', 'unsupported'],
  ['operationPath', 'arazzo', 'unsupported'],
  ['channelPath', 'asyncapi', 'declared'],
  ['operationPath', 'openapi', 'declared'],
  ['operationPath', 'asyncapi', 'declared'],
] as const)('%s with %s is %s while retaining source evidence', (field, kind, status) => {
  const locator = `$sourceDescriptions.source.${field === 'channelPath' ? 'channels.orders' : 'operations.run'}`;
  const result = inspect(
    createSnapshot({
      arazzo: '1.1.0',
      info: { title: 'Source roles', version: '1' },
      sourceDescriptions: [{ name: 'source', type: kind, url: './source.yaml' }],
      workflows: [{ workflowId: 'flow', steps: [{ stepId: 'one', [field]: locator }] }],
    }),
  );
  const binding = result.workflows[0].steps[0].sourceBinding;
  expect(binding).toMatchObject({
    status,
    sourceName: 'source',
    sourceType: kind,
    locators: { [field]: locator },
  });
  if (status === 'unsupported')
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'unsupported-source-kind',
        workflowId: 'flow',
        stepId: 'one',
      }),
    );
});

test('conflicting explicit locators stay ambiguous ahead of source-kind classification', () => {
  const result = inspect(
    createSnapshot({
      arazzo: '1.1.0',
      info: { title: 'Source roles', version: '1' },
      sourceDescriptions: [{ name: 'source', type: 'openapi', url: './source.yaml' }],
      workflows: [
        {
          workflowId: 'flow',
          steps: [
            {
              stepId: 'one',
              channelPath: '$sourceDescriptions.source.channels.orders',
              operationPath: '$sourceDescriptions.source.operations.run',
            },
          ],
        },
      ],
    }),
  );
  expect(result.workflows[0].steps[0].sourceBinding.status).toBe('ambiguous');
});

test('selected details, documentation, calls, and flowchart share applicable values and provenance', () => {
  const model = buildViewerModel(inspect(createSnapshot(parameterSemantics)));
  const details = projectOccurrenceDetails(model, 'caller', 'overridden')!;
  const rows = details.reading.sections.find((section) => section.title === 'Parameters');
  expect(rows?.kind).toBe('values');
  if (rows?.kind !== 'values') throw new Error('missing parameter rows');
  expect(rows.present).toBe(true);
  expect(rows.rows.map((row) => [row.label, row.value, row.origin, row.isOverride])).toEqual([
    ['query', 'a=1&b={$inputs.b}', 'workflow', false],
    ['amount', '$inputs.amount', 'workflow', false],
    ['$components.parameters.missing', undefined, 'workflow', false],
    ['token', 'shared-token', 'step', true],
    ['token', 'different-location', 'step', false],
  ]);
  const inherited = projectOccurrenceDetails(model, 'caller', 'inherited')!.reading.sections.find(
    (section) => section.title === 'Parameters',
  );
  expect(inherited?.kind === 'values' && inherited.present).toBe(false);
  const docs = generateDocumentation(parameterSemantics, { model });
  expect(docs.workflows[0].steps[1].parameters?.map((parameter) => parameter.value)).toEqual(
    model.workflows[0].steps[1].applicableParameters.map((parameter) => parameter.value.value),
  );
  expect(docs.workflowMarkdowns.get('caller')).toContain('querystring');
  expect(docs.workflowMarkdowns.get('caller')).toContain('overrides workflow parameter');
  expect(
    model.relationships
      .find((relation) => relation.kind === 'call')
      ?.parameters.map((parameter) => parameter.value.value),
  ).toContain('$inputs.amount');
  expect(generateMermaidFlowchart(parameterSemantics.workflows[0], model)).toContain(
    '5 parameters',
  );
});

test('incompatible explicit source remains inspectable without a declared destination', () => {
  const document: ArazzoDocument = {
    arazzo: '1.1.0',
    info: { title: 'Mismatched source', version: '1' },
    sourceDescriptions: [{ name: 'api', type: 'openapi', url: './api.yaml' }],
    workflows: [
      {
        workflowId: 'flow',
        steps: [{ stepId: 'one', channelPath: '$sourceDescriptions.api.channels.orders' }],
      },
    ],
  };
  const model = buildViewerModel(inspect(createSnapshot(document)));
  const step = model.workflows[0].steps[0];
  const scene = buildSequence(model, 'flow');
  expect(step.sourceBinding).toMatchObject({ sourceName: 'api', status: 'unsupported' });
  expect(scene.rows[0].kind).toBe('operation');
  expect(
    scene.participants.some(
      (participant) => participant.kind === 'source' && participant.name === 'api',
    ),
  ).toBe(false);
  const details = projectOccurrenceDetails(model, 'flow', 'one')!;
  expect(
    details.sections.find((section) => section.title === 'Source metadata')?.value,
  ).toMatchObject({
    sourceName: 'api',
    status: 'unsupported',
    locators: { channelPath: '$sourceDescriptions.api.channels.orders' },
  });
  const docs = generateDocumentation(document, { model });
  expect(docs.workflows[0].steps[0].sourceBinding?.verification).toBe('unresolved');
  expect(docs.workflowMarkdowns.get('flow')).toContain('does not support this authored locator');
  expect(docs.workflowMarkdowns.get('flow')).toContain('$sourceDescriptions.api.channels.orders');
});
