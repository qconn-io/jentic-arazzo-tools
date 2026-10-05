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
export const ArazzoUIStandalone = forwardRef<ArazzoUIRef, ArazzoUIStandaloneProps>(
  function ArazzoUIStandalone(props, ref) {
    const { initialView = 'docs', onViewChange, ...rest } = props;
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
    const [localIdentity, setLocalIdentity] = useState(
      () =>
        `urn:arazzo-ui:local:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    );
    const inlineSource =
      typeof documentSource !== 'string' ||
      /[\r\n]|^\s*[{[]|^\s*(?:arazzo|info|sourceDescriptions):/.test(documentSource);
    const hostSource = documentSource === props.document;
    const suppliedIdentity = hostSource ? props.documentIdentity : undefined;
    const documentIdentity = suppliedIdentity ?? (inlineSource ? localIdentity : undefined);
    const documentRevision = hostSource ? props.documentRevision : undefined;
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
    const sourceRef = useRef(documentSource);
    sourceRef.current = documentSource;
    const addressable = (value: WorkflowLocation) =>
      !!suppliedIdentity || /^https?:\/\//i.test(value.document);
    const copy = async () => {
      const current = currentLocation.current;
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
      const previousLocation = globalThis.history.state?.arazzoLocation;
      const state = {
        ...globalThis.history.state,
        arazzoDocument: sourceRef.current,
        arazzoCallers: callerLocations.current,
        arazzoIdentity: documentIdentity,
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
        const url = new URL(globalThis.location.href);
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
        setDocumentSource(document);
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
    const commitSource = (source: ArazzoDocument | string) => {
      sourceGeneration.current += 1;
      currentLocation.current = undefined;
      replaceNext.current = true;
      setShareMessage('');
      const identity = `urn:arazzo-ui:local:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
      setLocalIdentity(identity);
      setDocumentSource(source);
      setHydration((current) => ({
        epoch: current.epoch + 1,
        location: undefined,
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
          arazzoIdentity: identity,
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
                    outline: 'none',
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
            <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
              <ArazzoUI
                key={hydration.epoch}
                ref={ref}
                {...rest}
                documentIdentity={documentIdentity}
                documentRevision={documentRevision}
                defaultLocation={hydration.location}
                onLocationChange={props.onLocationChange}
                document={documentSource}
                view={view}
                onViewChange={handleViewChange}
                className={undefined}
                style={undefined}
              />
            </div>
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
