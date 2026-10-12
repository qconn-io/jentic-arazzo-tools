import React from 'react';

import { useArazzoViewer } from '../context/ArazzoViewerContext';
import {
  useContractFacts,
  type DeclaredSource,
  type LoadedSource,
} from '../context/ContractFactsContext';

export function sourceAvailability(
  value: LoadedSource | undefined,
  reason?: string,
  provider = true,
) {
  if (reason) return 'Unsupported';
  if (!provider) return 'Loading unavailable';
  if (value?.state === 'loading') return 'Loading';
  if (value?.state === 'error') return 'Failed';
  if (value?.facts?.dialect === 'unsupported') return 'Unsupported';
  if (value?.facts || value?.workflowModel) return 'Loaded';
  return 'Not loaded';
}

export function SourceDescription({
  source,
  children,
}: {
  source: DeclaredSource;
  children?: React.ReactNode;
}) {
  const { model, sourceRegistry, sourceProvider } = useArazzoViewer();
  const { loaded, load, eligibility } = useContractFacts();
  const reason = eligibility(source);
  const value = reason ? undefined : loaded[source.name];
  const status = sourceAvailability(value, reason, !!sourceProvider);
  const { resolvedUri, error } = sourceRegistry.resolveUri(
    source.url,
    model.inspection.snapshot.baseURI,
  );
  const action =
    value?.state === 'loading'
      ? 'Loading'
      : value?.state === 'error'
        ? 'Retry'
        : value
          ? 'Reload'
          : 'Load';
  return (
    <section
      className="arazzo-source-description"
      aria-label={`Source ${source.name}`}
      tabIndex={-1}
    >
      <h4>{source.name}</h4>
      <p>
        {source.type ?? 'unknown'} · <strong>{status}</strong>
        {source.type === 'arazzo' && ' · External workflow (explicit loading)'}
      </p>
      <p>
        {/^https?:/.test(resolvedUri) && !error ? (
          <a href={resolvedUri} aria-label={`Raw source document ${source.name}`}>
            {source.url}
          </a>
        ) : (
          <code>{source.url}</code>
        )}
      </p>
      {sourceProvider && !reason && (
        <button
          type="button"
          disabled={value?.state === 'loading'}
          onClick={(event) => {
            if (document.activeElement === event.currentTarget)
              event.currentTarget.closest<HTMLElement>('section')?.focus();
            void load(source, !!value && value.state !== 'loading');
          }}
        >
          {action} {source.type === 'arazzo' ? 'external workflow' : 'API description'}{' '}
          {source.name}
        </button>
      )}
      {reason && <p>{reason}</p>}
      {!sourceProvider && !reason && <p>API-description loading is unavailable in this viewer.</p>}
      {error && !value && <p>{error}</p>}
      {value?.error && <p>{value.error.message}</p>}
      {value?.facts && (
        <p>
          Contract profile: {value.facts.dialect} {value.facts.version}
        </p>
      )}
      {value?.facts?.unsupportedDiagnostics.map((message) => (
        <p key={message}>{message}</p>
      ))}
      <details>
        <summary>Source acquisition details</summary>
        <p>
          Source URL: <code>{source.url}</code>
        </p>
        <p>Source state: {value?.state ?? 'idle'}</p>
        {value?.content && (
          <>
            <p>
              Retrieval URI: <code>{value.content.retrievalURI}</code>
            </p>
            <p>
              Revision: <code>{value.content.revision ?? 'unpinned'}</code>
            </p>
            <details data-advanced>
              <summary>Advanced source provenance</summary>
              <p>Provider generation: {sourceRegistry.getProviderGeneration()}</p>
              <details>
                <summary>Raw Source Document</summary>
                <pre>
                  {typeof value.content.content === 'string'
                    ? value.content.content
                    : JSON.stringify(value.content.content, null, 2)}
                </pre>
              </details>
            </details>
          </>
        )}
      </details>
      {children}
    </section>
  );
}

export function SourceDescriptions() {
  const { model, sourceProvider, apiDescriptionLoading } = useArazzoViewer();
  const { load, eligibility, unattempted } = useContractFacts();
  const sources = model.document.sourceDescriptions ?? [];
  const pending = sources.filter(
    (source) => source.type !== 'arazzo' && !eligibility(source) && unattempted(source),
  );
  if (!sources.length) return null;
  return (
    <div className="arazzo-source-descriptions" tabIndex={-1}>
      {sourceProvider && apiDescriptionLoading !== 'automatic' && pending.length > 0 && (
        <button
          type="button"
          onClick={(event) => {
            if (document.activeElement === event.currentTarget)
              event.currentTarget.parentElement?.focus();
            for (const source of pending) void load(source, false);
          }}
        >
          Load API descriptions
        </button>
      )}
      {sources.map((source, index) => (
        <SourceDescription key={`${index}:${source.name}`} source={source} />
      ))}
    </div>
  );
}
