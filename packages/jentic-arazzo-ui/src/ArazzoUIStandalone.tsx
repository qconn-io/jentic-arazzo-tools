export { ArazzoWorkflowReview } from './ArazzoWorkflowReview';
export { compareWorkflowRevisions, exportWorkflowReview } from './utils/review';
export type {
  WorkflowReviewSnapshot,
  WorkflowReviewAddress,
  WorkflowReviewMatch,
  WorkflowReviewOptions,
  WorkflowReviewValue,
  WorkflowReviewCategory,
  WorkflowReviewEvidence,
  WorkflowReviewRelationship,
  WorkflowReviewImpactPath,
  WorkflowReviewImpact,
  WorkflowReviewEffect,
  WorkflowReviewFinding,
  WorkflowReviewIdentity,
  WorkflowReviewResult,
  ArazzoWorkflowReviewProps,
} from './types/review';
import { StandaloneCatalog } from './components/StandaloneCatalog';
export { ArazzoCatalog } from './ArazzoCatalog';
export type {
  WorkflowCatalogLabel,
  WorkflowCatalogIdentity,
  WorkflowCatalogMetadata,
  WorkflowCatalogDocument,
  WorkflowCatalogAssociation,
  WorkflowCatalogManifest,
  WorkflowCatalogCoverage,
  WorkflowCatalogSelection,
  ArazzoCatalogProps,
} from './types/catalog';
export { normalizeCatalogManifest } from './utils/catalog/manifest';
import { useStandaloneScenarios } from './utils/scenario/useStandaloneScenarios';
import {
  SCENARIO_NAMESPACE,
  normalizeScenarioManifest,
  scenarioWaypoint,
} from './utils/scenario/manifest';
export type {
  ScenarioFocus,
  ScenarioWaypoint,
  AuthoredScenario,
  ScenarioManifest,
  ScenarioSelection,
  ScenarioControls,
} from './types/scenario';
export type {
  WorkflowProfileProvenance,
  WorkflowSystemParticipant,
  WorkflowActorBinding,
  WorkflowSourceOwnerBinding,
  WorkflowImplementationAssociation,
  WorkflowContractIdentity,
  WorkflowEventAssociation,
  WorkflowViewProfile,
  WorkflowPerspective,
  WorkflowViewProfileAdapter,
} from './types/profile';
export { digitalProductProfile } from './utils/systems/digitalProductProfile';
import { BrowserFetchProvider } from './utils/source/BrowserFetchProvider';
import { useSourceRegistry } from './utils/source/useSourceRegistry';
export type {
  WorkflowLocation,
  WorkflowLocationSelection,
  WorkflowCallSite,
  WorkflowActionAddress,
  WorkflowLocationJSON,
  WorkflowLocationStatus,
  WorkflowLocationAdapter,
  WorkflowLocationDecodeResult,
} from './types/location';
export type {
  SourceDocumentRequest,
  SourceDocumentContent,
  SourceDocumentProvider,
  ProvidedSourceProvenance,
  ExternalNavigationRequest,
} from './types/source';
export {
  encodeLocation,
  decodeLocation,
  readLocationURL,
  writeLocationURL,
  authoredDigest,
  createLocationAdapter,
} from './utils/location/codec';
import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react';

import {
  readLocationURL,
  writeLocationURL,
  encodeLocation,
  decodeLocation,
} from './utils/location/codec';
import { LocationHistoryContext } from './context/LocationHistoryContext';
import { CopyLinkContext, CopyLocationControl } from './context/CopyLinkContext';
import type { WorkflowLocation } from './types/location';
import { ArazzoUI } from './ArazzoUI';
import { JenticLogo } from './components/JenticLogo';
import { UploadIcon } from './components/UploadIcon';
import { ViewModeControl } from './components/ViewModeControl';
import { AdvancedTools } from './components/AdvancedTools';
import type { ArazzoUIProps, ArazzoUIRef, ViewerMode } from './types/index';
import type { ArazzoDocument } from './types/arazzo';

import './styles/index.css';

