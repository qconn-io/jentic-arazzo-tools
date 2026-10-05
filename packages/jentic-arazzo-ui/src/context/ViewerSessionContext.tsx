import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useArazzoViewer } from './ArazzoViewerContext';
import type { SequenceRow } from '../utils/sequence/sequenceModel';

type WorkflowView = 'docs' | 'sequence' | 'flowchart';
interface CallerFrame {
  documentId: string;
  root: string;
  row: SequenceRow;
  expansion: Record<string, boolean>;
  view: WorkflowView;
  callee: string;
}
interface DetailSelection {
  workflowId: string;
  stepId?: string;
  row?: SequenceRow;
}
interface Session {
  expansions: Record<string, Record<string, boolean>>;
  views: Record<string, WorkflowView>;
  setView: (root: string, view: WorkflowView) => void;
  setExpansion: (root: string, id: string, expanded: boolean) => void;
  selectedRow?: SequenceRow;
  details: DetailSelection | null;
  inspectRow: (row: SequenceRow, origin?: HTMLElement) => void;
  inspectStep: (workflowId: string, stepId: string, origin?: HTMLElement) => void;
  closeDetails: () => void;
  followCall: (root: string, row: SequenceRow) => void;
  backToCaller: () => void;
  trail: CallerFrame[];
  focusRowId?: string;
  consumeFocus: () => void;
  clearTrail: () => void;
}
const ViewerSessionContext = createContext<Session | null>(null);
export const useViewerSession = () => {
  const session = useContext(ViewerSessionContext);
  if (!session) throw new Error('Viewer session is unavailable');
  return session;
};

