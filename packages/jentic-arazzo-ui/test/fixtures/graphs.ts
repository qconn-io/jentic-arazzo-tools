export const relationshipGraph = {
  arazzo: '1.1.0',
  info: { title: 'Dense and disconnected graph', version: '1' },
  sourceDescriptions: [],
  workflows: [
    { workflowId: 'entry', steps: [{ stepId: 'init', operationId: 'go' }] },
    {
      workflowId: 'wfA',
      dependsOn: ['entry', 'wfB'],
      steps: [
        {
          stepId: 'init',
          workflowId: 'wfB',
          onSuccess: [{ name: 'same', type: 'goto', workflowId: 'wfB' }],
          onFailure: [
            { name: 'same', type: 'goto', workflowId: 'wfB' },
            { name: 'self', type: 'retry', workflowId: 'wfA' },
          ],
        },
        {
          stepId: 'another',
          operationId: 'go',
          onFailure: [{ name: 'same', type: 'goto', workflowId: 'wfB' }],
        },
      ],
    },
    { workflowId: 'wfB', dependsOn: ['wfA'], steps: [{ stepId: 'init', workflowId: 'wfA' }] },
    { workflowId: 'exit', dependsOn: ['wfB'], steps: [{ stepId: 'init', operationId: 'go' }] },
    {
      workflowId: 'selfPrerequisite',
      dependsOn: ['selfPrerequisite'],
      steps: [{ stepId: 'init', operationId: 'go' }],
    },
    { workflowId: 'disconnected', steps: [{ stepId: 'init', operationId: 'go' }] },
  ] satisfies [unknown, unknown, unknown, unknown, unknown, unknown],
};
export const callRecoveryCycle = {
  ...structuredClone(relationshipGraph),
  workflows: [
    { workflowId: 'callA', steps: [{ stepId: 'init', workflowId: 'callB' }] },
    {
      workflowId: 'callB',
      steps: [
        {
          stepId: 'init',
          operationId: 'go',
          onFailure: [{ name: 'recover', type: 'retry', workflowId: 'callA' }],
        },
      ],
    },
  ] satisfies [unknown, unknown],
};
export const mixedCycle = {
  ...structuredClone(relationshipGraph),
  workflows: [
    {
      workflowId: 'mixedA',
      dependsOn: ['mixedB'],
      steps: [{ stepId: 'init', workflowId: 'mixedB' }],
    },
    { workflowId: 'mixedB', steps: [{ stepId: 'init', operationId: 'go' }] },
  ],
};
export const unlinkedGraph = {
  ...structuredClone(relationshipGraph),
  workflows: Array.from({ length: 7 }, (_, index) => ({
    workflowId: `unlinked-${index}`,
    steps: [{ stepId: 'init', operationId: 'go' }],
  })),
};
export const localPrerequisites = {
  ...structuredClone(relationshipGraph),
  workflows: [
    {
      workflowId: 'payment',
      steps: [
        {
          stepId: 'processPayment',
          operationId: 'process',
          dependsOn: ['validateCard', 'checkInventory'],
        },
        { stepId: 'validateCard', operationId: 'validate' },
        { stepId: 'checkInventory', operationId: 'check' },
      ],
    },
  ],
};
