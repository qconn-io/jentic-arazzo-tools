import { pointerMatches, resolvePointer } from './pointer';
import type { ContractDocumentFacts, ContractOperation } from './types';

export type OperationLookupStatus =
  'not-loaded' | 'loading' | 'located' | 'missing' | 'ambiguous' | 'unsupported' | 'failed';
export interface OperationLookupResult {
  status: OperationLookupStatus;
  operation?: ContractOperation;
  diagnostics?: string[];
  candidates?: Array<{ uri: string; revision?: string; operation: ContractOperation }>;
}
export interface OperationSourceCandidate {
  state: 'idle' | 'loading' | 'success' | 'error';
  facts?: ContractDocumentFacts;
  error?: Error;
}
export interface OperationLocators {
  operationId?: unknown;
  operationPath?: unknown;
  channelPath?: unknown;
}

function matchesPointer(locator: string, pointer: string | undefined, uri: string): boolean {
  if (!pointer) return false;
  try {
    return pointerMatches(locator, pointer, uri);
  } catch {
    return false;
  }
}

export function resolveScopedOperation(
  locators: OperationLocators,
  sources: OperationSourceCandidate[],
): OperationLookupResult {
  const authored = Object.entries(locators).filter(([, value]) => value !== undefined);
  if (authored.length !== 1 || typeof authored[0][1] !== 'string')
    return {
      status: 'unsupported',
      diagnostics: [
        'One supported operation locator is required; authored values remain available',
      ],
    };
  const [kind, locator] = authored[0] as [string, string];
  if (kind !== 'operationId') {
    try {
      resolvePointer(
        locator,
        sources.find((source) => source.facts)?.facts?.uri ?? 'https://pointer.invalid/',
      );
    } catch (error) {
      return {
        status: 'unsupported',
        diagnostics: [error instanceof Error ? error.message : 'Invalid operation pointer'],
      };
    }
  }
  const candidates: NonNullable<OperationLookupResult['candidates']> = [];
  for (const source of sources) {
    if (source.state !== 'success' || !source.facts || source.facts.dialect === 'unsupported')
      continue;
    for (const operation of source.facts.operations.values()) {
      const matched =
        kind === 'operationId'
          ? operation.operationId === locator
          : kind === 'operationPath'
            ? matchesPointer(locator, operation.pointer, source.facts.uri)
            : matchesPointer(locator, operation.channelPointer, source.facts.uri);
      if (matched)
        candidates.push({ uri: source.facts.uri, revision: source.facts.revision, operation });
    }
  }
  if (candidates.length > 1)
    return {
      status: 'ambiguous',
      candidates,
      diagnostics: [
        `Found ${candidates.length} operations matching operationId or operation reference; no unique operation is established`,
      ],
    };
  const incomplete =
    sources.length === 0 ||
    sources.some(
      (source) =>
        source.state === 'idle' ||
        source.state === 'loading' ||
        (source.state === 'success' && !source.facts),
    );
  if (incomplete)
    return {
      status: sources.some((source) => source.state === 'loading') ? 'loading' : 'not-loaded',
      candidates,
      diagnostics: [
        'Incomplete candidate coverage; all relevant declared sources must be checked before uniqueness is established',
      ],
    };
  const errors = sources.filter((source) => source.state === 'error');
  if (errors.length)
    return {
      status: 'failed',
      candidates,
      diagnostics: errors.map(
        (source) =>
          source.error?.message ?? 'Source acquisition failed; candidate coverage is incomplete',
      ),
    };
  const unsupported = sources.filter((source) => source.facts?.dialect === 'unsupported');
  if (unsupported.length)
    return {
      status: 'unsupported',
      candidates,
      diagnostics: unsupported.flatMap((source) => source.facts?.unsupportedDiagnostics ?? []),
    };
  return candidates.length === 1
    ? { status: 'located', operation: candidates[0].operation, candidates }
    : { status: 'missing', candidates };
}

export function resolveOperationStatus(
  operationId: string,
  sourceDocumentState: OperationSourceCandidate['state'],
  documentFacts?: ContractDocumentFacts,
  error?: Error,
): OperationLookupResult {
  return resolveScopedOperation({ operationId }, [
    { state: sourceDocumentState, facts: documentFacts, error },
  ]);
}
