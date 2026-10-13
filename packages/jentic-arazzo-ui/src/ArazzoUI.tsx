import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useState,
  useEffect,
  useContext,
} from 'react';
import { ReactFlowProvider } from 'reactflow';

import { ScenarioProvider } from './context/ScenarioContext';
import { ScenarioPanel } from './components/ScenarioPanel';
import { loadDocument } from './utils/loading/loadDocument';
import { inspect } from './utils/inspection';
import type { DocumentSnapshot } from './utils/inspection/types';
import { ArazzoViewerProvider, useArazzoViewer } from './context/ArazzoViewerContext';
import { DiagramView, DiagramViewRef } from './components/DiagramView';
import { DocsView } from './components/DocsView';
import { WorkflowNavigation } from './components/WorkflowNavigation';
import { ReadingControls } from './components/ReadingControls';
import { CallerNavigation } from './components/CallerNavigation';
import { SelectionDetails } from './components/SelectionDetails';
import { WorkflowLocationBridge } from './components/WorkflowLocationBridge';
import { InspectionStatus } from './components/InspectionStatus';
import { ReadingIntentContext } from './context/ReadingIntentContext';
import { SystemsProvider, useSystems } from './context/SystemsContext';
import { SystemsView } from './components/SystemsView';
import type { ArazzoDocument, ArazzoUIProps, ArazzoUIRef, ViewerMode } from './types/index';
import './styles/index.css';

export { ArazzoWorkflowReview } from './ArazzoWorkflowReview';
export { compareWorkflowRevisions, exportWorkflowReview } from './utils/review';
export { ArazzoCatalog } from './ArazzoCatalog';
export { normalizeCatalogManifest } from './utils/catalog/manifest';
export { digitalProductProfile } from './utils/systems/digitalProductProfile';
export {
  encodeLocation,
  decodeLocation,
  readLocationURL,
  writeLocationURL,
  authoredDigest,
  createLocationAdapter,
} from './utils/location/codec';
export type * from './types/index';

function detectUrl(value: ArazzoDocument | string): string | null {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim()) ? value.trim() : null;
}

/**
 * ArazzoUI - Interactive viewer for Arazzo workflow specifications
 *
 * Renders diagram and documentation views of an Arazzo document.
 * Supports click-to-select, workflow switching, zoom/pan.
 * No document mutation capability.
 *
 * The `document` prop accepts:
 * - An `ArazzoDocument` object (rendered immediately)
 * - A JSON or YAML string (parsed via \@jentic/arazzo-parser)
 * - A file path or HTTP(S) URL (fetched and parsed via \@jentic/arazzo-parser)
 *
 * @public
 */
