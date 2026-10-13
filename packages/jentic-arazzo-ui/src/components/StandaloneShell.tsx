import React, { useState, useCallback, useRef } from 'react';

import { CopyLocationControl } from '../context/CopyLinkContext';
import { JenticLogo } from './JenticLogo';
import { UploadIcon } from './UploadIcon';
import { GuideSetup } from './AdvancedTools';
import {
  readLocationURL,
  writeLocationURL,
  encodeLocation,
  decodeLocation,
} from '../utils/location/codec';
import { SCENARIO_NAMESPACE } from '../utils/scenario/manifest';
import type { StandaloneExternalSource } from '../utils/location/resolve';
import type { useStandaloneScenarios } from '../utils/scenario/useStandaloneScenarios';
import type { WorkflowLocation } from '../types/location';
import type { ArazzoDocument } from '../types/arazzo';

export const isHttpUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

export const createLocalDocumentIdentity = () =>
  `urn:arazzo-ui:local:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

export function readInitialStandaloneDocument(
  hostDocument: ArazzoDocument | string,
  hostIdentity?: string,
): ArazzoDocument | string {
  // ?document= query param takes precedence, #document= hash used for large inline content
  const queryParam = new URLSearchParams(globalThis.location.search).get('document');
  const hashParam = new URLSearchParams(globalThis.location.hash.slice(1)).get('document');
  return (queryParam || hashParam) === hostIdentity
    ? hostDocument
    : queryParam || hashParam || hostDocument;
}

export async function copyStandaloneShareLink({
  current,
  addressable,
  guides,
}: {
  current: WorkflowLocation | undefined;
  addressable: boolean;
  guides: ReturnType<typeof useStandaloneScenarios>;
}): Promise<string> {
  if (guides.selection && !isHttpUrl(guides.uri))
    return 'Publish the scenario manifest at an addressable URI before sharing this guide.';
  if (!current || !addressable)
    return 'This content must be supplied again or published at an addressable source before a shareable link can reproduce it.';
  try {
    await navigator.clipboard.writeText(writeLocationURL(globalThis.location.href, current).href);
    return 'Link copied.';
  } catch {
    return 'Could not copy the link. Clipboard access is unavailable.';
  }
}

export function commitBrowserHistoryLocation({
  location,
  addressable,
  source,
  callers,
  documentIdentity,
  externalSource,
  replaceNext,
}: {
  location: WorkflowLocation;
  addressable: boolean;
  source: ArazzoDocument | string;
  callers: WorkflowLocation[];
  documentIdentity: string | undefined;
  externalSource: StandaloneExternalSource | undefined;
  replaceNext: React.MutableRefObject<boolean>;
}) {
  const url = addressable
    ? writeLocationURL(globalThis.location.href, location)
    : new URL(globalThis.location.href);
  const guideState = location.extensions?.[SCENARIO_NAMESPACE];
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
    arazzoDocument: source,
    arazzoCallers: callers,
    arazzoIdentity: documentIdentity,
    arazzoExternalSource: externalSource,
    arazzoLocation: location,
  };
  if (replaceNext.current) {
    replaceNext.current = false;
    globalThis.history.replaceState(state, '', url);
  } else if (
    url.href !== globalThis.location.href ||
    JSON.stringify(previousLocation) !== JSON.stringify(location)
  )
    globalThis.history.pushState(state, '', url);
}

export function pushBrowserSourceHistory(
  source: ArazzoDocument | string,
  identity: string,
  provenance?: StandaloneExternalSource,
) {
  const url = new URL(globalThis.location.href);
  url.searchParams.delete('location');
  if (isHttpUrl(source)) url.searchParams.set('document', source);
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
}

export function readBrowserPopState(
  event: PopStateEvent,
  hostDocument: ArazzoDocument | string,
  hostIdentity?: string,
) {
  const url = new URL(globalThis.location.href);
  let decoded = readLocationURL(url);
  if (!decoded.location && !decoded.error && event.state?.arazzoLocation) {
    try {
      decoded = decodeLocation(encodeLocation(event.state.arazzoLocation));
    } catch {
      decoded = { error: 'Invalid workflow location in browser history.' };
    }
  }
  const sourceParam =
    url.searchParams.get('document') || new URLSearchParams(url.hash.slice(1)).get('document');
  const document =
    sourceParam === hostIdentity
      ? hostDocument
      : (sourceParam ?? event.state?.arazzoDocument ?? hostDocument);
  const callers: WorkflowLocation[] = [];
  if (Array.isArray(event.state?.arazzoCallers))
    for (const caller of event.state.arazzoCallers.slice(0, 32)) {
      try {
        const entry = decodeLocation(encodeLocation(caller));
        if (entry.location) callers.push(entry.location);
      } catch {
        /* invalid history addresses are ignored */
      }
    }
  return {
    url,
    decoded,
    document,
    callers,
    identity:
      typeof event.state?.arazzoIdentity === 'string' ? event.state.arazzoIdentity : undefined,
    externalSource: event.state?.arazzoExternalSource as StandaloneExternalSource | undefined,
    externalDocument: event.state?.arazzoDocument as ArazzoDocument | string | undefined,
  };
}

export function useFileDropzone(onLoadFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const latestLoadFile = useRef(onLoadFile);
  latestLoadFile.current = onLoadFile;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) latestLoadFile.current(file);
    // reset so the same file can be re-selected
    e.target.value = '';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) latestLoadFile.current(file);
  }, []);

  return {
    dragging,
    fileInputRef,
    handleFileChange,
    dropzoneProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}

export function StandaloneHeader({
  urlInput,
  onUrlInputChange,
  onExplore,
  onUploadClick,
}: {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  onExplore: () => void;
  onUploadClick: () => void;
}) {
  return (
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
      <details className="arazzo-toolbar-source-disclosure">
        <summary>Load document</summary>
        <div className="arazzo-toolbar-source">
          <input
            type="text"
            aria-label="Arazzo document URL"
            value={urlInput}
            onChange={(e) => onUrlInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onExplore();
            }}
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
            onClick={onExplore}
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
            onClick={onUploadClick}
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
      </details>
      <div className="arazzo-toolbar-mode">
        <CopyLocationControl />
      </div>
    </div>
  );
}

const GUIDE_FORMAT_EXAMPLE = JSON.stringify(
  {
    version: 1,
    id: 'reading-guide',
    scenarios: [
      {
        id: 'read-workflow',
        document: 'arazzo.yaml',
        workflow: 'client-journey',
        expected: 'Read the authored purchase exchange.',
        evidence: 'Author-provided description; inspection only.',
      },
    ],
  },
  null,
  2,
);

export function StandaloneGuideForm({
  guides,
  onOpenGuidedExample,
}: {
  guides: ReturnType<typeof useStandaloneScenarios>;
  onOpenGuidedExample: () => void;
}) {
  const guideHelpId = React.useId();
  return (
    <form
      className="arazzo-scenario-loader"
      onSubmit={(event) => {
        event.preventDefault();
        guides.load();
      }}
    >
      <label>
        Guide file URL{' '}
        <input
          type="url"
          aria-label="Guide file URL"
          aria-describedby={guideHelpId}
          value={guides.input}
          onChange={(event) => guides.setInput(event.target.value)}
          placeholder="Guide file URL"
        />
      </label>
      <p id={guideHelpId}>
        A guide file is a separate JSON document containing walkthrough descriptions and links to
        workflow steps.
      </p>
      <p>Reading a guide does not run the workflow.</p>
      <details className="arazzo-guide-format">
        <summary>Guide file format</summary>
        <pre data-testid="guide-format-example">{GUIDE_FORMAT_EXAMPLE}</pre>
        <p>
          Legacy arrays of scenarios are also accepted, using the same scenario fields without the
          versioned envelope. Relative document links resolve against the guide file URL.
        </p>
        <a href="https://github.com/jentic/jentic-arazzo-tools/blob/main/packages/jentic-arazzo-ui/README.md#authored-scenario-guides">
          Developer guide schema
        </a>
        <p>The guided example opens the digital-product workflow and its separate guide file.</p>
        <button type="button" onClick={onOpenGuidedExample}>
          Open guided example
        </button>
      </details>
      <button type="submit" disabled={!guides.input.trim()}>
        Load guides
      </button>
    </form>
  );
}

export function StandaloneShell({
  className,
  style,
  urlInput,
  onUrlInputChange,
  onExplore,
  onLoadFile,
  hydrationError,
  navigationError,
  guides,
  onOpenGuidedExample,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  onExplore: () => void;
  onLoadFile: (file: File) => void;
  hydrationError?: string;
  navigationError?: string;
  guides: ReturnType<typeof useStandaloneScenarios>;
  onOpenGuidedExample: () => void;
  children: React.ReactNode;
}) {
  const { dragging, fileInputRef, handleFileChange, dropzoneProps } = useFileDropzone(onLoadFile);
  return (
    <div
      className={`arazzo-ui-standalone ${className ?? ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
        ...style,
      }}
      {...dropzoneProps}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,.json,.arazzo"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <StandaloneHeader
        urlInput={urlInput}
        onUrlInputChange={onUrlInputChange}
        onExplore={onExplore}
        onUploadClick={() => fileInputRef.current?.click()}
      />
      {hydrationError && <p role="status">{hydrationError}</p>}
      {navigationError && <p role="status">{navigationError}</p>}
      <GuideSetup
        status={
          guides.message && (
            <div className="arazzo-guide-status">
              <p role="status">{guides.message}</p>
              {guides.failed && <button onClick={guides.retry}>Retry guide loading</button>}
            </div>
          )
        }
        setup={<StandaloneGuideForm guides={guides} onOpenGuidedExample={onOpenGuidedExample} />}
      >
        <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>{children}</div>
      </GuideSetup>
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
  );
}
