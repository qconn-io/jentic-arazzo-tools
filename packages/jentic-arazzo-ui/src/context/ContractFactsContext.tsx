import { SourceRevisionContext } from './SourceRevisionContext';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

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
const ContractFactsContext = createContext<{
  loaded: Record<string, LoadedSource>;
  load: (source: { name: string; type?: string; url: string }, reload: boolean) => Promise<void>;
} | null>(null);
export function useContractFacts() {
  const value = useContext(ContractFactsContext);
  if (!value) throw new Error('Contract facts unavailable');
  return value;
}
export function ContractFactsProvider({ children }: { children: React.ReactNode }) {
  const { model, sourceRegistry, sourceProvider } = useArazzoViewer();
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
  const requests = useRef(new Map<string, object>());
  useEffect(() => {
    setLoaded({});
    requests.current.clear();
    return () => {
      requests.current.clear();
    };
  }, [scope, sourceProvider]);
  const currentLoaded = Object.fromEntries(
    Object.entries(loaded).filter(
      ([name, value]) =>
        value.scope === scope &&
        value.provider === sourceProvider &&
        value.requestedRevision === revisions[name] &&
        (!value.validity || sourceRegistry.isCurrent(value.validity)),
    ),
  );
  const load = async (source: { name: string; type?: string; url: string }, reload: boolean) => {
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
      // Reserve the requested pin before capture; returned-provenance fallback
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
  };
  return (
    <ContractFactsContext.Provider value={{ loaded: currentLoaded, load }}>
      {children}
    </ContractFactsContext.Provider>
  );
}
