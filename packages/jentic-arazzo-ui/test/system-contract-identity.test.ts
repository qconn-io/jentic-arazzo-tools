import { describe, expect, it } from 'vitest';
import { projectAsyncAPI } from '../src/utils/contract/AsyncAPIAdapter';
import { SourceRegistry } from '../src/utils/source/SourceRegistry';

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

it('retains final external alias identity and unresolved status', async () => {
  const registry = new SourceRegistry();
  registry.setProvider({
    load: async ({ uri }) => ({
      retrievalURI: uri,
      revision: 'r2',
      content: {
        channels: { c: { messages: { alias: { $ref: '#/messages/m' } } } },
        messages: { m: { name: 'Ready' } },
      },
    }),
  });
  const facts = await projectAsyncAPI(
    {
      asyncapi: '3.0.0',
      operations: {
        send: {
          action: 'send',
          channel: { $ref: './other#/channels/c' },
          messages: [{ $ref: './other#/channels/c/messages/alias' }],
        },
        missing: { action: 'receive', channel: { $ref: '#/channels/missing' } },
      },
    },
    'https://test/events',
    registry,
    'r1',
  );
  expect(facts.operations.get('send')?.channelIdentity).toMatchObject({
    uri: 'https://test/other',
    pointer: '#/channels/c',
    revision: 'r2',
    status: 'located',
  });
  expect(facts.operations.get('send')?.messageIdentities?.[0]).toMatchObject({
    uri: 'https://test/other',
    pointer: '#/messages/m',
    revision: 'r2',
    status: 'located',
    authoredReference: './other#/channels/c/messages/alias',
  });
  expect(facts.operations.get('missing')?.channelIdentity?.status).toBe('unresolved');
});
