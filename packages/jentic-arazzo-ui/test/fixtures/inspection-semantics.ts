import type { ArazzoDocument } from '../../src/types/arazzo';

export const parameterSemantics: ArazzoDocument = {
  arazzo: '1.1.0',
  info: { title: 'Parameter semantics', version: '1' },
  sourceDescriptions: [{ name: 'api', type: 'openapi', url: './api.yaml' }],
  components: { parameters: { token: { name: 'token', in: 'header', value: 'shared-token' } } },
  workflows: [
    {
      workflowId: 'caller',
      parameters: [
        { name: 'token', in: 'header', value: 'workflow-token' },
        { name: 'query', in: 'querystring', value: 'a=1&b={$inputs.b}' },
        { name: 'amount', value: '$inputs.amount' },
        { reference: '$components.parameters.missing' },
      ],
      steps: [
        { stepId: 'inherited', operationId: '$sourceDescriptions.api.read' },
        {
          stepId: 'overridden',
          operationId: '$sourceDescriptions.api.write',
          parameters: [
            { reference: '$components.parameters.token' },
            { name: 'token', in: 'query', value: 'different-location' },
          ],
        },
        { stepId: 'call', workflowId: 'callee' },
      ],
    },
    { workflowId: 'callee', steps: [{ stepId: 'done' }] },
  ],
};
