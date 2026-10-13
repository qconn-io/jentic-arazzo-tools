import type { ArazzoViewerModel, ViewerStep } from '../model/viewerModel';
import {
  resolveScopedOperation,
  type OperationLookupResult,
  type OperationSourceCandidate,
} from './OperationStatusResolver';

export interface StepOperationResult extends OperationLookupResult {
  normalizedLocators?: Readonly<Record<string, unknown>>;
  sourceName?: string;
  basis?: 'explicit-locator' | 'single-source' | 'contract-lookup';
}

// pure projection over current, source-name-keyed facts. Retrieval URI aliases
// never select a declaration; coverage counts each relevant authored source.
export function resolveStepOperation(
  model: ArazzoViewerModel,
  step: ViewerStep,
  loaded: Readonly<Record<string, OperationSourceCandidate>>,
): StepOperationResult {
  const binding = step.sourceBinding;
  const locators = { ...binding.locators };
  if (binding.sourceName)
    for (const [key, value] of Object.entries(locators)) {
      if (typeof value !== 'string') continue;
      const prefix = `$sourceDescriptions.${binding.sourceName}.`;
      const url = `{$sourceDescriptions.${binding.sourceName}.url}`;
      locators[key] = value.startsWith(prefix)
        ? value.slice(prefix.length)
        : value.startsWith(url)
          ? value.slice(url.length)
          : value;
    }
  if (
    binding.status === 'unsupported' ||
    step.diagnostics.some(
      (diagnostic) =>
        diagnostic.category === 'unsupported-feature' &&
        [
          'unsupported-action',
          'unsupported-async-intent',
          'unsupported-channelPath',
          'unsupported-timeout',
          'unsupported-correlationId',
        ].includes(diagnostic.code),
    )
  )
    return {
      normalizedLocators: locators,
      status: 'unsupported',
      diagnostics: ['Operation semantics are unsupported by this inspection profile'],
    };
  const sources = model.document.sourceDescriptions.filter((source) =>
    binding.sourceName
      ? source.name === binding.sourceName
      : binding.candidates.includes(source.name),
  );
  const candidates: OperationSourceCandidate[] = sources.map((source) => {
    const candidate = loaded[source.name] ?? { state: 'idle' };
    const supported =
      source.type === 'openapi' ||
      (source.type === 'asyncapi' && model.inspection.profileId === '1.1');
    if (!supported && candidate.facts)
      return {
        ...candidate,
        facts: {
          ...candidate.facts,
          dialect: 'unsupported',
          unsupportedDiagnostics: [
            `Source kind ${source.type} is unsupported by this inspection profile`,
          ],
        },
      };
    return candidate;
  });
  const result = { ...resolveScopedOperation(locators, candidates), normalizedLocators: locators };
  if (binding.sourceName && binding.status === 'declared')
    return { ...result, sourceName: binding.sourceName, basis: binding.basis };
  if (result.status === 'located') {
    const matches = sources.filter((source) =>
      [...(loaded[source.name]?.facts?.operations.values() ?? [])].includes(result.operation!),
    );
    if (matches.length === 1 && typeof matches[0].name === 'string' && matches[0].name.length > 0)
      return { ...result, sourceName: matches[0].name, basis: 'contract-lookup' };
  }
  return result;
}
