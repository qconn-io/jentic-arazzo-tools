import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type {
  ArazzoDocument,
  ArazzoNode,
  ArazzoEdge,
  ArazzoViewerContextValue,
  ViewerEvents,
} from '../types/index';
import { convertWorkflowToFlow, convertDocumentToFlow } from '../utils/conversion/index';
import { applySequentialLayout } from '../utils/sequentialLayout';
import { createSnapshot, inspect } from '../utils/inspection';
import type {
  DocumentSnapshot,
  InspectionResult,
  ClassifiedTarget,
  PendingSelection,
} from '../utils/inspection';
import { buildViewerModel, type ArazzoViewerModel } from '../utils/model/viewerModel';

interface InternalContext extends ArazzoViewerContextValue {
  snapshot: DocumentSnapshot;
  inspection: InspectionResult;
  model: ArazzoViewerModel;
  navigateToTarget: (target: ClassifiedTarget) => void;
  navigationDiagnostic: string | null;
  getNodeOwner: (node: ArazzoNode) => string | undefined;
}
const ArazzoViewerContext = createContext<InternalContext | null>(null);
export const useArazzoViewer = () => {
  const context = useContext(ArazzoViewerContext);
  if (!context) throw new Error('useArazzoViewer must be used within ArazzoViewerProvider');
  return context;
};
interface StandaloneProviderProps {
  document: ArazzoDocument;
  snapshot?: DocumentSnapshot;
  inspection?: InspectionResult;
  documentURL?: string | null;
  initialActiveWorkflowId?: string | null;
  initialSelectedNodeId?: string | null;
  events?: ViewerEvents;
  children: React.ReactNode;
}
type ProviderProps =
  StandaloneProviderProps | { value: ArazzoViewerContextValue; children: React.ReactNode };

function ownerLookup(
  node: ArazzoNode,
  model: ArazzoViewerModel,
  document: ArazzoDocument,
): string | undefined {
  if ('workflowId' in node.data && node.data.workflowId) return node.data.workflowId;
  const matches = model.workflows.filter((workflow) =>
    workflow.steps.some((step) => step.nodeId === node.id),
  );
  if (matches.length === 1) return matches[0].workflowId;
  // legacy injected nodes retain the original scoped converter identity.
  const legacy = document.workflows.filter((workflow) =>
    workflow.steps.some(
      (step) =>
        `${workflow._internalId || workflow.workflowId}-${step._internalId || step.stepId}` ===
        node.id,
    ),
  );
  return legacy.length === 1 ? legacy[0].workflowId : undefined;
}
function InjectedProvider({
  value,
  children,
}: {
  value: ArazzoViewerContextValue;
  children: React.ReactNode;
}) {
  const snapshot = useMemo(
    () => createSnapshot(value.document, { trustedInternalIds: true }),
    [value.document],
  );
  const inspection = useMemo(() => inspect(snapshot), [snapshot]);
  const model = useMemo(() => buildViewerModel(inspection), [inspection]);
  const [navigationDiagnostic, setDiagnostic] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const requestId = useRef(0);
  const cancelledRequest = useRef<number | null>(null);
  const previousControlled = useRef({
    workflow: value.activeWorkflowId,
    selection: value.selectedNodeId,
  });
  useEffect(() => {
    const previous = previousControlled.current;
    previousControlled.current = {
      workflow: value.activeWorkflowId,
      selection: value.selectedNodeId,
    };
    if (!pending) return;
    if (
      (previous.workflow !== value.activeWorkflowId &&
        value.activeWorkflowId !== pending.workflowId) ||
      (previous.selection !== value.selectedNodeId &&
        value.selectedNodeId !== model.nodeIds.get(pending.workflowId)?.get(pending.stepId))
    ) {
      cancelledRequest.current = pending.requestId;
      setPending(null);
    }
  }, [value.activeWorkflowId, value.selectedNodeId, pending, model]);
  useEffect(() => {
    if (!pending || cancelledRequest.current === pending.requestId) return;
    if (pending.documentId !== model.documentId) {
      setPending(null);
      return;
    }
    if (value.activeWorkflowId !== pending.workflowId) return;
    const nodeId = model.nodeIds.get(pending.workflowId)?.get(pending.stepId);
    const node = value.nodes.find((n) => n.id === nodeId);
    if (node) {
      value.setSelectedNode(node.id);
      setPending(null);
    }
  }, [model, pending, value]);
  const navigateToTarget = (target: ClassifiedTarget) => {
    setPending(null);
    if (!target.navigable || !target.workflowId) {
      setDiagnostic(target.reason || `Unavailable target: ${target.reference}`);
      return;
    }
    setDiagnostic(null);
    if (target.stepId)
      setPending({
        documentId: model.documentId,
        requestId: ++requestId.current,
        workflowId: target.workflowId,
        stepId: target.stepId,
      });
    if (target.workflowId !== value.activeWorkflowId) value.setActiveWorkflow(target.workflowId);
  };
  return (
    <ArazzoViewerContext.Provider
      value={{
        ...value,
        setSelectedNode: (id) => {
          setPending(null);
          value.setSelectedNode(id);
        },
        setActiveWorkflow: (id) => {
          setPending(null);
          value.setActiveWorkflow(id);
        },
        snapshot,
        inspection,
        model,
        navigationDiagnostic,
        navigateToTarget,
        getNodeOwner: (node) => ownerLookup(node, model, value.document),
      }}
    >
      {children}
    </ArazzoViewerContext.Provider>
  );
}
export const ArazzoViewerProvider: React.FC<ProviderProps> = (props) =>
  'value' in props ? <InjectedProvider {...props} /> : <StandaloneProvider {...props} />;

