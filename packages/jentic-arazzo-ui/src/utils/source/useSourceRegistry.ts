import { useRef, useEffect, useSyncExternalStore } from 'react';

import {
  SourceRegistry,
  SourceRegistryScopeBudget,
  DEFAULT_REGISTRY_BUDGET,
} from './SourceRegistry';
import { SourceDocumentProvider } from '../../types/source';

export function useSourceRegistry(
  provider?: SourceDocumentProvider,
  budget: SourceRegistryScopeBudget = DEFAULT_REGISTRY_BUDGET,
  scope?: unknown,
) {
  const registryRef = useRef<SourceRegistry | null>(null);

  if (!registryRef.current) {
    registryRef.current = new SourceRegistry(budget);
  }

  const registry = registryRef.current;
  useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot);

  useEffect(() => {
    registry.setProvider(provider ?? null);
    return () => registry.cancelAll();
  }, [registry, provider, scope]);

  useEffect(() => {
    registry.budget = budget;
  }, [registry, budget]);

  return registry;
}
