import { ContractDocumentFacts } from './types';

export type OperationLookupStatus =
  | 'not-loaded'
  | 'loading'
  | 'located'
  | 'missing'
  | 'ambiguous'
  | 'unsupported'
  | 'failed';

export interface OperationLookupResult {
  status: OperationLookupStatus;
  operation?: NonNullable<ContractDocumentFacts['operations']> extends Map<any, infer V> ? V : never;
  diagnostics?: string[];
}

export function resolveOperationStatus(
  operationId: string,
  sourceDocumentState: 'idle' | 'loading' | 'success' | 'error',
  documentFacts?: ContractDocumentFacts,
  error?: Error,
): OperationLookupResult {
  if (sourceDocumentState === 'idle') {
    return { status: 'not-loaded' };
  }

  if (sourceDocumentState === 'loading') {
    return { status: 'loading' };
  }

  if (sourceDocumentState === 'error') {
    return {
      status: 'failed',
      diagnostics: [error?.message ?? 'Unknown error'],
    };
  }

  if (!documentFacts) {
    return { status: 'not-loaded' };
  }

  if (documentFacts.dialect === 'unsupported') {
    return {
      status: 'unsupported',
      diagnostics: documentFacts.unsupportedDiagnostics,
    };
  }

  const matches = Array.from(documentFacts.operations.values()).filter(
    (op) => op.operationId === operationId,
  );

  if (matches.length === 0) {
    return { status: 'missing' };
  }

  if (matches.length > 1) {
    return {
      status: 'ambiguous',
      diagnostics: [`Found ${matches.length} operations matching operationId '${operationId}'`],
    };
  }

  return {
    status: 'located',
    operation: matches[0],
  };
}
