import React, { useEffect, useMemo, useState } from 'react';
import { ArazzoCatalog } from '../ArazzoCatalog';
import { BrowserFetchProvider } from '../utils/source/BrowserFetchProvider';
import { normalizeCatalogManifest } from '../utils/catalog/manifest';
import { catalogLocation, readCatalogLocation } from '../utils/catalog/location';
import { readLocationURL, writeLocationURL } from '../utils/location/codec';
import type { WorkflowCatalogManifest, WorkflowCatalogSelection } from '../types/catalog';
import type { ArazzoUIStandaloneProps } from '../ArazzoUIStandalone';
import type { WorkflowLocation } from '../types/location';

export function StandaloneCatalog({
  props,
  input,
}: {
  props: ArazzoUIStandaloneProps;
  input: WorkflowCatalogManifest | string;
}) {
  const browser = useMemo(() => new BrowserFetchProvider(), []);
  const provider = props.sourceProvider ?? browser;
  const uri =
    typeof input === 'string' ? new URL(input, globalThis.location.href).href : props.catalogURI;
  const [state, setState] = useState<{
    input: typeof input;
    provider: typeof provider;
    manifest?: WorkflowCatalogManifest;
    error?: string;
    retrievalURI?: string;
  }>();
  const [urlLocation, setURLLocation] = useState(() =>
    readLocationURL(new URL(globalThis.location.href)),
  );
  const [selection, setSelection] = useState<WorkflowCatalogSelection | null>(
    props.catalogSelection ?? null,
  );
  useEffect(() => {
    const controller = new AbortController();
    setState({ input, provider });
    const pending =
      typeof input === 'string'
        ? provider.load({ uri: uri!, signal: controller.signal }).then((result) => {
            const size = new TextEncoder().encode(
              typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
            ).length;
            if (size > 10 * 1024 * 1024) throw new Error('Catalog manifest size limit exceeded');
            return {
              manifest: normalizeCatalogManifest(
                typeof result.content === 'string' ? JSON.parse(result.content) : result.content,
              ),
              retrievalURI: result.retrievalURI,
            };
          })
        : Promise.resolve().then(() => ({
            manifest: normalizeCatalogManifest(input),
            retrievalURI: props.catalogURI,
          }));
    pending
      .then((value) => {
        if (!controller.signal.aborted) setState({ input, provider, ...value });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ input, provider, error: String(error) });
      });
    return () => controller.abort();
  }, [input, uri, provider]);
  useEffect(() => {
    const pop = () => setURLLocation(readLocationURL(new URL(globalThis.location.href)));
    globalThis.addEventListener('popstate', pop);
    return () => globalThis.removeEventListener('popstate', pop);
  }, []);
  const manifest =
    state?.input === input && state.provider === provider ? state.manifest : undefined;
  const restored = manifest ? readCatalogLocation(manifest, urlLocation.location) : {};
  useEffect(() => {
    if (manifest && !restored.error) setSelection(restored.selection ?? null);
  }, [manifest, urlLocation]);
  const commit = (next: WorkflowCatalogSelection | null, location?: WorkflowLocation) => {
    props.onCatalogSelectionChange?.(next);
    if (props.catalogSelection !== undefined) return;
    setSelection(next);
    if (!uri || !manifest) return;
    let url = new URL(globalThis.location.href);
    if (next && location) url = writeLocationURL(url, catalogLocation(manifest, next, location));
    else {
      url.searchParams.delete('location');
      url.searchParams.delete('document');
    }
    url.searchParams.set('catalog', uri);
    if (url.href !== globalThis.location.href) globalThis.history.pushState(null, '', url);
  };
  if (
    (state?.input === input && state.provider === provider && state.error) ||
    urlLocation.error ||
    restored.error
  )
    return (
      <div className="arazzo-catalog" role="alert">
        {state?.error ?? urlLocation.error ?? restored.error}
      </div>
    );
  if (!manifest) return <p role="status">Loading catalog manifest…</p>;
  return (
    <>
      {uri && selection && (
        <button
          className="catalog-copy-link"
          type="button"
          onClick={() => navigator.clipboard.writeText(globalThis.location.href)}
        >
          Copy catalog link
        </button>
      )}
      <ArazzoCatalog
        manifest={manifest}
        manifestURI={state?.retrievalURI ?? uri}
        sourceProvider={provider}
        selection={props.catalogSelection !== undefined ? props.catalogSelection : selection}
        onSelectionChange={(next) => commit(next, next?.location)}
        onLocationChange={(location) => {
          props.onLocationChange?.(location);
        }}
      />
    </>
  );
}
