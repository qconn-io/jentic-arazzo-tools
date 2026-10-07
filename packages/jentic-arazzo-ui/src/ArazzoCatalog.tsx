import { SourceRevisionContext } from './context/SourceRevisionContext';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArazzoUI } from './ArazzoUI';
import type { ArazzoCatalogProps, WorkflowCatalogSelection } from './types/catalog';
import type { WorkflowLocation } from './types/location';
import {
  loadCatalog,
  type CatalogLoadResult,
  type CatalogLoadedDocument,
} from './utils/catalog/load';
import {
  buildCatalogIndex,
  filterCatalogEntries,
  catalogReachability,
  catalogPathLocation,
  type CatalogFilter,
  type CatalogEntry,
  type CatalogRelationship,
} from './utils/catalog';
import { readCatalogLocation } from './utils/catalog/location';
import { CATALOG_NAMESPACE, catalogKey } from './utils/catalog/manifest';
import './styles/index.css';

/** Optional portfolio discovery and authored reverse usage. Host history is never mutated. @public */
export function ArazzoCatalog(props: ArazzoCatalogProps) {
  const { manifest, manifestURI, sourceProvider } = props;
  const [state, setState] = useState<{
    manifest: typeof manifest;
    provider: typeof sourceProvider;
    uri?: string;
    loaded?: CatalogLoadResult;
    error?: string;
  }>();
  const [localSelection, setLocalSelection] = useState<WorkflowCatalogSelection | null>(
    props.defaultSelection ?? null,
  );
  const [filters, setFilters] = useState<CatalogFilter>({});
  const [operationKey, setOperationKey] = useState('');
  const callbacks = useRef(props);
  callbacks.current = props;
  useEffect(() => {
    const controller = new AbortController();
    setState({ manifest, provider: sourceProvider, uri: manifestURI });
    loadCatalog(manifest, {
      manifestURI,
      provider: sourceProvider,
      signal: controller.signal,
      onCoverage: (coverage) => {
        if (!controller.signal.aborted) callbacks.current.onCoverageChange?.(coverage);
      },
    })
      .then((loaded) => {
        if (!controller.signal.aborted)
          setState({ manifest, provider: sourceProvider, uri: manifestURI, loaded });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ manifest, provider: sourceProvider, uri: manifestURI, error: String(error) });
      });
    return () => controller.abort();
  }, [manifest, manifestURI, sourceProvider]);
  const loaded =
    state?.manifest === manifest && state.provider === sourceProvider && state.uri === manifestURI
      ? state.loaded
      : undefined;
  const index = useMemo(() => (loaded ? buildCatalogIndex(loaded) : undefined), [loaded]);
  const selection = props.selection !== undefined ? props.selection : localSelection;
  const select = (value: WorkflowCatalogSelection | null) => {
    if (props.selection === undefined) setLocalSelection(value);
    props.onSelectionChange?.(value);
  };
  const open = (entry: CatalogEntry, location = entry.location) =>
    select({
      documentId: entry.documentId,
      revision: entry.revision,
      workflowId: entry.workflowId,
      location,
    });
  const selected = selection && index?.byKey.get(catalogKey(selection));
  const provider = useMemo(
    () =>
      loaded
        ? {
            async load(request: import('./types/source').SourceDocumentRequest) {
              const values = [
                ...(selected ? [selected.document] : []),
                ...(selected ? [selected.document] : []).flatMap((d) =>
                  [...d.sources.values()].filter(
                    (s): s is CatalogLoadedDocument => !(s instanceof Error),
                  ),
                ),
              ];
              if (
                !request.revision &&
                new Set(
                  values.filter((d) => d.uri === request.uri).map((d) => d.definition.revision),
                ).size > 1
              )
                throw new Error(
                  'Ambiguous supplied source revision; exact source scope is required',
                );
              const found = values.find(
                (d) =>
                  d.uri === request.uri &&
                  (!request.revision || d.definition.revision === request.revision),
              );
              if (found)
                return {
                  content: found.content,
                  retrievalURI: found.uri,
                  revision: found.definition.revision,
                };
              return loaded.registry.acquire(request.uri, request.revision);
            },
          }
        : undefined,
    [loaded, selected?.document],
  );
  const changeLocation = (location: WorkflowLocation) => {
    if (!selected) return;
    select({
      documentId: selected.documentId,
      revision: selected.revision,
      workflowId: location.root ?? selected.workflowId,
      location,
    });
    props.onLocationChange?.(location);
  };
  const field = (key: keyof CatalogFilter, value: string) =>
    setFilters((previous) => ({ ...previous, [key]: value }));
  if (
    state?.manifest === manifest &&
    state.provider === sourceProvider &&
    state.uri === manifestURI &&
    state.error
  )
    return (
      <div className="arazzo-catalog" role="alert">
        Catalog unavailable: {state.error}
      </div>
    );
  if (!index || !loaded)
    return (
      <div className="arazzo-catalog" role="status">
        Loading supplied catalog…
      </div>
    );
  const visible = filterCatalogEntries(index, filters);
  const incoming = selected
    ? index.relationships.filter((r) => r.to && catalogKey(r.to) === selected.key)
    : [];
  const outgoing = selected
    ? index.relationships.filter((r) => catalogKey(r.from) === selected.key)
    : [];
  const reach = selected
    ? catalogReachability(index, selected, { kinds: ['call', 'prerequisite', 'goto', 'retry'] })
    : undefined;
  const operations = [
    ...new Map(
      index.apiUsages.filter((u) => u.operationKey).map((u) => [u.operationKey!, u]),
    ).values(),
  ];
  const operationUsages = index.apiUsages.filter((u) => u.operationKey === operationKey);
  const relation = (r: CatalogRelationship, direction: 'incoming' | 'outgoing') => {
    const source = index.byKey.get(catalogKey(r.from));
    const target = r.to && index.byKey.get(catalogKey(r.to));
    return (
      <li key={r.id}>
        {direction === 'incoming' && source ? (
          <button type="button" onClick={() => open(source, r.location)}>
            {r.kind} from {source.workflowId} / {source.documentId} / {source.revision}{' '}
            {r.location.selection?.stepId ?? ''}
          </button>
        ) : target ? (
          <button type="button" onClick={() => open(target)}>
            {r.kind} to {target.workflowId} / {target.documentId} / {target.revision}
          </button>
        ) : (
          <span>
            {r.kind}: {r.reference} — unresolved
          </span>
        )}
        <p>
          Authored source: <code>{r.pointer}</code>
          {r.declarationPointer && (
            <>
              ; declaration: <code>{r.declarationPointer}</code>
            </>
          )}
        </p>
        {r.description && <p>Descriptive association: {r.description}</p>}
      </li>
    );
  };
  return (
    <div className={`arazzo-catalog ${props.className ?? ''}`}>
      <header>
        <h1>Workflow capability catalog</h1>
        <p>
          {manifest.id} / catalog revision {manifest.revision}
        </p>
      </header>
      <section aria-label="Catalog coverage">
        <p role="status">{index.coverageMessage}</p>
        <details>
          <summary>Source coverage ({index.coverage.length})</summary>
          <ul>
            {index.coverage.map((c) => (
              <li key={c.key}>
                <strong>{c.state}</strong> — {c.uri} {c.revision ?? 'retrieved snapshot'}{' '}
                {c.message ?? ''}
              </li>
            ))}
          </ul>
        </details>
      </section>
      <section className="catalog-filters" aria-label="Discovery filters">
        <label>
          Search
          <input
            aria-label="Search"
            value={filters.search ?? ''}
            onChange={(e) => field('search', e.target.value)}
          />
        </label>
        {(
          [
            ['product', 'Product', manifest.products],
            ['capability', 'Capability', manifest.capabilities],
            ['owner', 'Owner', [{ id: 'unknown', name: 'unknown' }, ...(manifest.owners ?? [])]],
          ] as const
        ).map(([key, title, values]) => (
          <label key={key}>
            {title}
            <select
              aria-label={title}
              value={filters[key] ?? ''}
              onChange={(e) => field(key, e.target.value)}
            >
              <option value="">All</option>
              {values?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Lifecycle
          <select
            aria-label="Lifecycle"
            value={filters.lifecycle ?? ''}
            onChange={(e) => field('lifecycle', e.target.value)}
          >
            <option value="">All</option>
            {[...new Set(index.entries.map((e) => e.metadata?.lifecycle ?? 'unknown'))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Role
          <select
            aria-label="Role"
            value={filters.role ?? ''}
            onChange={(e) => field('role', e.target.value)}
          >
            <option value="">All</option>
            {['entry', 'helper', 'diagnostic', 'unknown'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          API
          <input
            aria-label="API"
            value={filters.api ?? ''}
            onChange={(e) => field('api', e.target.value)}
          />
        </label>
      </section>
      <div className="catalog-layout">
        <section aria-label="Catalog entries">
          <h2>Workflows ({visible.length})</h2>
          <ul className="catalog-entries">
            {visible.map((entry) => (
              <li key={entry.key}>
                <button
                  type="button"
                  aria-current={selected?.key === entry.key ? 'true' : undefined}
                  onClick={() => open(entry)}
                >
                  {entry.metadata?.title ?? entry.workflowId} — {entry.documentId} /{' '}
                  {entry.revision}
                </button>
                <p>
                  {entry.metadata?.role ?? 'Role unknown'} · owner{' '}
                  {entry.metadata?.owner ?? 'unknown'} · lifecycle{' '}
                  {entry.metadata?.lifecycle ?? 'unknown'}
                </p>
                <p>{entry.metadata?.capabilities?.join(', ')}</p>
                {entry.metadata?.description && <p>{entry.metadata.description}</p>}
              </li>
            ))}
          </ul>
          {!visible.length && (
            <p>No matching entries in the indexed supplied scope. {index.coverageMessage}</p>
          )}
        </section>
        <section aria-label="Catalog details">
          {selection && !selected && (
            <p role="alert">
              Unavailable catalog revision or workflow: {selection.documentId} /{' '}
              {selection.revision} / {selection.workflowId}
            </p>
          )}
          {selected ? (
            <>
              <h2>{selected.workflowId}</h2>
              <button type="button" onClick={() => select(null)}>
                Close catalog entry
              </button>
              <p>Owner: {selected.metadata?.owner ?? 'unknown'}</p>
              <p>Lifecycle: {selected.metadata?.lifecycle ?? 'unknown'}</p>
              <p>Role: {selected.metadata?.role ?? 'unknown'}</p>
              <p>Systems: {selected.metadata?.systems?.join(', ') ?? 'not supplied'}</p>
              <p>
                Source: <code>{selected.document.uri}</code>
              </p>
              <p>Revision: {selected.revision}</p>
              <p>
                Digest: <code>{selected.document.digest}</code>
              </p>
              <h3>Incoming authored usage ({incoming.length})</h3>
              <ul>{incoming.map((r) => relation(r, 'incoming'))}</ul>
              {!incoming.length && (
                <p>
                  No known incoming usage in the indexed supplied scope. {index.coverageMessage}
                </p>
              )}
              <h3>Outgoing authored usage ({outgoing.length})</h3>
              <ul>{outgoing.map((r) => relation(r, 'outgoing'))}</ul>
              <h3>Known entry-point paths</h3>
              <p>
                Relationship paths describe authored reachability; prerequisites, transfers and
                retries retain their classes.
              </p>
              {reach?.bounded && (
                <p role="status">Path limit reached; reachability coverage is incomplete.</p>
              )}
              {!!reach?.cycles.length && (
                <p>
                  Cycles encountered: {reach.cycles.length}; traversal stopped at repeated
                  identities.
                </p>
              )}
              <ul>
                {reach?.paths.map((path, i) => (
                  <li key={i}>
                    <details>
                      <summary>
                        {path.entry.workflowId} / {path.entry.documentId} / {path.entry.revision} ·
                        path {i + 1}
                      </summary>
                      {selected.workflow.steps[0] &&
                        catalogPathLocation(path, selected, selected.workflow.steps[0].stepId) && (
                          <button
                            type="button"
                            onClick={() =>
                              open(
                                path.entry,
                                catalogPathLocation(
                                  path,
                                  selected,
                                  selected.workflow.steps[0].stepId,
                                )!,
                              )
                            }
                          >
                            Inspect this call occurrence
                          </button>
                        )}
                      <ol>
                        {path.relationships.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => {
                                const source = index.byKey.get(catalogKey(r.from));
                                if (source) open(source, r.location);
                              }}
                            >
                              {r.from.workflowId} · {r.kind} ·{' '}
                              {r.location.selection?.stepId ?? r.pointer}
                            </button>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </li>
                ))}
              </ul>
              <h3>Authored API usage</h3>
              <ul>
                {index.apiUsages
                  .filter((u) => catalogKey(u.from) === selected.key)
                  .map((u) => (
                    <li key={u.id}>
                      <button type="button" onClick={() => open(selected, u.location)}>
                        Inspect {u.stepId}
                      </button>{' '}
                      — {u.status} · {Object.values(u.authored).join(' · ')}
                      {u.operationKey && (
                        <button type="button" onClick={() => setOperationKey(u.operationKey!)}>
                          Consumers of {u.operation?.operationId ?? u.operation?.pointer}
                        </button>
                      )}
                      {u.diagnostics.map((d) => (
                        <p key={d}>{d}</p>
                      ))}
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            !selection && <p>Select a workflow to read its provenance and classified usage.</p>
          )}
          <h3>Located API operations</h3>
          <label>
            Operation
            <select
              aria-label="Operation"
              value={operationKey}
              onChange={(e) => setOperationKey(e.target.value)}
            >
              <option value="">Select an operation</option>
              {operations.map((u) => (
                <option key={u.operationKey} value={u.operationKey}>
                  {u.operation?.operationId ?? u.operation?.pointer} — {u.uri} / {u.revision}
                </option>
              ))}
            </select>
          </label>
          {operationKey && (
            <section aria-label="Operation consumers">
              <p>
                {operationUsages.length} direct authored step uses. {index.coverageMessage}
              </p>
              <ul>
                {operationUsages.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const entry = index.byKey.get(catalogKey(u.from));
                        if (entry) open(entry, u.location);
                      }}
                    >
                      {u.from.workflowId} / {u.from.documentId} / {u.from.revision} · {u.stepId}
                    </button>
                  </li>
                ))}
              </ul>
              <details>
                <summary>Exact operation declaration</summary>
                <pre>{JSON.stringify(operationUsages[0]?.operation, null, 2)}</pre>
              </details>
            </section>
          )}
        </section>
      </div>
      {selected && (
        <section className="catalog-viewer" aria-label="Selected workflow viewer">
          <SourceRevisionContext.Provider
            value={Object.fromEntries(
              [...selected.document.sources.entries()]
                .filter(
                  (pair): pair is [string, CatalogLoadedDocument] => !(pair[1] instanceof Error),
                )
                .map(([name, source]) => [name, source.definition.revision]),
            )}
          >
            <ArazzoUI
              key={selected.key}
              document={
                selected.document.content as import('./types/arazzo').ArazzoDocument | string
              }
              documentIdentity={selected.document.uri}
              documentRevision={selected.revision}
              baseURI={selected.document.uri}
              location={selection?.location ?? selected.location}
              view={selection?.location?.view ?? 'docs'}
              onLocationChange={changeLocation}
              locationAdapters={[
                {
                  namespace: CATALOG_NAMESPACE,
                  restore: (value) =>
                    !readCatalogLocation(manifest, {
                      ...selected.location,
                      extensions: { [CATALOG_NAMESPACE]: value },
                    }).error,
                },
              ]}
              sourceProvider={provider}
              viewProfile={selected.document.definition.viewProfile}
              scenarioManifest={selected.document.definition.scenarioManifest}
            />
          </SourceRevisionContext.Provider>
        </section>
      )}
    </div>
  );
}
