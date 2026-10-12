import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react';

import { StandaloneCatalog, useStandaloneCatalogInput } from './components/StandaloneCatalog';
import {
  StandaloneShell,
  commitBrowserHistoryLocation,
  copyStandaloneShareLink,
  createLocalDocumentIdentity,
  isHttpUrl,
  pushBrowserSourceHistory,
  readBrowserPopState,
  readInitialStandaloneDocument,
} from './components/StandaloneShell';
import { useStandaloneScenarios } from './utils/scenario/useStandaloneScenarios';
import { normalizeScenarioManifest, scenarioWaypoint } from './utils/scenario/manifest';
import { BrowserFetchProvider } from './utils/source/BrowserFetchProvider';
import { useSourceRegistry } from './utils/source/useSourceRegistry';
import { readLocationURL, encodeLocation } from './utils/location/codec';
import type { StandaloneExternalSource } from './utils/location/resolve';
import { LocationHistoryContext } from './context/LocationHistoryContext';
import { CopyLinkContext } from './context/CopyLinkContext';
import type { WorkflowLocation } from './types/location';
import { ArazzoUI } from './ArazzoUI';
import { ReadingIntentContext } from './context/ReadingIntentContext';
import type { ArazzoUIProps, ArazzoUIRef, ViewerMode } from './types/index';
import type { ArazzoDocument } from './types/arazzo';
import './styles/index.css';

export {
  ArazzoWorkflowReview,
  compareWorkflowRevisions,
  exportWorkflowReview,
  ArazzoCatalog,
  normalizeCatalogManifest,
  digitalProductProfile,
  encodeLocation,
  decodeLocation,
  readLocationURL,
  writeLocationURL,
  authoredDigest,
  createLocationAdapter,
} from './ArazzoUI';
export type * from './types/index';

/** @public */
export type ArazzoUIStandaloneProps = Omit<ArazzoUIProps, 'view'> & {
  initialView?: ViewerMode;
  catalog?: import('./types/catalog').WorkflowCatalogManifest | string;
  catalogURI?: string;
  catalogSelection?: import('./types/catalog').WorkflowCatalogSelection | null;
  onCatalogSelectionChange?: (
    selection: import('./types/catalog').WorkflowCatalogSelection | null,
  ) => void;
};

/**
 * ArazzoUIStandalone - Self-contained Arazzo viewer with built-in header
 *
 * Includes Jentic logo, URL input for loading documents, and view mode toggle.
 * Use this when you want a complete, ready-to-use viewer widget.
 * For custom layouts without the header, use ArazzoUI directly.
 *
 * @public
 */
