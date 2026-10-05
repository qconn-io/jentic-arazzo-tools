export const scopedActions = {
  arazzo: '1.1.0',
  info: { title: 'Scoped identity and action policy', version: '1' },
  sourceDescriptions: [
    { name: 'remote', type: 'arazzo', url: 'https://example.test/remote.yaml' },
    { name: 'http', type: 'openapi', url: 'https://example.test/openapi.yaml' },
    { name: 'dotted.source', type: 'arazzo', url: 'https://example.test/dotted.yaml' },
  ],
  workflows: [
    {
      workflowId: 'flowA',
      successActions: [
        { name: 'same', type: 'goto', workflowId: 'flowB' },
        { name: 'default-end', type: 'end' },
      ],
      failureActions: [
        {
          name: 'same',
          type: 'retry',
          workflowId: 'flowB',
          criteria: [{ condition: '$statusCode == 401' }],
        },
        { name: 'same', type: 'goto', workflowId: 'flowC' },
        { name: 'default-end', type: 'end' },
      ],
      steps: [
        {
          stepId: 'init',
          _internalId: 'collision',
          operationId: 'login',
          parameters: [{ name: 'owner', value: 'A' }],
          onSuccess: [{ name: 'same', type: 'goto', workflowId: 'flowC' }],
          onFailure: [
            {
              name: 'same',
              type: 'retry',
              workflowId: 'flowC',
              criteria: [{ condition: '$statusCode >= 400' }],
            },
            { name: 'extra', type: 'goto', workflowId: 'flowB' },
          ],
        },
        { stepId: 'prepare', operationId: 'prepare' },
        {
          stepId: 'call',
          workflowId: 'flowB',
          dependsOn: ['prepare', '$workflows.flowB.steps.init'],
          parameters: [{ name: 'mapping', value: '$steps.init.outputs.token' }],
        },
        { stepId: 'empty', operationId: 'empty', onSuccess: [], onFailure: [] },
        {
          stepId: 'unresolved',
          operationId: 'go',
          onFailure: [{ reference: '$components.failureActions.absent' }],
        },
      ],
    },
    {
      workflowId: 'flowB',
      steps: [
        {
          stepId: 'init',
          _internalId: 'collision',
          operationId: 'other',
          parameters: [{ name: 'owner', value: 'B' }],
          onFailure: [{ name: 'B-only', type: 'end' }],
        },
        { stepId: 'needsPrepare', operationId: 'go', dependsOn: ['prepare'] },
      ],
    },
    { workflowId: 'flowC', steps: [{ stepId: 'init', operationId: 'third' }] },
    {
      workflowId: 'dotted.workflow',
      steps: [{ stepId: 'dotted.step', operationId: 'dot' }],
    },
  ] satisfies [unknown, unknown, unknown, unknown],
};
export const classifiedTargets = {
  ...structuredClone(scopedActions),
  workflows: [
    {
      workflowId: 'flowA',
      steps: [
        {
          stepId: 'init',
          operationId: 'go',
          dependsOn: [
            'missing',
            '$workflows.flowB.steps.init',
            '$sourceDescriptions.remote.flowB.steps.init',
            '$sourceDescriptions.absent.flowB.steps.init',
            '$sourceDescriptions.http.flowB.steps.init',
            '$workflows.flowB.steps.absent',
            '$workflows.absent.steps.init',
            '$workflows.',
            '$workflows.dotted.workflow.steps.dotted.step',
          ],
        },
        { stepId: 'external', workflowId: '$sourceDescriptions.remote.flowB' },
        { stepId: 'missingWorkflow', workflowId: 'absent' },
        {
          stepId: 'conflict',
          workflowId: 'flowB',
          operationId: 'alsoAnOperation',
          channelPath: '$sourceDescriptions.remote.channels.events',
        },
      ],
    },
    structuredClone(scopedActions.workflows[1]),
    structuredClone(scopedActions.workflows[2]),
    structuredClone(scopedActions.workflows[3]),
  ] satisfies [unknown, unknown, unknown, unknown],
};
export const replacementBefore = {
  arazzo: '1.1.0',
  info: { title: 'Replacement', version: '1' },
  sourceDescriptions: [],
  workflows: [
    {
      workflowId: 'flowA',
      steps: [
        {
          stepId: 'init',
          operationId: 'go',
          onFailure: [{ reference: '$components.failureActions.recovery' }],
        },
      ],
    },
  ],
  components: {
    parameters: { token: { name: 'token', value: 'old' } },
    failureActions: {
      recovery: {
        name: 'recover',
        type: 'retry',
        parameters: [{ reference: '$components.parameters.token' }],
      },
    },
  },
};
export const replacementAfter = structuredClone(replacementBefore);
replacementAfter.components.parameters.token.value = 'new';
replacementAfter.components.failureActions.recovery.type = 'end';