export type {
  ArazzoUIProps,
  ArazzoUIRef,
  ViewerMode,
  DiagramType,
  ViewerEvents,
  DocsViewConfig,
  DocumentationMetadata,
  WorkflowDocumentation,
  StepDocumentation,
  DocumentationSection,
  DocumentationSupport,
  DocumentationProvenance,
  DocumentationSourceBinding,
  DocumentationPrerequisite,
  ArazzoNodeType,
  ArazzoEdgeType,
  ConversionOptions,
  ArazzoNode,
  ArazzoNodeData,
  StepNodeData,
  WorkflowRefNodeData,
  StartNodeData,
  EndNodeData,
  WorkflowNodeData,
  ExternalWorkflowNodeData,
  ArazzoEdge,
  ArazzoEdgeData,
  RelationshipEdgeData,
  SequentialEdgeData,
  SuccessEdgeData,
  FailureEdgeData,
  RetryEdgeData,
  BundledSuccessEdgeData,
  BundledFailureEdgeData,
  BundledRetryEdgeData,
  ValidationError,
} from './types/index';
export type {
  ArazzoDocument,
  InfoObject,
  SourceDescription,
  Workflow,
  Step,
  Parameter,
  RequestBody,
  PayloadReplacement,
  SuccessAction,
  FailureAction,
  Criterion,
  CriterionExpressionType,
  ReusableObject,
  ComponentsObject,
  JSONSchema,
} from './types/arazzo';

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
  function ArazzoUIStandalone(props, ref) {
    const { initialView = 'docs', onViewChange, ...rest } = props;
    const guides = useStandaloneScenarios(props);
    const browserProvider = React.useMemo(() => new BrowserFetchProvider(), []);
    const [externalSource, setExternalSource] = useState<{
      uri: string;
      revision?: string;
      root?: string;
    }>();
    const [navigationError, setNavigationError] = useState('');
    const navigationController = useRef<AbortController>();
    const hostScenarioLocation = useRef<WorkflowLocation>();
    useEffect(() => {
      sourceGeneration.current += 1;
      navigationController.current?.abort();
      navigationRegistry.cancelAll();
    }, [guides.manifest]);
    useEffect(() => {
      if (guides.selection !== null) return;
      sourceGeneration.current += 1;
      navigationController.current?.abort();
      navigationRegistry.cancelAll();
    }, [guides.selection]);
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

    // ?document= query param takes precedence, #document= hash used for large inline content
    const queryParam = new URLSearchParams(globalThis.location.search).get('document');
    const hashParam = new URLSearchParams(globalThis.location.hash.slice(1)).get('document');
    const initialDocument =
      (queryParam || hashParam) === props.documentIdentity
        ? props.document
        : queryParam || hashParam || props.document;

    const [urlInput, setUrlInput] = useState(
      typeof initialDocument === 'string' && /^https?:\/\//i.test(initialDocument)
        ? initialDocument
        : '',
    );
    const [documentSource, setDocumentSource] = useState<ArazzoDocument | string>(initialDocument);
    const navigationRegistry = useSourceRegistry(
      props.sourceProvider ?? browserProvider,
      undefined,
      documentSource,
    );
    const [localIdentity, setLocalIdentity] = useState(
      () =>
        `urn:arazzo-ui:local:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    );
    const inlineSource =
      typeof documentSource !== 'string' ||
      /[\r\n]|^\s*[{[]|^\s*(?:arazzo|info|sourceDescriptions):/.test(documentSource);
    const hostSource = documentSource === props.document;
    const suppliedIdentity = hostSource ? props.documentIdentity : undefined;
    const documentIdentity =
      externalSource?.uri ?? suppliedIdentity ?? (inlineSource ? localIdentity : undefined);
    const documentRevision =
      externalSource?.revision ?? (hostSource ? props.documentRevision : undefined);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef(0);
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
    useEffect(() => {
      sourceGeneration.current += 1;
      navigationController.current?.abort();
      navigationRegistry.cancelAll();
      return () => {
        sourceGeneration.current += 1;
        navigationController.current?.abort();
        navigationRegistry.cancelAll();
      };
    }, [props.sourceProvider, props.document]);
    const addressable = (value: WorkflowLocation) =>
      !!suppliedIdentity || /^https?:\/\//i.test(value.document);
    const copy = async () => {
      const current = currentLocation.current;
      if (guides.selection && (!guides.uri || !/^https?:\/\//i.test(guides.uri))) {
        setShareMessage(
          'Publish the scenario manifest at an addressable URI before sharing this guide.',
        );
        return;
      }
      if (!current || !addressable(current)) {
        setShareMessage(
          'This content must be supplied again or published at an addressable source before a shareable link can reproduce it.',
        );
        return;
      }
      try {
        await navigator.clipboard.writeText(
          writeLocationURL(globalThis.location.href, current).href,
        );
        setShareMessage('Link copied.');
      } catch {
        setShareMessage('Could not copy the link. Clipboard access is unavailable.');
      }
    };
    const commitLocation = (value: WorkflowLocation) => {
      currentLocation.current = value;
      const url = addressable(value)
        ? writeLocationURL(globalThis.location.href, value)
        : new URL(globalThis.location.href);
      const guideState = value.extensions?.[SCENARIO_NAMESPACE];
      if (
        guideState &&
        typeof guideState === 'object' &&
        !Array.isArray(guideState) &&
        typeof guideState.manifestURI === 'string'
      )
        url.searchParams.set('scenarios', guideState.manifestURI);
      const previousLocation = globalThis.history.state?.arazzoLocation;
      const state = {
        ...globalThis.history.state,
        arazzoDocument: sourceRef.current,
        arazzoCallers: callerLocations.current,
        arazzoIdentity: documentIdentity,
        arazzoExternalSource: externalSource,
        arazzoLocation: value,
      };
      if (replaceNext.current) {
        replaceNext.current = false;
        globalThis.history.replaceState(state, '', url);
      } else if (
        url.href !== globalThis.location.href ||
        JSON.stringify(previousLocation) !== JSON.stringify(value)
      )
        globalThis.history.pushState(state, '', url);
    };
    useEffect(() => {
      const restore = (event: PopStateEvent) => {
        sourceGeneration.current += 1;
        navigationController.current?.abort();
        navigationRegistry.cancelAll();
        setNavigationError('');
        const url = new URL(globalThis.location.href);
        guides.restore(url);
        let decoded = readLocationURL(url);
        if (!decoded.location && !decoded.error && event.state?.arazzoLocation) {
          try {
            decoded = decodeLocation(encodeLocation(event.state.arazzoLocation));
          } catch {
            decoded = { error: 'Invalid workflow location in browser history.' };
          }
        }
        const source =
          url.searchParams.get('document') ||
          new URLSearchParams(url.hash.slice(1)).get('document');
        const document =
          source === props.documentIdentity
            ? props.document
            : (source ?? event.state?.arazzoDocument ?? props.document);
        replaceNext.current = true;
        currentLocation.current = undefined;
        setShareMessage('');
        if (typeof event.state?.arazzoIdentity === 'string')
          setLocalIdentity(event.state.arazzoIdentity);
        setExternalSource(event.state?.arazzoExternalSource);
        setDocumentSource(
          event.state?.arazzoExternalSource ? event.state.arazzoDocument : document,
        );
        setUrlInput(typeof document === 'string' && /^https?:\/\//i.test(document) ? document : '');
        setView(decoded.location?.view ?? initialView);
        const callers: WorkflowLocation[] = [];
        if (Array.isArray(event.state?.arazzoCallers))
          for (const caller of event.state.arazzoCallers.slice(0, 32)) {
            try {
              const decoded = decodeLocation(encodeLocation(caller));
              if (decoded.location) callers.push(decoded.location);
            } catch {
              /* invalid history addresses are ignored */
            }
          }
        callerLocations.current = callers;
        setHydration((current) => ({
          epoch: current.epoch + 1,
          location: decoded.location,
          error: decoded.error,
          callers,
        }));
      };
      globalThis.addEventListener('popstate', restore);
      return () => {
        sourceGeneration.current += 1;
        globalThis.removeEventListener('popstate', restore);
      };
    }, [props.document, props.documentIdentity, initialView]);
    useEffect(() => {
      if (hostDocumentRef.current === props.document) return;
      hostDocumentRef.current = props.document;
      const pending = hostScenarioLocation.current;
      const supplied =
        props.documentIdentity ??
        (typeof props.document === 'string' && /^https?:\/\//i.test(props.document)
          ? props.document
          : undefined);
      commitSource(
        props.document,
        undefined,
        guides.selection && pending?.document === supplied ? pending : undefined,
      );
      hostScenarioLocation.current = undefined;
      setUrlInput(
        typeof props.document === 'string' && /^https?:\/\//i.test(props.document)
          ? props.document
          : '',
      );
    }, [props.document]);

    const commitSource = (
      source: ArazzoDocument | string,
      provenance?: { uri: string; revision?: string; root?: string },
      guideLocation?: WorkflowLocation,
    ) => {
      sourceGeneration.current += 1;
      navigationController.current?.abort();
      navigationRegistry.cancelAll();
      setNavigationError('');
      if (!guideLocation) guides.setSelection(null);
      setExternalSource(provenance);
      currentLocation.current = undefined;
      replaceNext.current = true;
      setShareMessage('');
      const identity = `urn:arazzo-ui:local:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
      setLocalIdentity(identity);
      setDocumentSource(source);
      setHydration((current) => ({
        epoch: current.epoch + 1,
        location: guideLocation,
        error: undefined,
        callers: undefined,
      }));
      const url = new URL(globalThis.location.href);
      url.searchParams.delete('location');
      if (typeof source === 'string' && /^https?:\/\//i.test(source))
        url.searchParams.set('document', source);
      else url.searchParams.delete('document');
      const hash = new URLSearchParams(url.hash.slice(1));
      if (hash.has('document') || hash.has('location')) {
        hash.delete('document');
        hash.delete('location');
        url.hash = hash.toString();
      }
      globalThis.history.pushState(
        {
          ...globalThis.history.state,
          arazzoDocument: source,
          arazzoIdentity: provenance?.uri ?? identity,
          arazzoExternalSource: provenance,
          arazzoLocation: undefined,
          arazzoCallers: [],
        },
        '',
        url,
      );
    };

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

    const handleExplore = useCallback(() => {
      const trimmed = urlInput.trim();
      if (trimmed) {
        commitSource(trimmed);
      }
    }, [urlInput]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleExplore();
        }
      },
      [handleExplore],
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

    const handleFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          loadFile(file);
        }
        // reset so the same file can be re-selected
        e.target.value = '';
      },
      [loadFile],
    );

    const handleDragEnter = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const types = Array.from(e.dataTransfer.types);
      if (!types.includes('Files')) return;
      dragCounter.current += 1;
      if (dragCounter.current === 1) {
        setDragging(true);
      }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) {
        setDragging(false);
      }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
          loadFile(file);
        }
      },
      [loadFile],
    );

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
        documentIdentity ??
        (typeof documentSource === 'string' && /^https?:\/\//i.test(documentSource)
          ? documentSource
          : undefined);
      navigationController.current?.abort();
      navigationRegistry.cancelAll();
      const generation = ++sourceGeneration.current;
      if (location.document === currentIdentity) return;
      const controller = new AbortController();
      navigationController.current = controller;
      setNavigationError('');
      try {
        const acquired = await navigationRegistry.acquire(location.document, location.revision);
        if (controller.signal.aborted || generation !== sourceGeneration.current) return;
        if (location.revision !== undefined && acquired.revision !== location.revision)
          throw new Error('Scenario document revision mismatch.');
        commitSource(
          typeof acquired.content === 'string'
            ? acquired.content
            : JSON.stringify(acquired.content),
          { uri: acquired.retrievalURI, revision: acquired.revision },
          location,
        );
        setUrlInput(acquired.retrievalURI);
      } catch (error) {
        if (!controller.signal.aborted && generation === sourceGeneration.current)
          setNavigationError(
            `Guide document unavailable: ${error instanceof Error ? error.message : String(error)}`,
          );
      }
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
          <div
            className={`arazzo-ui-standalone ${props.className ?? ''}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              position: 'relative',
              ...props.style,
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,.json,.arazzo"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div
              className="arazzo-ui-toolbar"
              style={{
                position: 'relative',
                minHeight: '60px',
                flexShrink: 0,
                padding: '0 16px',
                borderBottom: '1px solid #333',
                background: '#1B1B1B',
              }}
            >
              <a
                href="https://jentic.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Supported by Jentic"
                className="arazzo-toolbar-logo"
              >
                <JenticLogo style={{ height: '36px' }} />
              </a>
              <div className="arazzo-toolbar-source">
                <input
                  type="text"
                  aria-label="Arazzo document URL"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter Arazzo document URL..."
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '6px 12px',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: '#2a2a2a',
                    color: '#fff',
                  }}
                />
                <button
                  onClick={handleExplore}
                  style={{
                    padding: '6px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#94C83D',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Explore
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload Arazzo document"
                  title="Upload Arazzo document"
                  style={{
                    padding: '6px',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    background: '#2a2a2a',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                  }}
                >
                  <UploadIcon size={16} />
                </button>
              </div>
              <div className="arazzo-toolbar-mode">
                <CopyLocationControl />
                <ViewModeControl value={view} onChange={handleViewChange} />
              </div>
            </div>
            {hydration.error && <p role="status">{hydration.error}</p>}
            {navigationError && <p role="status">{navigationError}</p>}
            <AdvancedTools
              reveal={
                !!(
                  guides.manifest ||
                  guides.selection ||
                  guides.input ||
                  props.viewProfile ||
                  props.viewProfileAdapter
                )
              }
              status={guides.message}
              setup={
                <form
                  className="arazzo-scenario-loader"
                  onSubmit={(event) => {
                    event.preventDefault();
                    guides.load();
                  }}
                >
                  <label>
                    Scenario manifest URL{' '}
                    <input
                      type="url"
                      aria-label="Scenario manifest URL"
                      value={guides.input}
                      onChange={(event) => guides.setInput(event.target.value)}
                      placeholder="Explicit scenario manifest URL"
                    />
                  </label>
                  <button type="submit" disabled={!guides.input.trim()}>
                    Load scenario manifest
                  </button>
                  {guides.message && <p role="status">{guides.message}</p>}
                </form>
              }
            >
              <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
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
                    navigationController.current?.abort();
                    navigationRegistry.cancelAll();
                    const controller = new AbortController();
                    navigationController.current = controller;
                    const generation = ++sourceGeneration.current;
                    setNavigationError('');
                    try {
                      const acquired = await navigationRegistry.acquire(
                        request.documentUri,
                        request.revision,
                      );
                      if (controller.signal.aborted || generation !== sourceGeneration.current)
                        return;
                      if (request.revision !== undefined && acquired.revision !== request.revision)
                        throw new Error(
                          `Revision mismatch: requested ${request.revision}, got ${acquired.revision ?? 'no revision'}`,
                        );
                      commitSource(
                        typeof acquired.content === 'string'
                          ? acquired.content
                          : JSON.stringify(acquired.content),
                        {
                          uri: acquired.retrievalURI,
                          revision: acquired.revision,
                          root: request.workflowId,
                        },
                      );
                      setUrlInput(acquired.retrievalURI);
                    } catch (error) {
                      if (!controller.signal.aborted && generation === sourceGeneration.current)
                        setNavigationError(error instanceof Error ? error.message : String(error));
                    }
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
              </div>
            </AdvancedTools>
            {dragging && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(148, 200, 61, 0.1)',
                  border: '2px dashed #94C83D',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    background: '#1B1B1B',
                    color: '#94C83D',
                    padding: '16px 32px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  Drop Arazzo document here
                </div>
              </div>
            )}
          </div>
        </CopyLinkContext.Provider>
      </LocationHistoryContext.Provider>
    );
  },
);

/** Self-contained document viewer or opt-in supplied catalog. @public */
export const ArazzoUIStandalone = forwardRef<ArazzoUIRef, ArazzoUIStandaloneProps>(
  function ArazzoUIStandalone(props, ref) {
    const [href, setHref] = useState(globalThis.location.href);
    useEffect(() => {
      const pop = () => setHref(globalThis.location.href);
      globalThis.addEventListener('popstate', pop);
      return () => globalThis.removeEventListener('popstate', pop);
    }, []);
    const input = props.catalog ?? new URL(href).searchParams.get('catalog');
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