const DocumentStandalone = forwardRef<ArazzoUIRef, ArazzoUIStandaloneProps>(
  function DocumentStandalone(props, ref) {
    const { initialView = 'docs', onViewChange, ...rest } = props;
    const guides = useStandaloneScenarios(props);
    const browserProvider = React.useMemo(() => new BrowserFetchProvider(), []);
    const [externalSource, setExternalSource] = useState<StandaloneExternalSource>();
    const [navigationError, setNavigationError] = useState('');
    const navigationController = useRef<AbortController>();
    const hostScenarioLocation = useRef<WorkflowLocation>();
    const initialURL = useRef(readLocationURL(new URL(globalThis.location.href)));
    const [view, setView] = useState<ViewerMode>(
      props.location?.view ??
        initialURL.current.location?.view ??
        props.defaultLocation?.view ??
        initialView,
    );
    useEffect(() => {
      if (props.location) setView(props.location.view);
    }, [props.location?.view]);

    const initialDocument = readInitialStandaloneDocument(props.document, props.documentIdentity);
    const [urlInput, setUrlInput] = useState(isHttpUrl(initialDocument) ? initialDocument : '');
    const [documentSource, setDocumentSource] = useState<ArazzoDocument | string>(initialDocument);
    const navigationRegistry = useSourceRegistry(
      props.sourceProvider ?? browserProvider,
      undefined,
      documentSource,
    );
    const [localIdentity, setLocalIdentity] = useState(createLocalDocumentIdentity);
    const inlineSource =
      typeof documentSource !== 'string' ||
      /[\r\n]|^\s*[{[]|^\s*(?:arazzo|info|sourceDescriptions):/.test(documentSource);
    const hostSource = documentSource === props.document;
    const suppliedIdentity = hostSource ? props.documentIdentity : undefined;
    const documentIdentity =
      externalSource?.uri ?? suppliedIdentity ?? (inlineSource ? localIdentity : undefined);
    const documentRevision =
      externalSource?.revision ?? (hostSource ? props.documentRevision : undefined);
    const [hydration, setHydration] = useState({
      epoch: 0,
      location: initialURL.current.location ?? props.defaultLocation,
      error: initialURL.current.error,
      callers: undefined as WorkflowLocation[] | undefined,
    });
    const [locationRequest, setLocationRequest] = useState<WorkflowLocation>();
    const callerLocations = useRef<WorkflowLocation[]>([]);
    const currentLocation = useRef<WorkflowLocation>();
    const replaceNext = useRef(true);
    const [shareMessage, setShareMessage] = useState('');
    const sourceGeneration = useRef(0);
    const hostDocumentRef = useRef(props.document);
    const sourceRef = useRef(documentSource);
    sourceRef.current = documentSource;

    const cancelPendingNavigation = useCallback(() => {
      sourceGeneration.current += 1;
      navigationController.current?.abort();
      navigationRegistry.cancelAll();
    }, [navigationRegistry]);

    useEffect(() => cancelPendingNavigation(), [guides.manifest]);
    useEffect(() => {
      if (guides.selection === null) cancelPendingNavigation();
    }, [guides.selection]);
    useEffect(() => {
      cancelPendingNavigation();
      return cancelPendingNavigation;
    }, [props.sourceProvider, props.document]);

    const addressable = (value: WorkflowLocation) =>
      !!suppliedIdentity || isHttpUrl(value.document);
    const copy = async () => {
      const current = currentLocation.current;
      setShareMessage(
        await copyStandaloneShareLink({
          current,
          addressable: !!current && addressable(current),
          guides,
        }),
      );
    };

    const commitLocation = (value: WorkflowLocation) => {
      currentLocation.current = value;
      commitBrowserHistoryLocation({
        location: value,
        addressable: addressable(value),
        source: sourceRef.current,
        callers: callerLocations.current,
        documentIdentity,
        externalSource,
        replaceNext,
      });
    };

    useEffect(() => {
      const restore = (event: PopStateEvent) => {
        cancelPendingNavigation();
        setNavigationError('');
        const snapshot = readBrowserPopState(event, props.document, props.documentIdentity);
        guides.restore(snapshot.url);
        replaceNext.current = true;
        currentLocation.current = undefined;
        setShareMessage('');
        if (snapshot.identity) setLocalIdentity(snapshot.identity);
        setExternalSource(snapshot.externalSource);
        setDocumentSource(
          snapshot.externalSource && snapshot.externalDocument !== undefined
            ? snapshot.externalDocument
            : snapshot.document,
        );
        setUrlInput(isHttpUrl(snapshot.document) ? snapshot.document : '');
        setView(snapshot.decoded.location?.view ?? initialView);
        callerLocations.current = snapshot.callers;
        setHydration((current) => ({
          epoch: current.epoch + 1,
          location: snapshot.decoded.location,
          error: snapshot.decoded.error,
          callers: snapshot.callers,
        }));
      };
      globalThis.addEventListener('popstate', restore);
      return () => {
        sourceGeneration.current += 1;
        globalThis.removeEventListener('popstate', restore);
      };
    }, [props.document, props.documentIdentity, initialView]);

    const commitSource = (
      source: ArazzoDocument | string,
      provenance?: StandaloneExternalSource,
      guideLocation?: WorkflowLocation,
    ) => {
      cancelPendingNavigation();
      setNavigationError('');
      if (!guideLocation) guides.setSelection(null);
      setExternalSource(provenance);
      currentLocation.current = undefined;
      replaceNext.current = true;
      setShareMessage('');
      const identity = createLocalDocumentIdentity();
      setLocalIdentity(identity);
      setDocumentSource(source);
      setHydration((current) => ({
        epoch: current.epoch + 1,
        location: guideLocation,
        error: undefined,
        callers: undefined,
      }));
      pushBrowserSourceHistory(source, identity, provenance);
    };

    useEffect(() => {
      if (hostDocumentRef.current === props.document) return;
      hostDocumentRef.current = props.document;
      const pending = hostScenarioLocation.current;
      const supplied =
        props.documentIdentity ?? (isHttpUrl(props.document) ? props.document : undefined);
      commitSource(
        props.document,
        undefined,
        guides.selection && pending?.document === supplied ? pending : undefined,
      );
      hostScenarioLocation.current = undefined;
      setUrlInput(isHttpUrl(props.document) ? props.document : '');
    }, [props.document]);

    const handleViewChange = useCallback(
      (v: ViewerMode) => {
        if (props.location) {
          const requested = { ...(currentLocation.current ?? props.location), view: v };
          setLocationRequest(requested);
          props.onLocationChange?.(requested);
        } else setView(v);
        onViewChange?.(v);
      },
      [onViewChange, props.location, props.onLocationChange],
    );

    const loadFile = (file: File) => {
      const generation = ++sourceGeneration.current;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (generation !== sourceGeneration.current) return;
        const content = event.target?.result;
        if (typeof content === 'string') {
          setUrlInput('');
          commitSource(content);
        }
      };
      reader.readAsText(file);
    };

    const acquireExternalDocument = async (
      uri: string,
      revision: string | undefined,
      options: {
        root?: string;
        guideLocation?: WorkflowLocation;
        mismatchMessage: (actual?: string) => string;
        formatError: (message: string) => string;
      },
    ) => {
      navigationController.current?.abort();
      navigationRegistry.cancelAll();
      const controller = new AbortController();
      navigationController.current = controller;
      const generation = ++sourceGeneration.current;
      setNavigationError('');
      try {
        const acquired = await navigationRegistry.acquire(uri, revision);
        if (controller.signal.aborted || generation !== sourceGeneration.current) return;
        if (revision !== undefined && acquired.revision !== revision)
          throw new Error(options.mismatchMessage(acquired.revision));
        commitSource(
          typeof acquired.content === 'string'
            ? acquired.content
            : JSON.stringify(acquired.content),
          {
            uri: acquired.retrievalURI,
            revision: acquired.revision,
            ...(options.root ? { root: options.root } : {}),
          },
          options.guideLocation,
        );
        setUrlInput(acquired.retrievalURI);
      } catch (error) {
        if (!controller.signal.aborted && generation === sourceGeneration.current)
          setNavigationError(
            options.formatError(error instanceof Error ? error.message : String(error)),
          );
      }
    };

    const navigateScenarioLocation: NonNullable<
      ArazzoUIProps['onScenarioLocationRequest']
    > = async (location, focus) => {
      if (props.onScenarioLocationRequest) {
        hostScenarioLocation.current = location;
        props.onScenarioLocationRequest(location, focus);
        return;
      }
      const normalized = normalizeScenarioManifest(guides.manifest, guides.uri).manifest;
      const accepted = scenarioWaypoint(normalized, guides.selection, view);
      if (!accepted || encodeLocation(accepted.location) !== encodeLocation(location)) return;
      setView(location.view);
      const currentIdentity =
        documentIdentity ?? (isHttpUrl(documentSource) ? documentSource : undefined);
      if (location.document === currentIdentity) {
        cancelPendingNavigation();
        return;
      }
      await acquireExternalDocument(location.document, location.revision, {
        guideLocation: location,
        mismatchMessage: () => 'Scenario document revision mismatch.',
        formatError: (message) => `Guide document unavailable: ${message}`,
      });
    };

    const guideSelectionKey = JSON.stringify(guides.selection);
    useEffect(() => {
      if (props.onScenarioLocationRequest || !guides.selection) return;
      const normalized = normalizeScenarioManifest(guides.manifest, guides.uri).manifest;
      const identity = normalized?.id ?? guides.uri;
      if (
        (identity && guides.selection.manifest !== identity) ||
        guides.selection.revision !== normalized?.revision
      )
        return;
      const point = scenarioWaypoint(normalized, guides.selection, view);
      if (point) navigateScenarioLocation(point.location, point.focus);
    }, [guideSelectionKey, guides.manifest, guides.uri, props.sourceProvider]);

    return (
      <LocationHistoryContext.Provider
        value={{
          callers: hydration.callers,
          requestedLocation: locationRequest,
          commit: commitLocation,
          recordCallers: (callers, destination) => {
            if (JSON.stringify(callerLocations.current) === JSON.stringify(callers)) return;
            callerLocations.current = callers;
            if (
              !replaceNext.current &&
              currentLocation.current &&
              encodeLocation(currentLocation.current) === encodeLocation(destination)
            )
              globalThis.history.replaceState(
                { ...globalThis.history.state, arazzoCallers: callers },
                '',
                globalThis.location.href,
              );
          },
        }}
      >
        <CopyLinkContext.Provider value={{ copy, message: shareMessage }}>
          <StandaloneShell
            className={props.className}
            style={props.style}
            urlInput={urlInput}
            onUrlInputChange={setUrlInput}
            onExplore={() => {
              const trimmed = urlInput.trim();
              if (trimmed) commitSource(trimmed);
            }}
            onLoadFile={loadFile}
            hydrationError={hydration.error}
            navigationError={navigationError}
            guides={guides}
            onOpenGuidedExample={() => {
              const documentURL = new URL(
                'examples/digital-product/arazzo.yaml',
                globalThis.location.href,
              ).href;
              const guideURL = new URL(
                'examples/digital-product/scenarios.json',
                globalThis.location.href,
              ).href;
              commitSource(documentURL);
              setUrlInput(documentURL);
              guides.loadExample(guideURL);
              const target = new URL(globalThis.location.href);
              target.searchParams.set('scenarios', guideURL);
              globalThis.history.replaceState(globalThis.history.state, '', target);
            }}
          >
            <ReadingIntentContext.Provider
              value={
                props.initialView === undefined &&
                props.location === undefined &&
                hydration.location === undefined
              }
            >
              <ArazzoUI
                key={hydration.epoch}
                ref={ref}
                {...rest}
                documentIdentity={documentIdentity}
                documentRevision={documentRevision}
                defaultLocation={hydration.location}
                onLocationChange={props.onLocationChange}
                sourceProvider={props.sourceProvider ?? browserProvider}
                baseURI={externalSource?.uri ?? props.baseURI}
                activeWorkflowId={externalSource?.root ?? props.activeWorkflowId}
                onExternalNavigation={async (request) => {
                  if (props.onExternalNavigation) {
                    props.onExternalNavigation(request);
                    return;
                  }
                  await acquireExternalDocument(request.documentUri, request.revision, {
                    root: request.workflowId,
                    mismatchMessage: (actual) =>
                      `Revision mismatch: requested ${request.revision}, got ${actual ?? 'no revision'}`,
                    formatError: (message) => message,
                  });
                }}
                scenarioManifest={guides.manifest}
                scenarioManifestURI={guides.uri}
                scenarioSelection={guides.selection}
                onScenarioSelectionChange={guides.setSelection}
                onScenarioLocationRequest={navigateScenarioLocation}
                document={documentSource}
                view={view}
                onViewChange={handleViewChange}
                className={undefined}
                style={undefined}
              />
            </ReadingIntentContext.Provider>
          </StandaloneShell>
        </CopyLinkContext.Provider>
      </LocationHistoryContext.Provider>
    );
  },
);

/** Self-contained document viewer or opt-in supplied catalog. @public */
export const ArazzoUIStandalone = forwardRef<ArazzoUIRef, ArazzoUIStandaloneProps>(
  function ArazzoUIStandalone(props, ref) {
    const input = useStandaloneCatalogInput(props);
    return input ? (
      <StandaloneCatalog
        key={typeof input === 'string' ? input : undefined}
        props={props}
        input={input}
      />
    ) : (
      <DocumentStandalone {...props} ref={ref} />
    );
  },
);
