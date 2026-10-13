import React, { useContext, useEffect, useState } from 'react';

import { SourceRevisionContext } from '../context/SourceRevisionContext';
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

export const descriptionStatusMeaning =
  'Loaded: description available under a supported profile. Operation found: selected declaration located. Neither establishes schema validation or execution.';

function useSourceAnnouncement() {
  const { model, sourceProvider } = useArazzoViewer();
  const revisions = useContext(SourceRevisionContext);
  const { loaded } = useContractFacts();
  const scope = model.inspection.snapshot;
  const [attempt, setAttempt] = useState<{
    scope: typeof scope;
    provider: typeof sourceProvider;
    sources: DeclaredSource[];
    pins: (string | undefined)[];
    bulk: boolean;
    pending: boolean;
    message: string;
  }>();
  const current =
    attempt &&
    attempt.scope === scope &&
    attempt.provider === sourceProvider &&
    attempt.sources.every((source, index) => attempt.pins[index] === revisions[source.name]);
  useEffect(() => {
    if (!attempt) return;
    if (!current) {
      setAttempt(undefined);
      return;
    }
    if (!attempt.pending) return;
    const values = attempt.sources.map((source) => loaded[source.name]);
    const states = values.map((value) => sourceAvailability(value));
    // wait for current projections; acquisition promises are not evidence.
    if (states.includes('Not loaded')) return;
    const pending = states.includes('Loading');
    const message = attempt.bulk
      ? `API descriptions: ${states.filter((s) => s === 'Loading').length} loading, ${states.filter((s) => s === 'Loaded').length} loaded, ${states.filter((s) => s === 'Failed').length} failed, ${states.filter((s) => s === 'Unsupported').length} unsupported.`
      : `${attempt.sources[0].name}: ${states[0]}.${states[0] === 'Failed' ? ' Description could not be loaded. Retry available.' : states[0] === 'Unsupported' ? ' Description has an unsupported inspection profile.' : ''}`;
    if (message !== attempt.message || pending !== attempt.pending)
      setAttempt({ ...attempt, pending, message });
  }, [attempt, current, loaded]);
  return {
    message: current ? attempt.message : '',
    announce: (sources: DeclaredSource[], bulk = false) =>
      setAttempt({
        scope,
        provider: sourceProvider,
        sources,
        pins: sources.map((source) => revisions[source.name]),
        bulk,
        pending: true,
        message: bulk
          ? `API descriptions: ${sources.length} loading, 0 loaded, 0 failed, 0 unsupported.`
          : `${sources[0].name}: Loading.`,
      }),
  };
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
  const announcement = useSourceAnnouncement();
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
      <p
        className="arazzo-source-announcement"
        role="status"
        aria-label="Source action result"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement.message}
      </p>
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
            announcement.announce([source]);
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
  const announcement = useSourceAnnouncement();
  const sources = model.document.sourceDescriptions ?? [];
  const pending = sources.filter(
    (source) => source.type !== 'arazzo' && !eligibility(source) && unattempted(source),
  );
  if (!sources.length) return null;
  return (
    <div className="arazzo-source-descriptions" tabIndex={-1}>
      <p className="arazzo-source-meaning">{descriptionStatusMeaning}</p>
      <p
        className="arazzo-source-announcement"
        role="status"
        aria-label="API description batch result"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement.message}
      </p>
      {sourceProvider && apiDescriptionLoading !== 'automatic' && pending.length > 0 && (
        <button
          type="button"
          onClick={(event) => {
            if (document.activeElement === event.currentTarget)
              event.currentTarget.parentElement?.focus();
            announcement.announce(pending, true);
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
