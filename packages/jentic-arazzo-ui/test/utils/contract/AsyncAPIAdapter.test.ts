import { describe, it, expect, beforeEach } from 'vitest';
import { projectAsyncAPI } from '../../../src/utils/contract/AsyncAPIAdapter';
import { SourceRegistry } from '../../../src/utils/source/SourceRegistry';

describe('AsyncAPIAdapter', () => {
  let registry: SourceRegistry;

  beforeEach(() => {
    registry = new SourceRegistry({
      maxConcurrent: 2,
      maxDocuments: 10,
      maxReferenceDepth: 2,
      maxSizeBytes: 1000,
    });
  });

  it('extracts operations from AsyncAPI 3 document', async () => {
    const content = `
asyncapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
channels:
  userSignup:
    address: 'users.signup'
    messages:
      userSignedUp:
        payload:
          type: object
operations:
  onUserSignup:
    action: receive
    channel:
      $ref: '#/channels/userSignup'
    `;

    const facts = await projectAsyncAPI(content, 'http://test/async.yaml', registry);

    expect(facts.dialect).toBe('asyncapi');
    expect(facts.version).toBe('3.0.0');
    expect(facts.operations.get('onUserSignup')).toBeDefined();

    const op = facts.operations.get('onUserSignup');
    expect(op?.action).toBe('receive');
    expect(op?.channel).toBe('userSignup');
  });

  it('rejects unsupported AsyncAPI versions', async () => {
    const content = `
asyncapi: 2.6.0
info:
  title: Test API
  version: 1.0.0
channels: {}
    `;

    const facts = await projectAsyncAPI(content, 'http://test/async.yaml', registry);

    expect(facts.dialect).toBe('unsupported');
    expect(facts.unsupportedDiagnostics).toContain('Unsupported AsyncAPI version: 2.6.0');
  });

  it('handles malformed documents gracefully', async () => {
    const content = `
asyncapi: 3.0.0
operations:
  badOp:
    channel:
      $ref: '#/channels/missing'
    `;

    const facts = await projectAsyncAPI(content, 'http://test/async.yaml', registry);
    expect(facts.dialect).toBe('asyncapi');
    const op = facts.operations.get('badOp');
    expect(op).toBeDefined();
    expect(op?.channel).toBe('missing');
  });
});
