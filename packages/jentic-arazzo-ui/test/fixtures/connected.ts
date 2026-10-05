import type { ArazzoDocument } from '../../src/types/arazzo';

export const nestedCalls: ArazzoDocument = {
  arazzo: '1.1.0',
  info: { title: 'Connected checkout', version: '1' },
  sourceDescriptions: [
    { name: 'store.api', type: 'openapi', url: 'https://example.test/store.yaml' },
    { name: 'store-api', type: 'openapi', url: 'https://example.test/payment.yaml' },
    { name: 'unused', type: 'openapi', url: 'https://example.test/unused.yaml' },
    { name: 'remote', type: 'arazzo', url: 'https://example.test/remote.yaml' },
  ],
  workflows: [
    {
      workflowId: 'checkout',
      steps: [
        { stepId: 'prepare', operationId: '$sourceDescriptions.store.api.prepare' },
        {
          stepId: 'firstPayment',
          workflowId: 'payment',
          dependsOn: ['prepare'],
          parameters: [
            { name: 'amount', value: 0 },
            { name: 'context', value: { enabled: false, tags: [] } },
          ],
          outputs: { receipt: '$workflows.payment.outputs.receipt' },
        },
        {
          stepId: 'secondPayment',
          workflowId: 'payment',
          parameters: [
            { name: 'amount', value: '$inputs.amount' },
            { name: 'context', value: null },
          ],
          outputs: { otherReceipt: '$workflows.payment.outputs.receipt' },
        },
      ],
    },
    {
      workflowId: 'payment',
      inputs: { type: 'object', properties: { amount: { type: 'number' }, context: {} } },
      outputs: { receipt: '$steps.charge.outputs.receipt' },
      steps: [
        {
          stepId: 'charge',
          operationId: '$sourceDescriptions.store-api.charge',
          outputs: { receipt: '$response.body#/id' },
        },
        {
          stepId: 'audit',
          workflowId: 'audit',
          parameters: [{ name: 'receipt', value: '$steps.charge.outputs.receipt' }],
        },
      ],
    },
    {
      workflowId: 'audit',
      steps: [{ stepId: 'record', operationId: '$sourceDescriptions.store.api.record' }],
    },
    {
      workflowId: 'client',
      description: 'Implemented by checkout; this prose declares no workflow call.',
      steps: [
        {
          stepId: 'submit',
          operationId: '$sourceDescriptions.store.api.submit',
          ...{ 'x-internal-processing': { workflowId: 'checkout' } },
        },
      ],
    },
  ],
};

export const recursiveCalls: ArazzoDocument = {
  ...structuredClone(nestedCalls),
  workflows: [
    { workflowId: 'checkout', steps: [{ stepId: 'payment', workflowId: 'payment' }] },
    { workflowId: 'payment', steps: [{ stepId: 'again', workflowId: 'checkout' }] },
  ],
};

export const difficultCalls: ArazzoDocument = {
  ...structuredClone(nestedCalls),
  workflows: [
    {
      workflowId: 'entry with a very long authored name that must remain available to readers',
      dependsOn: ['audit'],
      steps: [
        {
          stepId: 'operation with quotes " brackets [] and a long readable identity',
          operationId: '$sourceDescriptions.store.api.prepare',
          parameters: [
            { name: 'payload', value: { enabled: false, nested: { values: [0, '', null] } } },
          ],
          onSuccess: [
            {
              name: 'optional transfer',
              type: 'goto',
              workflowId: 'audit',
              criteria: [{ condition: '$statusCode == 202' }],
            },
          ],
          onFailure: [
            {
              name: 'recover',
              type: 'retry',
              workflowId: 'audit',
              criteria: [{ condition: '$statusCode >= 400' }],
            },
          ],
        },
        { stepId: 'external', workflowId: '$sourceDescriptions.remote.payment' },
        { stepId: 'missing', workflowId: 'absent' },
        { stepId: 'ambiguous', operationId: 'unspecified' },
      ],
    },
    structuredClone(nestedCalls.workflows[2]),
    structuredClone(nestedCalls.workflows[3]),
  ],
};
