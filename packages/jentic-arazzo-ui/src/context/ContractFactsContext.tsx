import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { SourceRevisionContext } from './SourceRevisionContext';
import { useArazzoViewer } from './ArazzoViewerContext';
import type { ContractDocumentFacts } from '../utils/contract/types';
import type { SourceDocumentContent } from '../types/source';
import type { SourceValidityToken } from '../utils/source/SourceRegistry';
import type { ArazzoViewerModel } from '../utils/model/viewerModel';

export interface LoadedSource {
  scope?: ArazzoViewerModel['inspection']['snapshot'];
  provider?: import('../types/source').SourceDocumentProvider;
  validity?: SourceValidityToken;
  requestedRevision?: string;
  state: 'idle' | 'loading' | 'success' | 'error';
  facts?: ContractDocumentFacts;
  workflowModel?: ArazzoViewerModel;
  content?: SourceDocumentContent;
  error?: Error;
}
export type DeclaredSource = { name: string; type?: string; url: string };
const ContractFactsContext = createContext<{
  loaded: Record<string, LoadedSource>;
  load: (source: DeclaredSource, reload: boolean) => Promise<void>;
  eligibility: (source: DeclaredSource) => string | undefined;
  unattempted: (source: DeclaredSource) => boolean;
} | null>(null);
export function useContractFacts() {
  const value = useContext(ContractFactsContext);
  if (!value) throw new Error('Contract facts unavailable');
  return value;
}
export function ContractFactsProvider({ children }: { children: React.ReactNode }) {
  const { model, sourceRegistry, sourceProvider, apiDescriptionLoading } = useArazzoViewer();
  const revisions = useContext(SourceRevisionContext);
  useSyncExternalStore(
    sourceRegistry.subscribe,
    sourceRegistry.getSnapshot,
    sourceRegistry.getSnapshot,
  );
  const [loaded, setLoaded] = useState<Record<string, LoadedSource>>({});
  const scope = model.inspection.snapshot;
  const current = useRef({ scope, sourceProvider, revisions });
  current.current = { scope, sourceProvider, revisions };
  const attempts = useRef(new Map<string, { revision?: string; promise: Promise<void> }>());
  const requests = useRef(new Map<string, object>());
  useEffect(() => {
    setLoaded({});
    requests.current.clear();
    attempts.current.clear();
    return () => {
      requests.current.clear();
    };
  }, [scope, sourceProvider]);
  const previousPins = useRef({ scope, sourceProvider, revisions });
  useEffect(() => {
    const previous = previousPins.current;
    previousPins.current = { scope, sourceProvider, revisions };
    if (previous.scope !== scope || previous.sourceProvider !== sourceProvider) return;
    for (const source of model.document.sourceDescriptions ?? [])
      if (previous.revisions[source.name] !== revisions[source.name])
        sourceRegistry.reload(source.url, previous.revisions[source.name], scope.baseURI);
  }, [scope, sourceProvider, revisions, model, sourceRegistry]);
  const currentLoaded = Object.fromEntries(
    Object.entries(loaded).filter(
      ([name, value]) =>
        value.scope === scope &&
        value.provider === sourceProvider &&
        value.requestedRevision === revisions[name] &&
        (!value.validity || sourceRegistry.isCurrent(value.validity)),
    ),
  );
  const eligibility = useCallback(
    (source: DeclaredSource) => {
      if (model.document.sourceDescriptions?.filter((s) => s.name === source.name).length !== 1)
        return 'Duplicate source name; loading cannot select a declaration unambiguously.';
      if (model.support.semanticInspection === 'unsupported')
        return 'Unsupported Arazzo inspection profile.';
      if (source.type === 'asyncapi' && model.support.profile !== '1.1')
        return 'AsyncAPI requires the Arazzo 1.1 inspection profile.';
      if (!['openapi', 'asyncapi', 'arazzo'].includes(source.type ?? ''))
        return 'Unsupported source kind.';
      if (scope.self) return 'Unsupported $self identity semantics; source loading is unavailable.';
      return undefined;
    },
    [model, scope],
  );
  const unattempted = (source: DeclaredSource) =>
    !attempts.current.has(source.name) ||
    attempts.current.get(source.name)?.revision !== revisions[source.name];
  const performLoad = useCallback(
    async (source: DeclaredSource, reload: boolean) => {
      const token = {};
      const revision = revisions[source.name];
      requests.current.set(source.name, token);
      if (reload) sourceRegistry.reload(source.url, revision, scope.baseURI);
      const resolvedURI = sourceRegistry.resolveUri(source.url, scope.baseURI).resolvedUri;
      let validity: SourceValidityToken | undefined;
      const isCurrent = () =>
        current.current.scope === scope &&
        current.current.sourceProvider === sourceProvider &&
        current.current.revisions[source.name] === revision &&
        requests.current.get(source.name) === token &&
        (!validity || sourceRegistry.isCurrent(validity));
      let acquired: SourceDocumentContent | undefined;
      try {
        const acquisition = sourceRegistry.acquire(source.url, revision, scope.baseURI);
        // reserve the requested pin before capture; returned-provenance fallback
        // must not attach a new pinned projection to an older unpinned entry.
        validity = sourceRegistry.captureValidity(resolvedURI, revision);
        setLoaded((old) => ({
          ...old,
          [source.name]: {
            state: 'loading',
            validity,
            requestedRevision: revision,
            scope,
            provider: sourceProvider,
          },
        }));
        acquired = await acquisition;
        if (!isCurrent()) return;
        let value: LoadedSource;
        if (source.type === 'arazzo') {
          const { projectArazzo } = await import('../utils/contract/ArazzoAdapter');
          if (!isCurrent()) return;
          value = {
            state: 'success',
            content: acquired,
            workflowModel: await projectArazzo(
              acquired.content,
              acquired.retrievalURI,
              sourceRegistry,
              acquired.revision,
              validity,
            ),
          };
        } else {
          const project =
            source.type === 'asyncapi'
              ? (await import('../utils/contract/AsyncAPIAdapter')).projectAsyncAPI
              : (await import('../utils/contract/OpenAPIAdapter')).projectOpenAPI;
          if (!isCurrent()) return;
          value = {
            state: 'success',
            content: acquired,
            facts: await project(
              acquired.content,
              acquired.retrievalURI,
              sourceRegistry,
              acquired.revision,
              validity,
            ),
          };
        }
        if (isCurrent())
          setLoaded((old) => ({
            ...old,
            [source.name]: {
              ...value,
              validity,
              requestedRevision: revision,
              scope,
              provider: sourceProvider,
            },
          }));
      } catch (error) {
        if (isCurrent())
          setLoaded((old) => ({
            ...old,
            [source.name]: {
              state: 'error',
              requestedRevision: revision,
              scope,
              provider: sourceProvider,
              validity,
              content: acquired,
              error: error instanceof Error ? error : new Error(String(error)),
            },
          }));
      }
    },
    [scope, sourceProvider, sourceRegistry, revisions],
  );
  const latestLoaded = useRef(currentLoaded);
  latestLoaded.current = currentLoaded;
  const load = useCallback(
    (source: DeclaredSource, reload: boolean) => {
      if (!sourceProvider || eligibility(source)) return Promise.resolve();
      const attempt = attempts.current.get(source.name);
      if (
        attempt &&
        attempt.revision === revisions[source.name] &&
        (requests.current.has(source.name) || (!reload && latestLoaded.current[source.name]))
      )
        return attempt.promise;
      const promise = performLoad(source, reload);
      attempts.current.set(source.name, { revision: revisions[source.name], promise });
      void promise.finally(() => {
        if (attempts.current.get(source.name)?.promise === promise)
          requests.current.delete(source.name);
      });
      return promise;
    },
    [sourceProvider, eligibility, revisions, performLoad],
  );
  useEffect(() => {
    let active = true;
    // Let provider setup and StrictMode replay finish before authorizing the batch.
    queueMicrotask(() => {
      if (!active || apiDescriptionLoading !== 'automatic' || !sourceProvider) return;
      for (const source of model.document.sourceDescriptions ?? [])
        if (
          source.type !== 'arazzo' &&
          !eligibility(source) &&
          (!attempts.current.has(source.name) ||
            attempts.current.get(source.name)?.revision !== revisions[source.name])
        )
          void load(source, false);
    });
    return () => {
      active = false;
    };
  }, [apiDescriptionLoading, sourceProvider, model, eligibility, load, revisions]);
  return (
    <ContractFactsContext.Provider
      value={{ loaded: currentLoaded, load, eligibility, unattempted }}
    >
      {children}
    </ContractFactsContext.Provider>
  );
}
