export const asynchronous = {
  arazzo: '1.1.0',
  info: { title: 'Authored async intent', version: '1' },
  sourceDescriptions: [
    { name: 'events-a', type: 'asyncapi', url: 'https://example.test/events.yaml' },
    { name: 'events.a', type: 'asyncapi', url: 'https://example.test/other-events.yaml' },
    { name: 'http', type: 'openapi', url: 'https://example.test/openapi-3.2.yaml' },
    { name: 'unknown', type: 'future-source', url: 'https://example.test/future.yaml' },
    { name: 'odd "name|[]\n', type: 'asyncapi', url: 'https://example.test/odd.yaml' },
  ],
  workflows: [
    {
      workflowId: 'messages',
      steps: [
        {
          stepId: 'send',
          operationId: '$sourceDescriptions.events-a.publishOrder',
          action: 'send',
          correlationId: '$inputs.requestId',
          timeout: 5000,
          parameters: [
            { name: 'query', in: 'querystring', value: 'q={$inputs.q}&literal=a%26b&empty=' },
          ],
        },
        {
          stepId: 'receive',
          channelPath: '$sourceDescriptions.events.a.channels.orders',
          action: 'receive',
          dependsOn: ['send'],
          correlationId: '$message.header#/requestId',
          timeout: 0,
        },
        {
          stepId: 'webhook',
          operationPath: '$sourceDescriptions.http.webhooks.orderReceived.post',
          parameters: [{ name: 'query', in: 'querystring', value: 'fixed=true&n=0' }],
        },
        { stepId: 'opaque', operationPath: 'urn:vendor:operation:emit' },
        { stepId: 'ambiguous', operationId: 'sharedOperation' },
        { stepId: 'unknown', operationId: '$sourceDescriptions.unknown.futureOperation' },
        {
          stepId: 'conflicting',
          operationId: 'send',
          channelPath: 'channels/orders',
          workflowId: 'messages',
        },
        {
          stepId: 'quoted "[]|\n',
          operationId: '$sourceDescriptions.events-a.publishOrder',
          onFailure: [
            {
              name: 'recover "[]|\n',
              type: 'retry',
              workflowId: 'messages',
              criteria: [{ condition: '$response.body#/text == "a|[b]"\n' }],
              parameters: [{ name: 'payload', value: 'quotes " and [brackets]|\n' }],
            },
          ],
        },
      ],
    },
  ],
};