function StandaloneProvider({
  document: rawDocument,
  snapshot: suppliedSnapshot,
  inspection: suppliedInspection,
  documentURL = null,
  initialActiveWorkflowId,
  initialSelectedNodeId,
  events,
  children,
}: StandaloneProviderProps) {
  const snapshot = useMemo(
    () => suppliedSnapshot ?? createSnapshot(rawDocument),
    [suppliedSnapshot, rawDocument],
  );
  const inspection = useMemo(
    () => suppliedInspection ?? inspect(snapshot),
    [suppliedInspection, snapshot],
  );
  const model = useMemo(() => buildViewerModel(inspection), [inspection]);
  const document = model.document;
  const [localWorkflow, setLocalWorkflow] = useState<string | null>(() =>
    initialActiveWorkflowId === undefined
      ? (model.workflows[0]?.workflowId ?? null)
      : initialActiveWorkflowId,
  );
  const activeWorkflowId =
    initialActiveWorkflowId === undefined ? localWorkflow : initialActiveWorkflowId;
  const activeWorkflow =
    document.workflows?.find((workflow) => workflow.workflowId === activeWorkflowId) ?? null;
  const [localSelected, setLocalSelected] = useState<string | null>(initialSelectedNodeId ?? null);
  const selectedNodeId =
    initialSelectedNodeId === undefined ? localSelected : initialSelectedNodeId;
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [navigationDiagnostic, setDiagnostic] = useState<string | null>(null);
  const requestId = useRef(0);
  const cancelledRequest = useRef<number | null>(null);
  const previousModel = useRef(model);
  const previousControlledWorkflow = useRef(initialActiveWorkflowId);
  const previousControlledSelection = useRef(initialSelectedNodeId);

  const requestWorkflow = useCallback(
    (id: string | null) => {
      if (id !== null && !model.workflowsById.has(id)) {
        setDiagnostic(`Missing workflow: ${id}`);
        return;
      }
      if (id === activeWorkflowId) return;
      if (initialActiveWorkflowId === undefined) setLocalWorkflow(id);
      if (initialSelectedNodeId === undefined) setLocalSelected(null);
      events?.onWorkflowSelect?.(id ?? '');
    },
    [model, activeWorkflowId, initialActiveWorkflowId, initialSelectedNodeId, events],
  );
  const setActiveWorkflow = useCallback(
    (id: string | null) => {
      setPending(null);
      setDiagnostic(null);
      requestWorkflow(id);
    },
    [requestWorkflow],
  );
  const navigateToTarget = useCallback(
    (target: ClassifiedTarget) => {
      setPending(null);
      if (!target.navigable || !target.workflowId || !model.workflowsById.has(target.workflowId)) {
        setDiagnostic(target.reason || `Unavailable target: ${target.reference}`);
        return;
      }
      if (target.stepId && !model.stepsByWorkflow.get(target.workflowId)?.has(target.stepId)) {
        setDiagnostic(`Missing step: ${target.workflowId}.${target.stepId}`);
        return;
      }
      setDiagnostic(null);
      if (target.stepId)
        setPending({
          documentId: model.documentId,
          requestId: ++requestId.current,
          workflowId: target.workflowId,
          stepId: target.stepId,
        });
      requestWorkflow(target.workflowId);
    },
    [model, requestWorkflow],
  );
  const graph = useMemo(() => {
    if (model.support.semanticInspection === 'unsupported') return { nodes: [], edges: [] };
    if (!activeWorkflow) return convertDocumentToFlow(document, { model });
    const converted = convertWorkflowToFlow(activeWorkflow, {}, document, model);
    return applySequentialLayout(converted.nodes, converted.edges);
  }, [model, document, activeWorkflow]);
  const wiredGraph = useMemo(
    () => ({
      ...graph,
      nodes: graph.nodes.map((node) => {
        if (node.type === 'workflow' && !('referenceKind' in node.data))
          return {
            ...node,
            data: {
              ...node.data,
              onClick: (reference: string) =>
                navigateToTarget(
                  inspection.classifyTarget(reference, {
                    role: 'call',
                    workflowId: activeWorkflowId ?? undefined,
                  }),
                ),
            },
          };
        return node;
      }),
    }),
    [graph, navigateToTarget, inspection, activeWorkflowId],
  );
  const [overrides, setOverrides] = useState<{
    graph: typeof wiredGraph;
    nodes: ArazzoNode[];
    edges: ArazzoEdge[];
  } | null>(null);
  const nodes = overrides?.graph === wiredGraph ? overrides.nodes : wiredGraph.nodes;
  const edges = overrides?.graph === wiredGraph ? overrides.edges : wiredGraph.edges;
  const setNodes = useCallback(
    (next: ArazzoNode[]) => setOverrides({ graph: wiredGraph, nodes: next, edges }),
    [wiredGraph, edges],
  );
  const setEdges = useCallback(
    (next: ArazzoEdge[]) => setOverrides({ graph: wiredGraph, nodes, edges: next }),
    [wiredGraph, nodes],
  );
  const setSelectedNode = useCallback(
    (id: string | null) => {
      setPending(null);
      if (initialSelectedNodeId === undefined) setLocalSelected(id);
      if (id) {
        const node = nodes.find((n) => n.id === id);
        if (node) events?.onNodeSelect?.(id, node);
      }
    },
    [nodes, events, initialSelectedNodeId],
  );

  useEffect(() => {
    if (previousModel.current !== model) {
      previousModel.current = model;
      setPending(null);
      setDiagnostic(null);
      if (initialSelectedNodeId === undefined) setLocalSelected(null);
      if (
        initialActiveWorkflowId === undefined &&
        activeWorkflowId !== null &&
        !model.workflowsById.has(activeWorkflowId)
      )
        setLocalWorkflow(model.workflows[0]?.workflowId ?? null);
    }
  }, [model, initialActiveWorkflowId, initialSelectedNodeId, activeWorkflowId]);
  useEffect(() => {
    if (previousControlledWorkflow.current !== initialActiveWorkflowId) {
      previousControlledWorkflow.current = initialActiveWorkflowId;
      if (pending && initialActiveWorkflowId !== pending.workflowId) {
        cancelledRequest.current = pending.requestId;
        setPending(null);
      }
    }
    if (previousControlledSelection.current !== initialSelectedNodeId) {
      previousControlledSelection.current = initialSelectedNodeId;
      if (
        pending &&
        initialSelectedNodeId !== model.nodeIds.get(pending.workflowId)?.get(pending.stepId)
      ) {
        cancelledRequest.current = pending.requestId;
        setPending(null);
      }
    }
  }, [initialActiveWorkflowId, initialSelectedNodeId, pending, model]);
  useEffect(() => {
    if (
      !pending ||
      cancelledRequest.current === pending.requestId ||
      pending.documentId !== model.documentId ||
      pending.workflowId !== activeWorkflowId
    )
      return;
    const targetId = model.nodeIds.get(pending.workflowId)?.get(pending.stepId);
    if (!targetId) {
      setDiagnostic(`Missing step: ${pending.workflowId}.${pending.stepId}`);
      setPending(null);
      return;
    }
    const node = nodes.find((n) => n.id === targetId);
    if (!node) return;
    setPending(null);
    if (initialSelectedNodeId === undefined) setLocalSelected(node.id);
    events?.onNodeSelect?.(node.id, node);
  }, [pending, model, activeWorkflowId, nodes, initialSelectedNodeId, events]);
  const value: InternalContext = {
    document,
    documentURL,
    activeWorkflowId,
    setActiveWorkflow,
    activeWorkflow,
    selectedNodeId,
    setSelectedNode,
    nodes,
    edges,
    setNodes,
    setEdges,
    readOnly: true,
    events,
    snapshot,
    inspection,
    model,
    navigateToTarget,
    navigationDiagnostic,
    getNodeOwner: (node) => ownerLookup(node, model, rawDocument),
  };
  return <ArazzoViewerContext.Provider value={value}>{children}</ArazzoViewerContext.Provider>;
}
