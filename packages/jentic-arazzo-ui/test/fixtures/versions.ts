// raw fixtures deliberately include fields beyond the public supported-field types.
export const sharedFeatures10 = {
  arazzo: '1.0.1',
  info: { title: 'Shared composition', version: '99.7.3' },
  sourceDescriptions: [{ name: 'api', url: 'https://example.test/openapi.yaml', type: 'openapi' }],
  workflows: [
    {
      workflowId: 'authWorkflow',
      steps: [{ stepId: 'init', operationId: '$sourceDescriptions.api.login' }],
    },
    {
      workflowId: 'orderWorkflow',
      dependsOn: ['authWorkflow'],
      steps: [{ stepId: 'checkout', workflowId: 'authWorkflow' }],
    },
  ],
};

export const sharedFeatures11 = { ...structuredClone(sharedFeatures10), arazzo: '1.1.0' };
export const patchVersion = { ...structuredClone(sharedFeatures10), arazzo: '1.0.9' };
export const descriptionVersion = {
  ...structuredClone(sharedFeatures10),
  info: { title: 'Shared composition', version: '1.1.0' },
};
export const unknownVersion = {
  ...structuredClone(sharedFeatures10),
  arazzo: '1.2.0',
  futureControl: { kind: 'teleport', target: 'authWorkflow' },
};
export const unsupportedParsingVersion = { ...structuredClone(unknownVersion), arazzo: '9.7.0' };
export const newerFieldsIn10 = {
  ...structuredClone(sharedFeatures10),
  workflows: [
    {
      workflowId: 'legacy',
      steps: [
        {
          stepId: 'receive',
          operationId: 'event',
          dependsOn: ['prepare'],
          action: 'receive',
          channelPath: '$sourceDescriptions.events.channels.orders',
          timeout: 5000,
          correlationId: '$message.header#/requestId',
          parameters: [{ name: 'query', in: 'querystring', value: 'q={$inputs.q}&limit=0' }],
          onFailure: [
            { name: 'recover', type: 'retry', parameters: [{ name: 'attempt', value: 0 }] },
          ],
        },
      ],
    },
  ],
};

export const provenance = {
  arazzo: '1.1.0',
  $self: 'https://identity.example.test/canonical/workflow.arazzo.yaml',
  info: { title: 'Opaque authored content', version: 'draft' },
  unknownRoot: { future: true },
  'x-recovery-marker': { reference: '$components.parameters.not-a-reference' },
  sourceDescriptions: [
    {
      name: 'api',
      type: 'openapi',
      url: '../api/openapi.yaml',
      unknownSource: 7,
      'x-source': { nested: true },
    },
  ],
  workflows: [
    {
      workflowId: 'authWorkflow',
      _internalId: 'authored-collision',
      unknownWorkflow: false,
      'x-workflow': ['opaque'],
      inputs: {
        $schema: 'https://dialects.example.test/custom',
        $id: 'schemas/input.json',
        $ref: './relative.json',
        unknownVocabulary: { reference: '$components.inputs.fake' },
        examples: [{ reference: '$components.parameters.literal' }],
        'x-schema': { custom: true },
      },
      steps: [
        {
          stepId: 'init',
          _internalId: 'authored-collision',
          operationId: 'login',
          unknownStep: null,
          'x-step': { reference: '$components.failureActions.fake' },
          parameters: [
            { name: 'token', value: '$inputs.token', unknownParameter: [], 'x-parameter': 0 },
          ],
          onFailure: [
            {
              name: 'future',
              type: 'teleport',
              workflowId: 'authWorkflow',
              unknownAction: { active: true },
              'x-action': false,
            },
          ],
        },
      ],
      failureActions: [{ name: 'future', type: 'goto', workflowId: 'authWorkflow' }],
    },
  ],
};
export const retrievalURI = 'https://retrieval.example.test/download/document.yaml';

// syntax/root/identity failures are inputs for loader tests, not valid fixture documents.
export const fatalInputs = {
  invalidJSON: '{"arazzo":',
  invalidYAML: 'workflows: [\n  broken:',
  unusableRoot: '42',
  duplicateWorkflows: {
    ...structuredClone(sharedFeatures10),
    workflows: [
      structuredClone(sharedFeatures10.workflows[0]),
      structuredClone(sharedFeatures10.workflows[0]),
    ],
  },
  duplicateSteps: {
    ...structuredClone(sharedFeatures10),
    workflows: [
      {
        workflowId: 'duplicates',
        steps: [
          { stepId: 'init', operationId: 'a' },
          { stepId: 'init', operationId: 'b' },
        ],
      },
    ],
  },
  malformedReusable: {
    ...structuredClone(sharedFeatures10),
    workflows: [
      {
        workflowId: 'malformed',
        steps: [
          {
            stepId: 'init',
            operationId: 'a',
            parameters: [{ reference: '$components.parameters[' }],
          },
        ],
      },
    ],
  },
  brokenSchema: {
    ...structuredClone(sharedFeatures10),
    workflows: [
      {
        workflowId: 'schema',
        inputs: { $ref: '#/components/inputs/absent' },
        steps: [{ stepId: 'init', operationId: 'a' }],
      },
    ],
  },
};
