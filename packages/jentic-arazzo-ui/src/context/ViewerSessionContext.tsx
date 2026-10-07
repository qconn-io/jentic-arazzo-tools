import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useArazzoViewer } from './ArazzoViewerContext';
import type { SequenceRow } from '../utils/sequence/sequenceModel';

import type { WorkflowLocationStatus } from '../types/location';
import type { ResolvedLocation } from '../utils/location/resolve';

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
  authoredOnly?: boolean;
  workflowId: string;
  stepId?: string;
  row?: SequenceRow;
}
interface Session {
  locationStatus?: WorkflowLocationStatus;
  setLocationStatus: (status: WorkflowLocationStatus) => void;
  cancelLocationRestoration: () => void;
  expansions: Record<string, Record<string, boolean>>;
  views: Record<string, WorkflowView>;
  setView: (root: string, view: WorkflowView) => void;
  setExpansion: (root: string, id: string, expanded: boolean) => void;
  selectedRow?: SequenceRow;
  details: DetailSelection | null;
  inspectRow: (row: SequenceRow, origin?: HTMLElement) => void;
  inspectStep: (workflowId: string, stepId: string, origin?: HTMLElement) => void;
  openAuthoredStep: (workflowId: string, stepId: string, origin?: HTMLElement) => void;
  closeDetails: () => void;
  restoreDetailsFocus: (fallback?: HTMLElement) => void;
  followCall: (root: string, row: SequenceRow) => void;
  backToCaller: () => void;
  trail: CallerFrame[];
  focusRowId?: string;
  consumeFocus: () => void;
  clearTrail: () => void;
  restoreLocation: (
    result: ResolvedLocation,
    view: WorkflowView,
    callers?: ResolvedLocation[],
    origin?: HTMLElement,
  ) => void;
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
  const [locationStatus, setLocationStatus] = useState<WorkflowLocationStatus>();
  const [expansions, setExpansions] = useState<Session['expansions']>({});
  const [views, setViews] = useState<Session['views']>({});
  const [selectedRow, setSelectedRow] = useState<SequenceRow>();
  const [details, setDetails] = useState<DetailSelection | null>(null);
  const [trail, setTrail] = useState<CallerFrame[]>([]);
  const [focusRowId, setFocusRowId] = useState<string>();
  const origin = useRef<HTMLElement>();
  const requestedSelection = useRef<string>();
  const authoredRequest = useRef<{
    workflowId: string;
    stepId: string;
    control?: HTMLElement;
    version: number;
  }>();
  const pending = useRef<{
    destination: string;
    frame: CallerFrame;
    back: boolean;
    selectionRequestVersion: number;
  }>();
  const restoration = useRef<{
    result: ResolvedLocation;
    view: WorkflowView;
    callers?: ResolvedLocation[];
  }>();
  const applyLocation = (
    result: ResolvedLocation,
    view: WorkflowView,
    callers: ResolvedLocation[] = [],
  ) => {
    const root = result.root;
    setTrail(
      callers.flatMap((caller) =>
        caller.root && caller.row?.kind === 'call'
          ? [
              {
                documentId: model.documentId,
                root: caller.root,
                row: caller.row,
                expansion: caller.expansions,
                view: caller.status.location?.subview ?? 'sequence',
                callee: caller.row.target?.workflowId ?? '',
              },
            ]
          : [],
      ),
    );
    pending.current = undefined;
    authoredRequest.current = undefined;
    if (root !== null) {
      setViews((current) => ({ ...current, [root]: view }));
      setExpansions((current) => ({ ...current, [root]: result.expansions }));
    }
    const row = result.row;
    setSelectedRow(result.authoredOnly ? undefined : row);
    setDetails(
      row
        ? {
            workflowId: row.workflowId,
            stepId: row.step?.stepId,
            row: result.authoredOnly && !row.action ? undefined : row,
            authoredOnly: result.authoredOnly,
          }
        : null,
    );
    setFocusRowId(result.focusRowId);
    const publicStep = row && (row.workflowId === root ? row.step?.stepId : row.path[0]?.[1]);
    const nodeId = root && publicStep ? model.nodeIds.get(root)?.get(publicStep) : undefined;
    requestedSelection.current = nodeId;
    if (viewer.selectedNodeId !== (nodeId ?? null)) viewer.setSelectedNode(nodeId ?? null);
  };
  const previous = useRef({ active: activeWorkflowId, selection: selectedNodeId });

