const missingWorkflow = {
  workflowId: 'missing',
  steps: [
    {
      stepId: 'init',
      operationId: 'login',
      onFailure: [
        {
          reference: '$components.failureActions.absent',
          value: false,
          'x-authored': { keep: true },
        },
      ],
    },
  ],
};
const validWorkflow = {
  workflowId: 'valid',
  inputs: { $ref: '#/components/inputs/order' },
  steps: ['first', 'second'].map((stepId) => ({
    stepId,
    operationId: 'submit',
    parameters: [{ reference: '$components.parameters.token', value: 0 }],
    onFailure: [{ reference: '$components.failureActions.recover' }],
    onSuccess: [{ reference: '$components.successActions.done' }],
  })),
};
export const missingReferencesFirst = {
  arazzo: '1.1.0',
  info: { title: 'Recovery order', version: '1' },
  sourceDescriptions: [],
  workflows: [missingWorkflow, validWorkflow] satisfies [unknown, unknown],
  components: {
    inputs: { order: { type: 'object', properties: { id: { type: 'string' } } } },
    parameters: {
      token: { name: 'token', in: 'header', value: 'default' },
      'dotted.key': { name: 'dotted', value: false },
    },
    failureActions: {
      recover: {
        name: 'recover',
        type: 'retry',
        workflowId: 'valid',
        parameters: [{ reference: '$components.parameters.absent', value: 0, 'x-use': 'keep' }],
      },
    },
    successActions: { done: { name: 'done', type: 'end' } },
  },
};
export const missingReferencesLast = {
  ...structuredClone(missingReferencesFirst),
  workflows: structuredClone([validWorkflow, missingWorkflow] satisfies [unknown, unknown]),
};
export const absentComponents = {
  arazzo: '1.1.0',
  info: { title: 'Absent collections', version: '1' },
  sourceDescriptions: [],
  workflows: [
    {
      workflowId: 'absent',
      steps: [
        {
          stepId: 'init',
          operationId: 'go',
          parameters: [{ reference: '$components.parameters.absent' }],
          onFailure: [{ reference: '$components.failureActions.absent' }],
        },
      ],
    },
  ],
};
export const absentBucket = {
  ...structuredClone(absentComponents),
  components: { inputs: { valid: { type: 'string' } } },
};
export const referenceShapedLiterals = {
  arazzo: '1.1.0',
  info: {
    title: 'Literal references',
    version: '1',
    description: '$components.parameters.description',
  },
  sourceDescriptions: [],
  'x-extension': { reference: '$components.failureActions.extension' },
  workflows: [
    {
      workflowId: 'literal',
      inputs: { type: 'object', examples: [{ reference: '$components.parameters.example' }] },
      steps: [
        {
          stepId: 'init',
          operationId: 'go',
          parameters: [
            { name: 'object', value: { reference: '$components.parameters.object' } },
            { name: 'string', value: '$components.parameters.string' },
          ],
          successCriteria: [{ condition: '$components.parameters.criterion == "literal"' }],
          onFailure: [
            {
              name: 'dotted',
              type: 'retry',
              parameters: [{ reference: '$components.parameters.dotted.key' }],
            },
          ],
        },
      ],
    },
  ],
  components: { parameters: { 'dotted.key': { name: 'dotted', value: 0 } } },
};
export const overrideValues = [
  0,
  false,
  '',
  null,
  [0, false],
  { nested: { enabled: false } },
  '$inputs.token',
  { selector: '$response.body#/id' },
];
export const parameterOverrides = {
  arazzo: '1.1.0',
  info: { title: 'Occurrence overrides', version: '1' },
  sourceDescriptions: [],
  components: { parameters: { shared: { name: 'shared', value: 'component-default' } } },
  workflows: [
    {
      workflowId: 'overrides',
      steps: [
        {
          stepId: 'init',
          operationId: 'go',
          onFailure: [
            ...overrideValues.map((value, index) => ({
              name: `override-${index}`,
              type: 'retry',
              parameters: [
                { reference: '$components.parameters.shared', value: structuredClone(value) },
              ],
            })),
            {
              name: 'omitted',
              type: 'retry',
              parameters: [{ reference: '$components.parameters.shared' }],
            },
          ],
        },
      ],
    },
  ],
};
