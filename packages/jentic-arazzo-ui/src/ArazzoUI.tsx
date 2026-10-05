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
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useState,
  useEffect,
} from 'react';
import { ReactFlowProvider } from 'reactflow';
import { loadDocument } from './utils/loading/loadDocument';
import { inspect } from './utils/inspection';
import type { DocumentSnapshot } from './utils/inspection/types';

import { ArazzoViewerProvider, useArazzoViewer } from './context/ArazzoViewerContext';
import { DiagramView, DiagramViewRef } from './components/DiagramView';
import { DocsView } from './components/DocsView';
import { WorkflowNavigation } from './components/WorkflowNavigation';
import { CallerNavigation } from './components/CallerNavigation';
import { SelectionDetails } from './components/SelectionDetails';
import { WorkflowLocationBridge } from './components/WorkflowLocationBridge';
import { InspectionStatus } from './components/InspectionStatus';
import type { ArazzoDocument, ArazzoUIProps, ArazzoUIRef, ViewerMode } from './types/index';

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

import './styles/index.css';

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
  const {
    document: rawDocument,
    view = props.location?.view ?? props.defaultLocation?.view ?? 'docs',
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

    setLoading(true);
    setWorkflowRequest(undefined);
    setError(null);

    loadDocument(rawDocument, { baseURI: globalThis.document?.baseURI })
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
  }, [rawDocument]);

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
      onViewChange,
    }),
    [
      onNodeSelect,
      onEdgeSelect,
      onWorkflowSelect,
      onViewChange,
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
      >
        <ReactFlowProvider>
          <ArazzoUIInner
            ref={ref}
            view={view}
            locationProps={loadedInput.current === rawDocument ? props : undefined}
            workflowRequest={workflowRequest}
          />
        </ReactFlowProvider>
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
      <InspectionStatus />
      {locationProps && (
        <WorkflowLocationBridge
          props={locationProps}
          view={view}
          workflowRequest={workflowRequest}
        />
      )}
      <CallerNavigation />
      <div className="arazzo-viewer-panes">
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
      </div>
      <SelectionDetails />
    </div>
  );
});

const RawInspectionView = forwardRef<
  ArazzoUIRef,
  { snapshot: DocumentSnapshot; messages: string[] }
>(function RawInspectionView({ snapshot, messages }, ref) {
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
    <div className="arazzo-ui" style={{ overflow: 'auto', padding: 24 }}>
      <p>{messages.join(' ')}</p>
      <pre>{JSON.stringify(snapshot.document, null, 2)}</pre>
    </div>
  );
});
