import React, {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  useReactFlow,
  useNodesInitialized,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import {
  StepNode,
  WorkflowRefNode,
  StartNode,
  EndNode,
  WorkflowNode,
  ExternalWorkflowNode,
} from '../nodes/index';
import {
  RelationshipEdge,
  SequentialEdge,
  SuccessEdge,
  FailureEdge,
  RetryEdge,
  BundledSuccessEdge,
  BundledFailureEdge,
  BundledRetryEdge,
} from '../edges/index';
import { WorkflowTabs } from './WorkflowTabs';
import { ArazzoNode, ArazzoEdge } from '../types/index';
import { ErrorBoundary } from './ErrorBoundary';
import './WorkflowTabs.css';

const nodeTypes = {
  step: StepNode,
  workflowRef: WorkflowRefNode,
  start: StartNode,
  end: EndNode,
  workflow: WorkflowNode,
  externalWorkflow: ExternalWorkflowNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
  sequential: SequentialEdge,
  success: SuccessEdge,
  failure: FailureEdge,
  retry: RetryEdge,
  'bundled-success': BundledSuccessEdge,
  'bundled-failure': BundledFailureEdge,
  'bundled-retry': BundledRetryEdge,
};

export interface DiagramViewRef {
  fitView: () => void;
  setZoom: (level: number) => void;
}

export interface DiagramViewProps {
  /** Show workflow tabs for switching between workflows */
  showWorkflowTabs?: boolean;
}

/**
 * DiagramView - React Flow diagram wrapper for Arazzo workflows
 */
export const DiagramView = forwardRef<DiagramViewRef, DiagramViewProps>(function DiagramView(
  { showWorkflowTabs = true },
  ref,
) {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    events,
    selectedNodeId,
    setSelectedNode,
    activeWorkflowId,
    model,
    navigationDiagnostic,
  } = useArazzoViewer();
  const reactFlow = useReactFlow();

  const [ready, setReady] = useState(false);
  const nodesInitialized = useNodesInitialized();
  const focused = useRef<string | null>(null);
  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    fitView: () => {
      reactFlow.fitView({ padding: 0.2 });
    },
    setZoom: (level: number) => {
      reactFlow.zoomTo(level);
    },
  }));

  const onInit = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready || !nodesInitialized || nodes.length === 0) return;
    const node = selectedNodeId
      ? nodes.find((n) => n.id === selectedNodeId)
      : nodes.find((n) => n.type === 'start') || nodes[0];
    if (!node) return;
    const key = JSON.stringify([model.documentId, activeWorkflowId, selectedNodeId ?? 'default']);
    if (focused.current === key) return;
    const timer = setTimeout(() => {
      const zoom = selectedNodeId ? reactFlow.getZoom() : 0.8;
      reactFlow.setCenter(
        node.position.x + (node.width ?? 420) / 2,
        node.position.y + (node.height ?? 200) / 2 + (selectedNodeId ? 0 : 250 / zoom),
        { zoom, duration: selectedNodeId ? 300 : 0 },
      );
      focused.current = key;
    }, 50);
    return () => clearTimeout(timer);
  }, [
    ready,
    nodesInitialized,
    nodes,
    selectedNodeId,
    activeWorkflowId,
    model.documentId,
    reactFlow,
  ]);

  // Store current nodes/edges in refs for stable callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(applyNodeChanges(changes, nodesRef.current) as ArazzoNode[]);
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edgesRef.current) as ArazzoEdge[]);
    },
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: (typeof nodes)[0]) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode, events],
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: (typeof edges)[0]) => {
      // Navigate to target node for goto conditionals
      if (edge.data?.type === 'success' || edge.data?.type === 'failure') {
        const action = edge.data.action;
        const isEnd = action?.type === 'end';
        const isRetry = action?.type === 'retry';

        if (!isEnd && !isRetry && edge.target) {
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (targetNode && targetNode.position) {
            setSelectedNode(edge.target);
          }
        }
      }

      if (events?.onEdgeSelect) {
        events.onEdgeSelect(edge.id, edge);
      }
    },
    [events, nodes, reactFlow, setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Handle double-click to center on node
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: (typeof nodes)[0]) => {
      const nodePosition = node.position;
      if (nodePosition) {
        reactFlow.setCenter(nodePosition.x + 150, nodePosition.y + 100, { zoom: 1, duration: 300 });
      }
    },
    [reactFlow],
  );

  // Memoize nodes with selection state
  const nodesWithSelection = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId],
  );

  return (
    <div
      className="arazzo-diagram-view"
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Workflow Tabs */}
      {showWorkflowTabs && <WorkflowTabs />}
      <p style={{ margin: '6px 12px', fontSize: 12 }}>
        {model.orderLabel}. {model.support.limitations.join(' ')} {navigationDiagnostic}
      </p>

      {/* React Flow Canvas */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ErrorBoundary>
          <ReactFlow
            nodes={nodesWithSelection}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={onInit}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable={true}
            nodesConnectable={false}
            defaultEdgeOptions={{
              type: 'straight',
              style: { strokeWidth: 2 },
            }}
            panOnScroll={true}
            selectionOnDrag={false}
            panActivationKeyCode={null}
            selectionKeyCode={null}
            deleteKeyCode={null}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </ErrorBoundary>
      </div>
    </div>
  );
});

export default DiagramView;
