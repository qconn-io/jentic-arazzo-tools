import { describe, expect, it } from 'vitest';
import { projectAsyncAPI } from '../../../packages/jentic-arazzo-ui/src/utils/contract/AsyncAPIAdapter';
import { SourceRegistry } from '../../../packages/jentic-arazzo-ui/src/utils/source/SourceRegistry';

describe('Systems contract identity prerequisite probe', () => {
  it('distinguishes a changed message reference despite identical declarations', async () => {
    const message = { name: 'Ready', payload: { type: 'object' } };
    const contract = (key: string) => ({
      asyncapi: '3.0.0',
      channels: {
        ready: {
          address: 'ready',
          messages: {
            original: message,
            replacement: message,
          },
        },
      },
      operations: {
        publish: {
          action: 'send',
          channel: { $ref: '#/channels/ready' },
          messages: [{ $ref: `#/channels/ready/messages/${key}` }],
        },
      },
    });
    const before = await projectAsyncAPI(
      contract('original'),
      'https://test/events.yaml',
      new SourceRegistry(),
    );
    const after = await projectAsyncAPI(
      contract('replacement'),
      'https://test/events.yaml',
      new SourceRegistry(),
    );
    expect(before.rawContent).not.toEqual(after.rawContent);
    expect(before.operations.get('publish')).not.toEqual(after.operations.get('publish'));
  });
});