  useEffect(() => {
    const prior = previous.current;
    previous.current = { active: activeWorkflowId, selection: selectedNodeId };
    if (restoration.current && activeWorkflowId === restoration.current.result.root) {
      const request = restoration.current;
      restoration.current = undefined;
      applyLocation(request.result, request.view, request.callers);
      return;
    }
    const authored = authoredRequest.current;
    if (authored) {
      if (
        authored.version !== viewer.selectionRequestVersion ||
        (prior.selection !== selectedNodeId &&
          (activeWorkflowId !== authored.workflowId ||
            (selectedNodeId != null &&
              selectedNodeId !== model.nodeIds.get(authored.workflowId)?.get(authored.stepId)))) ||
        (prior.active !== activeWorkflowId && activeWorkflowId !== authored.workflowId)
      ) {
        authoredRequest.current = undefined;
      } else if (activeWorkflowId === authored.workflowId) {
        authoredRequest.current = undefined;
        inspectStep(authored.workflowId, authored.stepId, authored.control);
        return;
      }
    }
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
          origin.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
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
    restoration.current = undefined;
    pending.current = undefined;
    authoredRequest.current = undefined;
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
    locationStatus,
    setLocationStatus,
    cancelLocationRestoration: () => {
      restoration.current = undefined;
    },
    expansions,
    views,
    restoreLocation: (result, view, callers, control) => {
      origin.current = control;
      pending.current = undefined;
      authoredRequest.current = undefined;
      if (activeWorkflowId === result.root) applyLocation(result, view, callers);
      else {
        restoration.current = { result, view, callers };
        viewer.setActiveWorkflow(result.root);
      }
    },
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
        authoredRequest.current = undefined;
        origin.current = control;
        setDetails({ workflowId: row.workflowId, row });
        setSelectedRow(row);
      }
    },
    inspectStep,
    openAuthoredStep: (workflowId, stepId, control) => {
      pending.current = undefined;
      setTrail([]);
      setSelectedRow(undefined);
      if (workflowId === activeWorkflowId) inspectStep(workflowId, stepId, control);
      else {
        authoredRequest.current = {
          workflowId,
          stepId,
          control,
          version: viewer.selectionRequestVersion,
        };
        viewer.navigateToTarget({
          kind: 'local-step',
          role: 'call',
          reference: `${workflowId}.${stepId}`,
          workflowId,
          stepId,
          navigable: true,
        });
      }
    },
    closeDetails: () => {
      setDetails(null);
    },
    restoreDetailsFocus: (fallback) => {
      let control = origin.current;
      if (control?.isConnected) {
        let ancestor: HTMLElement | null = control;
        while (ancestor) {
          if (
            ancestor.hidden ||
            ancestor.hasAttribute('inert') ||
            ancestor.matches(':disabled') ||
            (ancestor.tagName === 'DETAILS' &&
              !ancestor.hasAttribute('open') &&
              !(control.tagName === 'SUMMARY' && control.parentElement === ancestor)) ||
            getComputedStyle(ancestor).display === 'none' ||
            getComputedStyle(ancestor).visibility === 'hidden'
          ) {
            control = undefined;
            break;
          }
          ancestor = ancestor.parentElement;
        }
      } else control = undefined;
      (control ?? fallback)?.focus();
    },
    clearTrail: () => {
      pending.current = undefined;
      authoredRequest.current = undefined;
      setTrail([]);
      setSelectedRow(undefined);
      setDetails(null);
      setFocusRowId(undefined);
    },
    followCall: (root, row) => {
      authoredRequest.current = undefined;
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
