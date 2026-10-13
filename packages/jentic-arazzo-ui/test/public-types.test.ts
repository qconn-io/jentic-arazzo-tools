import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  ArazzoDocument,
  CatalogCoverageReport,
  CatalogSelection,
  DocumentationMetadata,
  DocumentationPrerequisite,
  DocumentationSourceBinding,
  DocumentationSupport,
  ExternalNavigationRequest,
  ExternalWorkflowNavigationRequest,
  Parameter,
  ProvidedSourceProvenance,
  ReusableObject,
  SourceProvenance,
  StepDocumentation,
  WorkflowCatalogCoverage,
  WorkflowCatalogSelection,
  WorkflowDocumentation,
  WorkflowLocationJSON,
  WorkflowRefNodeData,
  WorkflowReviewResult,
  WorkflowReviewValue,
  WorkflowRevisionComparison,
} from '../src/ArazzoUI';
import type {
  ArazzoDocument as StandaloneDocument,
  CatalogCoverageReport as StandaloneCatalogCoverageReport,
  CatalogSelection as StandaloneCatalogSelection,
  DocumentationPrerequisite as StandalonePrerequisite,
  DocumentationSourceBinding as StandaloneSourceBinding,
  DocumentationSupport as StandaloneSupport,
  ExternalWorkflowNavigationRequest as StandaloneExternalWorkflowNavigationRequest,
  SourceProvenance as StandaloneSourceProvenance,
  WorkflowRefNodeData as StandaloneWorkflowRefNodeData,
  WorkflowRevisionComparison as StandaloneWorkflowRevisionComparison,
} from '../src/ArazzoUIStandalone';

// these annotations compile as consumers of the public entry points.
const legacyCall: WorkflowRefNodeData = {
  type: 'workflowRef',
  step: { stepId: 'call', workflowId: 'child' },
  targetWorkflowId: 'child',
  isValid: true,
};
const legacyWorkflowDocs: WorkflowDocumentation = { workflowId: 'parent', steps: [] };
const legacyStepDocs: StepDocumentation = { stepId: 'call' };
const legacyMetadata: DocumentationMetadata = {
  title: 'example',
  version: '1',
  arazzoVersion: '1.0.1',
  sourceDescriptions: [],
};
const selectedFields: ArazzoDocument = {
  arazzo: '1.1.0',
  $self: 'https://example.test/workflow.arazzo.json',
  info: { title: 'example', version: '1' },
  sourceDescriptions: [{ name: 'events', url: 'events.yaml', type: 'asyncapi' }],
  workflows: [
    {
      workflowId: 'parent',
      steps: [
        {
          stepId: 'receive',
          dependsOn: ['send'],
          channelPath: '$sourceDescriptions.events.channels.order',
          action: 'receive',
          timeout: 6000,
          correlationId: '$inputs.id',
          parameters: [{ name: 'query', in: 'querystring', value: 'id=42' }],
          onSuccess: [
            {
              name: 'finish',
              type: 'end',
              parameters: [{ reference: '$components.parameters.flag', value: false }],
            },
          ],
          onFailure: [
            { name: 'retry', type: 'retry', parameters: [{ name: 'attempt', value: 0 }] },
          ],
        },
      ],
    },
  ],
};

const overrideValues: ReusableObject[] = [
  0,
  false,
  '',
  null,
  ['a'],
  { location: '$message.payload', type: 'jsonpath' },
].map((value) => ({ reference: '$components.parameters.value', value }));

describe('public type compatibility', () => {
  it('keeps legacy call-node and documentation fields optional', () => {
    expect(legacyCall.workflowId).toBeUndefined();
    expect(legacyWorkflowDocs.prerequisites).toBeUndefined();
    expect(legacyStepDocs.sourceBinding).toBeUndefined();
    expect(legacyMetadata.support).toBeUndefined();
  });

  it('accepts the selected 1.1 fields and preserves literal reusable values', () => {
    expect(selectedFields.workflows[0].steps[0].action).toBe('receive');
    expect(overrideValues.map(({ value }) => value)).toEqual([
      0,
      false,
      '',
      null,
      ['a'],
      { location: '$message.payload', type: 'jsonpath' },
    ]);
    expectTypeOf<ReusableObject['value']>().toEqualTypeOf<Parameter['value']>();
  });

  it('exports identical public contracts and spec-documented aliases from both entries', () => {
    expectTypeOf<StandaloneDocument>().toEqualTypeOf<ArazzoDocument>();
    expectTypeOf<StandaloneWorkflowRefNodeData>().toEqualTypeOf<WorkflowRefNodeData>();
    expectTypeOf<StandaloneSupport>().toEqualTypeOf<DocumentationSupport>();
    expectTypeOf<StandaloneSourceBinding>().toEqualTypeOf<DocumentationSourceBinding>();
    expectTypeOf<StandalonePrerequisite>().toEqualTypeOf<DocumentationPrerequisite>();
    expectTypeOf<WorkflowReviewValue>().toEqualTypeOf<WorkflowLocationJSON>();
    expectTypeOf<SourceProvenance>().toEqualTypeOf<ProvidedSourceProvenance>();
    expectTypeOf<StandaloneSourceProvenance>().toEqualTypeOf<ProvidedSourceProvenance>();
    expectTypeOf<ExternalWorkflowNavigationRequest>().toEqualTypeOf<ExternalNavigationRequest>();
    expectTypeOf<StandaloneExternalWorkflowNavigationRequest>().toEqualTypeOf<ExternalNavigationRequest>();
    expectTypeOf<CatalogSelection>().toEqualTypeOf<WorkflowCatalogSelection>();
    expectTypeOf<StandaloneCatalogSelection>().toEqualTypeOf<WorkflowCatalogSelection>();
    expectTypeOf<CatalogCoverageReport>().toEqualTypeOf<WorkflowCatalogCoverage>();
    expectTypeOf<StandaloneCatalogCoverageReport>().toEqualTypeOf<WorkflowCatalogCoverage>();
    expectTypeOf<WorkflowRevisionComparison>().toEqualTypeOf<WorkflowReviewResult>();
    expectTypeOf<StandaloneWorkflowRevisionComparison>().toEqualTypeOf<WorkflowReviewResult>();
  });
});
