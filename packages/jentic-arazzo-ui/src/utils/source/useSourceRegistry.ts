import { useRef, useEffect } from 'react';

import {
  SourceRegistry,
  SourceRegistryScopeBudget,
  DEFAULT_REGISTRY_BUDGET,
} from './SourceRegistry';
import { SourceDocumentProvider } from '../../types/source';

export function useSourceRegistry(
  provider?: SourceDocumentProvider,
  budget: SourceRegistryScopeBudget = DEFAULT_REGISTRY_BUDGET,
) {
  const registryRef = useRef<SourceRegistry | null>(null);

  if (!registryRef.current) {
    registryRef.current = new SourceRegistry(budget);
  }

  const registry = registryRef.current;

  useEffect(() => {
    registry.setProvider(provider ?? null);
  }, [registry, provider]);

  useEffect(() => {
    registry.budget = budget;
  }, [registry, budget]);

  useEffect(() => {
    return () => {
      registry.cancelAll();
    };
  }, [registry]);

  return registry;
}