export const ArazzoUI = forwardRef<ArazzoUIRef, ArazzoUIProps>(function ArazzoUI(props, ref) {
  const [localView, setLocalView] = useState<ViewerMode>();
  const standaloneImplicit = useContext(ReadingIntentContext);
  const implicitSequence =
    standaloneImplicit ??
    (props.view === undefined &&
      props.location === undefined &&
      props.defaultLocation === undefined);
  const {
    document: rawDocument,
    view = localView ?? props.location?.view ?? props.defaultLocation?.view ?? 'docs',
    activeWorkflowId: controlledWorkflowId,
    selectedNodeId: controlledSelectedNodeId,
    className,
    style,
    onNodeSelect,
    onEdgeSelect,
    onWorkflowSelect,
    onViewChange,
  } = props;

  const documentURL = detectUrl(rawDocument);
  const loadedInput = useRef<ArazzoDocument | string>();
  const [parsedDocument, setParsedDocument] = useState<ArazzoDocument | null>(null);
  const [snapshot, setSnapshot] = useState<DocumentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const workflowRequestId = useRef(0);
  const [workflowRequest, setWorkflowRequest] = useState<{ id: number; root: string | null }>();

  useEffect(() => {
    let cancelled = false;

    setLocalView(undefined);
    setLoading(true);
    setWorkflowRequest(undefined);
    setError(null);

    const baseURI =
      typeof rawDocument === 'string' && /^https?:\/\//i.test(rawDocument)
        ? rawDocument
        : props.baseURI;

    loadDocument(rawDocument, { baseURI })
      .then((loaded) => {
        if (!cancelled) {
          loadedInput.current = rawDocument;
          setParsedDocument(loaded.document);
          setSnapshot(loaded.snapshot);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setParsedDocument(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rawDocument, props.baseURI]);

  const events = useMemo(
    () => ({
      onNodeSelect,
      onEdgeSelect,
      onWorkflowSelect: (id: string) => {
        onWorkflowSelect?.(id);
        if (
          controlledWorkflowId !== undefined &&
          id !== (controlledWorkflowId ?? '') &&
          props.onLocationChange
        )
          setWorkflowRequest({ id: ++workflowRequestId.current, root: id || null });
      },
      onViewChange: (next: ViewerMode) => {
        if (props.view === undefined && props.location === undefined) setLocalView(next);
        onViewChange?.(next);
      },
    }),
    [
      onNodeSelect,
      onEdgeSelect,
      onWorkflowSelect,
      onViewChange,
      props.view,
      props.location,
      controlledWorkflowId,
      props.onLocationChange,
    ],
  );

  const inspection = useMemo(() => (snapshot ? inspect(snapshot) : null), [snapshot]);

  const unsupportedRequest = useRef<string>();
  useEffect(() => {
    const requested = props.location ?? props.defaultLocation;
    if (!snapshot || !requested || inspection?.support.semanticInspection !== 'unsupported') return;
    const key = JSON.stringify([snapshot.id, requested]);
    if (unsupportedRequest.current === key) return;
    unsupportedRequest.current = key;
    props.onLocationStatus?.({
      state: 'stale',
      location: requested,
      message: 'This inspection profile cannot restore workflow locations.',
    });
  }, [snapshot, inspection, props.location, props.defaultLocation, props.onLocationStatus]);

  if (loading && !parsedDocument) {
    return (
      <div
        className={`arazzo-ui ${className ?? ''}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: '14px',
          ...style,
        }}
      >
        Loading document...
      </div>
    );
  }

  if (error || !parsedDocument) {
    return (
      <div
        className={`arazzo-ui ${className ?? ''}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          ...style,
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            padding: '16px 24px',
            borderRadius: '8px',
            border: '1px solid #fca5a5',
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        >
          {error || 'Failed to load document'}
        </div>
      </div>
    );
  }

  if (inspection?.support.semanticInspection === 'unsupported') {
    return (
      <RawInspectionView
        ref={ref}
        className={className}
        style={style}
        snapshot={snapshot!}
        messages={inspection.diagnostics.map((d) => d.message)}
      />
    );
  }

  return (
    <div
      className={`arazzo-ui ${className ?? ''}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        visibility: loadedInput.current === rawDocument ? undefined : 'hidden',
        ...style,
      }}
    >
      <ArazzoViewerProvider
        document={parsedDocument}
        snapshot={snapshot ?? undefined}
        inspection={inspection ?? undefined}
        documentURL={documentURL}
        initialActiveWorkflowId={controlledWorkflowId}
        initialSelectedNodeId={controlledSelectedNodeId}
        events={events}
        sourceProvider={props.sourceProvider}
        apiDescriptionLoading={props.apiDescriptionLoading}
        onExternalNavigation={props.onExternalNavigation}
        initialReadingView={implicitSequence ? 'sequence' : 'docs'}
      >
        <SystemsProvider props={props}>
          <ScenarioProvider props={props}>
            <ReactFlowProvider>
              <ArazzoUIInner
                ref={ref}
                view={view}
                locationProps={loadedInput.current === rawDocument ? props : undefined}
                workflowRequest={workflowRequest}
              />
            </ReactFlowProvider>
          </ScenarioProvider>
        </SystemsProvider>
      </ArazzoViewerProvider>
    </div>
  );
});

interface ArazzoUIInnerProps {
  locationProps?: ArazzoUIProps;
  workflowRequest?: { id: number; root: string | null };
  view: ViewerMode;
}

const ArazzoUIInner = forwardRef<ArazzoUIRef, ArazzoUIInnerProps>(function ArazzoUIInner(
  { view, locationProps, workflowRequest },
  ref,
) {
  const diagramRef = useRef<DiagramViewRef>(null);
  const ctx = useArazzoViewer();
  const systems = useSystems();

  useImperativeHandle(
    ref,
    () => ({
      fitView: () => diagramRef.current?.fitView(),
      setZoom: (level: number) => diagramRef.current?.setZoom(level),
      getDocument: () => structuredClone(ctx.snapshot.document),
      setActiveWorkflow: (id: string | null) => ctx.setActiveWorkflow(id),
      selectStep: (stepId: string) => {
        const node = ctx.nodes.find(
          (n) => n.data?.type === 'step' && 'step' in n.data && n.data.step.stepId === stepId,
        );
        if (node) {
          ctx.setSelectedNode(node.id);
        }
      },
      clearSelection: () => ctx.setSelectedNode(null),
      getActiveWorkflowId: () => ctx.activeWorkflowId,
      getSelectedStepId: () => {
        if (!ctx.selectedNodeId) return null;
        const node = ctx.nodes.find((n) => n.id === ctx.selectedNodeId);
        if (node?.data?.type === 'step' && 'step' in node.data) {
          return node.data.step.stepId;
        }
        return null;
      },
    }),
    [ctx],
  );

  const showDiagram = view === 'diagram' || view === 'split';
  const showDocs = view === 'docs' || view === 'split';

  return (
    <div className="arazzo-viewer-shell">
      <WorkflowNavigation />
      <ReadingControls view={view} />
      <details className="arazzo-reader-help">
        <summary>Help and optional views</summary>
        <p>
          Sequence diagrams and step descriptions show authored workflow declarations; they do not
          run operations.
        </p>
        {!systems?.enabled && (
          <p>
            This document has no supplied system participant information. Systems view requires a
            supplied profile or configured adapter.
          </p>
        )}
        {systems?.enabled && (
          <p>
            Systems view uses supplied viewer metadata to describe participants and implementation
            associations.
          </p>
        )}
        <p>
          Guided walkthroughs use separately supplied author descriptions and require deliberate
          loading in the standalone viewer.
        </p>
      </details>
      {systems?.enabled && systems.perspective === 'workflow' && systems.selected && (
        <button onClick={systems.returnToSystems}>Restore Systems perspective</button>
      )}
      {systems?.enabled && systems.scene.diagnostics.length > 0 && (
        <details className="arazzo-systems-diagnostics">
          <summary>Supplied system information has limitations.</summary>
          {systems.scene.diagnostics.map((message, index) => (
            <p role="status" key={index}>
              {message}
            </p>
          ))}
        </details>
      )}
      <InspectionStatus />
      {locationProps && <ScenarioPanel props={locationProps} />}
      {locationProps && (
        <WorkflowLocationBridge
          props={locationProps}
          view={view}
          workflowRequest={workflowRequest}
        />
      )}
      <CallerNavigation />
      <div className="arazzo-viewer-panes">
        {systems?.perspective === 'systems' ? (
          <SystemsView />
        ) : (
          <>
            {showDiagram && (
              <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
                <DiagramView ref={diagramRef} showWorkflowTabs={false} />
              </div>
            )}
            {showDocs && (
              <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'auto' }}>
                <DocsView />
              </div>
            )}
          </>
        )}
      </div>
      <SelectionDetails />
    </div>
  );
});

const RawInspectionView = forwardRef<
  ArazzoUIRef,
  { snapshot: DocumentSnapshot; messages: string[] } & Pick<ArazzoUIProps, 'className' | 'style'>
>(function RawInspectionView({ snapshot, messages, className, style }, ref) {
  useImperativeHandle(
    ref,
    () => ({
      getDocument: () => structuredClone(snapshot.document),
      fitView: () => {},
      setZoom: () => {},
      setActiveWorkflow: () => {},
      selectStep: () => {},
      clearSelection: () => {},
      getActiveWorkflowId: () => null,
      getSelectedStepId: () => null,
    }),
    [snapshot],
  );
  return (
    <div
      className={`arazzo-ui ${className ?? ''}`}
      style={{ width: '100%', height: '100%', overflow: 'auto', padding: 24, ...style }}
    >
      <p>{messages.join(' ')}</p>
      <pre>{JSON.stringify(snapshot.document, null, 2)}</pre>
    </div>
  );
});