export function ViewerSessionProvider({ children }: { children: React.ReactNode }) {
  const viewer = useArazzoViewer();
  const { model, activeWorkflowId, selectedNodeId } = viewer;
  const [expansions, setExpansions] = useState<Session['expansions']>({});
  const [views, setViews] = useState<Session['views']>({});
  const [selectedRow, setSelectedRow] = useState<SequenceRow>();
  const [details, setDetails] = useState<DetailSelection | null>(null);
  const [trail, setTrail] = useState<CallerFrame[]>([]);
  const [focusRowId, setFocusRowId] = useState<string>();
  const origin = useRef<HTMLElement>();
  const requestedSelection = useRef<string>();
  const pending = useRef<{
    destination: string;
    frame: CallerFrame;
    back: boolean;
    selectionRequestVersion: number;
  }>();
  const previous = useRef({ active: activeWorkflowId, selection: selectedNodeId });

  useEffect(() => {
    const prior = previous.current;
    previous.current = { active: activeWorkflowId, selection: selectedNodeId };
    if (
      pending.current &&
      pending.current.selectionRequestVersion !== viewer.selectionRequestVersion
    )
      pending.current = undefined;
    const request = pending.current;
    if (request && activeWorkflowId === request.destination) {
      if (
        prior.selection !== selectedNodeId &&
        selectedNodeId !== null &&
        selectedNodeId !== undefined &&
        !Array.from(model.nodeIds.get(request.destination)?.values() ?? []).includes(selectedNodeId)
      ) {
        pending.current = undefined;
        setTrail([]);
        return;
      }
      pending.current = undefined;
      if (request.back) {
        setTrail((frames) => frames.slice(0, -1));
        setExpansions((value) => ({ ...value, [request.frame.root]: request.frame.expansion }));
        setViews((value) => ({ ...value, [request.frame.root]: request.frame.view }));
        setSelectedRow(request.frame.row);
        setFocusRowId(request.frame.row.id);
        const stepId =
          request.frame.row.workflowId === request.frame.root
            ? request.frame.row.step?.stepId
            : request.frame.row.path[0]?.[1];
        requestedSelection.current = stepId
          ? model.nodeIds.get(request.frame.root)?.get(stepId)
          : undefined;
        viewer.navigateToTarget({
          kind: 'local-step',
          role: 'call',
          reference: stepId ?? request.frame.root,
          workflowId: request.frame.root,
          stepId,
          navigable: true,
        });
      } else {
        setTrail((frames) => [...frames, request.frame]);
        setSelectedRow(undefined);
        setDetails(null);
      }
    } else if (prior.active !== activeWorkflowId) {
      pending.current = undefined;
      setTrail([]);
      setSelectedRow(undefined);
      setDetails(null);
      setFocusRowId(undefined);
    } else if (prior.selection !== selectedNodeId) {
      if (request) {
        pending.current = undefined;
        setTrail([]);
      }
      const node = viewer.nodes.find((n) => n.id === selectedNodeId);
      const owner = node && viewer.getNodeOwner(node);
      if (owner && node && (node.data.type === 'step' || node.data.type === 'workflowRef')) {
        const stepId = node.data.step.stepId;
        if (selectedNodeId !== requestedSelection.current) {
          setSelectedRow(undefined);
          setDetails({ workflowId: owner, stepId });
        }
      } else if (!selectedNodeId) setDetails(null);
    }
  }, [activeWorkflowId, selectedNodeId, model, viewer.selectionRequestVersion]);

  const inspectStep = (
    workflowId: string,
    stepId: string,
    control?: HTMLElement,
    row?: SequenceRow,
  ) => {
    pending.current = undefined;
    origin.current = control;
    setDetails({ workflowId, stepId, row });
    setSelectedRow(row);
    setFocusRowId(undefined);
    const publicStep = workflowId === activeWorkflowId ? stepId : row?.path[0]?.[1];
    const nodeId =
      publicStep && activeWorkflowId
        ? model.nodeIds.get(activeWorkflowId)?.get(publicStep)
        : undefined;
    if (nodeId) {
      requestedSelection.current = nodeId;
      viewer.setSelectedNode(nodeId);
    }
  };
  const value: Session = {
    expansions,
    views,
    selectedRow,
    details,
    trail,
    focusRowId,
    consumeFocus: () => setFocusRowId(undefined),
    setView: (root, view) => setViews((current) => ({ ...current, [root]: view })),
    setExpansion: (root, id, expanded) =>
      setExpansions((current) => ({ ...current, [root]: { ...current[root], [id]: expanded } })),
    inspectRow: (row, control) => {
      if (row.step) inspectStep(row.workflowId, row.step.stepId, control, row);
      else {
        pending.current = undefined;
        origin.current = control;
        setDetails({ workflowId: row.workflowId, row });
        setSelectedRow(row);
      }
    },
    inspectStep,
    closeDetails: () => {
      setDetails(null);
      if (origin.current?.isConnected) origin.current.focus();
    },
    clearTrail: () => {
      pending.current = undefined;
      setTrail([]);
      setSelectedRow(undefined);
      setDetails(null);
      setFocusRowId(undefined);
    },
    followCall: (root, row) => {
      if (!row.target?.navigable || !row.target.workflowId || !row.step) return;
      pending.current = {
        selectionRequestVersion: viewer.selectionRequestVersion,
        destination: row.target.workflowId,
        back: false,
        frame: {
          documentId: model.documentId,
          root,
          row,
          expansion: expansions[root] ?? {},
          view: views[root] ?? 'sequence',
          callee: row.target.workflowId,
        },
      };
      viewer.navigateToTarget(row.target);
    },
    backToCaller: () => {
      const frame = trail.at(-1);
      if (!frame || frame.documentId !== model.documentId) return;
      pending.current = {
        destination: frame.root,
        frame,
        back: true,
        selectionRequestVersion: viewer.selectionRequestVersion,
      };
      viewer.navigateToTarget({
        kind: 'local-workflow',
        role: 'call',
        reference: frame.root,
        workflowId: frame.root,
        navigable: true,
      });
    },
  };
  return <ViewerSessionContext.Provider value={value}>{children}</ViewerSessionContext.Provider>;
}
