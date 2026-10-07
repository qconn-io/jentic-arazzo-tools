import { describe, it, expect } from 'vitest';
import { resolveOperationStatus } from '../../../src/utils/contract/OperationStatusResolver';
import { ContractDocumentFacts } from '../../../src/utils/contract/types';

describe('OperationStatusResolver', () => {
  it('returns not-loaded for idle state', () => {
    const result = resolveOperationStatus('op1', 'idle');
    expect(result.status).toBe('not-loaded');
  });

  it('returns loading for loading state', () => {
    const result = resolveOperationStatus('op1', 'loading');
    expect(result.status).toBe('loading');
  });

  it('returns failed with error diagnostics', () => {
    const result = resolveOperationStatus('op1', 'error', undefined, new Error('Network error'));
    expect(result.status).toBe('failed');
    expect(result.diagnostics).toContain('Network error');
  });

  it('returns unsupported for unsupported dialect', () => {
    const facts: ContractDocumentFacts = {
      version: '2.0',
      dialect: 'unsupported',
      uri: 'test',
      operations: new Map(),
      rawContent: '',
      unsupportedDiagnostics: ['Swagger not supported'],
    };
    const result = resolveOperationStatus('op1', 'success', facts);
    expect(result.status).toBe('unsupported');
    expect(result.diagnostics).toContain('Swagger not supported');
  });

  it('returns missing if operationId is not in facts', () => {
    const facts: ContractDocumentFacts = {
      version: '3.0.0',
      dialect: 'openapi',
      uri: 'test',
      operations: new Map([['op2', { operationId: 'op2', parameters: [] }]]),
      rawContent: '',
      unsupportedDiagnostics: [],
    };
    const result = resolveOperationStatus('op1', 'success', facts);
    expect(result.status).toBe('missing');
  });

  it('returns located when a unique operation is found', () => {
    const op = { operationId: 'op1', parameters: [] };
    const facts: ContractDocumentFacts = {
      version: '3.0.0',
      dialect: 'openapi',
      uri: 'test',
      operations: new Map([['op1', op]]),
      rawContent: '',
      unsupportedDiagnostics: [],
    };
    const result = resolveOperationStatus('op1', 'success', facts);
    expect(result.status).toBe('located');
    expect(result.operation).toBe(op);
  });

  it('returns ambiguous when multiple operations match the ID', () => {
    const facts: ContractDocumentFacts = {
      version: '3.0.0',
      dialect: 'openapi',
      uri: 'test',
      operations: new Map([
        ['op1-1', { operationId: 'op1', parameters: [] }],
        ['op1-2', { operationId: 'op1', parameters: [] }],
      ]),
      rawContent: '',
      unsupportedDiagnostics: [],
    };
    const result = resolveOperationStatus('op1', 'success', facts);
    expect(result.status).toBe('ambiguous');
    expect(result.diagnostics?.[0]).toMatch(/Found 2 operations/);
  });
});
