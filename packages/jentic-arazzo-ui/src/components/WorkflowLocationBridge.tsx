import { useScenario } from '../context/ScenarioContext';
import { SCENARIO_NAMESPACE, resolveScenarioWaypoint } from '../utils/scenario/manifest';
import { useSystems, SYSTEMS_NAMESPACE } from '../context/SystemsContext';
import React, { useEffect, useRef, useState, useContext } from 'react';
import type { ArazzoUIProps, ViewerMode, WorkflowLocation, WorkflowLocationStatus } from '../types';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { LocationHistoryContext } from '../context/LocationHistoryContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import { authoredDigest, encodeLocation } from '../utils/location/codec';
import { actionAddress, resolveLocation, rowOccurrence } from '../utils/location/resolve';

const selectionKey = (value: WorkflowLocation['selection']) =>
  JSON.stringify(
    value && [
      value.kind,
      value.workflowId,
      value.stepId,
      value.occurrence?.map((site) => [site.workflowId, site.stepId]),
      value.kind === 'action'
        ? [
            value.action.document,
            value.action.pointer,
            value.action.usePointer,
            value.action.channel,
            value.action.index,
            value.action.name,
          ]
        : null,
    ],
  );
export function WorkflowLocationBridge({
  props,
  view,
  workflowRequest,
}: {
  props: ArazzoUIProps;
  view: ViewerMode;
  workflowRequest?: { id: number; root: string | null };
}) {
  const guide = useScenario();
  const guideKey = JSON.stringify(guide?.selection);
  const guideExtensions = (original: WorkflowLocation['extensions']) => {
    const value = { ...original };
    delete value[SCENARIO_NAMESPACE];
    if (guide?.selection) value[SCENARIO_NAMESPACE] = { ...guide.selection };
    return value;
  };
  const history = useContext(LocationHistoryContext);
  const systems = useSystems();
  const systemsExtensionKey = JSON.stringify(systems?.extension);
  const viewer = useArazzoViewer();
  const session = useViewerSession();
  const latest = useRef({ props, viewer, session });
  latest.current = { props, viewer, session };
  const initial = useRef(props.defaultLocation);
  if (guide?.request) initial.current = undefined;
  const request = props.location ?? guide?.request?.location ?? initial.current;
  const source =
    props.documentIdentity ??
    viewer.snapshot.retrievalURI ??
    viewer.documentURL ??
    viewer.snapshot.id;
  const [digest, setDigest] = useState<{ snapshot: typeof viewer.snapshot; value: string }>();
  const [status, setStatus] = useState<WorkflowLocationStatus>();
  const restored = useRef<string>();
  const expected = useRef<WorkflowLocation>();
  const suspended = useRef(false);
  const emitted = useRef<string>();
  const lastRequested = useRef<string>();
  const extensions = useRef(request?.extensions);
  const emitStatus = (value: WorkflowLocationStatus) => {
    setStatus(value);
    latest.current.session.setLocationStatus(value);
    latest.current.props.onLocationStatus?.(value);
  };
  const enabled = !!(request || props.onLocationChange || history || guide);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    authoredDigest(viewer.snapshot.authoredDocument)
      .then((value) => {
        if (!cancelled) setDigest({ snapshot: viewer.snapshot, value });
      })
      .catch(() => {
        if (!cancelled)
          emitStatus({
            state: 'invalid',
            message:
              'Content digest unavailable. A secure browser context is required to share workflow links.',
          });
      });
    return () => {
      cancelled = true;
    };
  }, [viewer.snapshot, enabled]);
  let requestKey: string | undefined;
  let invalid: string | undefined;
  try {
    if (request) requestKey = encodeLocation(request);
  } catch (error) {
    invalid = String(error);
  }
  const readyDigest = digest?.snapshot === viewer.snapshot ? digest.value : undefined;
  useEffect(() => {
    if (!readyDigest) return;
    const key = JSON.stringify([
      requestKey,
      guide?.request?.id,
      invalid,
      source,
      readyDigest,
      props.documentRevision,
      props.activeWorkflowId,
      props.selectedNodeId,
      props.view,
      props.perspective,
      props.viewProfile,
      props.viewProfileAdapter,
    ]);
    if (restored.current === key) return;
    restored.current = key;
    expected.current = undefined;
    latest.current.session.cancelLocationRestoration();
    suspended.current = false;
    if (invalid) {
      suspended.current = true;
      emitStatus({ state: 'invalid', message: invalid });
      return;
    }
    if (!request) return;
    const point = guide?.manifest.manifest?.scenarios
      .find((s) => s.id === guide.selection?.scenarioId)
      ?.waypoints?.find((w) => w.id === guide.selection?.waypointId);
    const sourceState = { document: source, revision: props.documentRevision, digest: readyDigest };
    const result =
      point && guide?.request?.location === request
        ? resolveScenarioWaypoint(
            viewer.model,
            viewer.snapshot.authoredDocument,
            { ...point, location: request },
            sourceState,
          )
        : resolveLocation(viewer.model, request, sourceState);
    if (result.status.state === 'stale' && point?.focus) result.row = undefined;
    if (result.status.state === 'document-request') {
      suspended.current = true;
      emitStatus(result.status);
      return;
    }
    const requestedSystems = request.extensions?.[SYSTEMS_NAMESPACE];
    if (
      props.perspective !== undefined &&
      requestedSystems &&
      typeof requestedSystems === 'object' &&
      !Array.isArray(requestedSystems) &&
      requestedSystems.perspective !== props.perspective
    ) {
      suspended.current = true;
      emitStatus({
        state: 'conflict',
        location: request,
        message: 'Systems location conflicts with explicitly controlled perspective.',
      });
      return;
    }
    const publicStep =
      result.row &&
      (result.row.workflowId === result.root ? result.row.step?.stepId : result.row.path[0]?.[1]);
    const nodeId =
      result.root && publicStep
        ? viewer.model.nodeIds.get(result.root)?.get(publicStep)
        : undefined;
    if (
      (props.activeWorkflowId !== undefined && props.activeWorkflowId !== result.root) ||
      (props.selectedNodeId !== undefined && props.selectedNodeId !== (nodeId ?? null)) ||
      (props.view !== undefined && props.view !== request.view)
    ) {
      suspended.current = true;
      emitStatus({
        state: 'conflict',
        location: request,
        message:
          'Workflow location conflicts with explicitly controlled workflow, node or view props.',
      });
      return;
    }
    const notices: string[] = [];
    if (
      systems?.enabled &&
      props.perspective === undefined &&
      !Object.hasOwn(request.extensions ?? {}, SYSTEMS_NAMESPACE)
    )
      systems.restore(null);
    for (const [namespace, value] of Object.entries(request.extensions ?? {})) {
      const adapter = latest.current.props.locationAdapters?.find((a) => a.namespace === namespace);
      try {
        if (
          !(namespace === SCENARIO_NAMESPACE
            ? guide?.restore(value)
            : namespace === SYSTEMS_NAMESPACE
              ? systems?.restore(value)
              : adapter?.restore(value))
        )
          notices.push(`Unavailable location extension: ${namespace}`);
      } catch {
        notices.push(`Unavailable location extension: ${namespace}`);
      }
    }
    extensions.current = request.extensions;
    expected.current = {
      ...request,
      root: result.root,
      ...(result.row ? {} : { selection: undefined }),
    };
    const callers = (history?.callers ?? []).map((caller) =>
      resolveLocation(viewer.model, caller, {
        document: source,
        revision: props.documentRevision,
        digest: readyDigest,
      }),
    );
    for (const caller of callers)
      if (caller.status.state !== 'restored')
        notices.push(`Unavailable caller context: ${caller.status.message}`);
    latest.current.session.restoreLocation(
      result,
      request.subview,
      callers.filter((caller) => caller.status.state === 'restored'),
      guide?.requestOrigin,
    );
    emitStatus({ ...result.status, notices });
  }, [
    requestKey,
    guide?.request?.id,
    invalid,
    source,
    readyDigest,
    props.documentRevision,
    props.activeWorkflowId,
    props.selectedNodeId,
    props.view,
    props.perspective,
    props.viewProfile,
    props.viewProfileAdapter,
    viewer.model,
  ]);

  useEffect(() => {
    if (history?.requestedLocation)
      lastRequested.current = encodeLocation(history.requestedLocation);
  }, [history?.requestedLocation]);
  const handledWorkflowRequest = useRef<number>();
  useEffect(() => {
    if (
      !readyDigest ||
      !workflowRequest ||
      invalid ||
      props.activeWorkflowId === undefined ||
      workflowRequest.root === props.activeWorkflowId ||
      handledWorkflowRequest.current === workflowRequest.id
    )
      return;
    handledWorkflowRequest.current = workflowRequest.id;
    const requested: WorkflowLocation = {
      version: 1,
      document: source,
      digest: readyDigest,
      ...(props.documentRevision ? { revision: props.documentRevision } : {}),
      root: workflowRequest.root,
      view,
      subview: session.views[workflowRequest.root ?? ''] ?? 'docs',
      ...(extensions.current || systems?.extension || guide
        ? {
            extensions: {
              ...guideExtensions(extensions.current),
              ...(systems?.extension ? { [SYSTEMS_NAMESPACE]: systems.extension } : {}),
            },
          }
        : {}),
    };
    lastRequested.current = encodeLocation(requested);
    latest.current.props.onLocationChange?.(requested);
    if (
      props.location &&
      props.location.document === source &&
      props.location.root === props.activeWorkflowId
    ) {
      const result = resolveLocation(viewer.model, props.location, {
        document: source,
        revision: props.documentRevision,
        digest: readyDigest,
      });
      expected.current = {
        ...props.location,
        root: result.root,
        ...(result.row ? {} : { selection: undefined }),
      };
      latest.current.session.restoreLocation(result, props.location.subview);
    }
  }, [
    workflowRequest,
    readyDigest,
    source,
    props.activeWorkflowId,
    props.documentRevision,
    invalid,
    view,
    session.views,
  ]);

  useEffect(() => {
    if (!readyDigest || suspended.current) return;
    const selected = session.details;
    const detail =
      selected &&
      (selected.row
        ? (selected.workflowId === viewer.activeWorkflowId &&
            rowOccurrence(selected.row).length === 0) ||
          rowOccurrence(selected.row)[0]?.[0] === viewer.activeWorkflowId
        : selected.workflowId === viewer.activeWorkflowId)
        ? selected
        : null;
    const row = detail?.row;
    const current: WorkflowLocation = {
      version: 1,
      document: source,
      ...(props.documentRevision ? { revision: props.documentRevision } : {}),
      digest: readyDigest,
      root: viewer.activeWorkflowId,
      view,
      subview: session.views[viewer.activeWorkflowId ?? ''] ?? 'docs',
      ...(extensions.current || systems?.extension || guide
        ? {
            extensions: {
              ...guideExtensions(extensions.current),
              ...(systems?.extension ? { [SYSTEMS_NAMESPACE]: systems.extension } : {}),
            },
          }
        : {}),
      ...(detail?.stepId && systems?.perspective !== 'systems'
        ? {
            selection: {
              workflowId: detail.workflowId,
              stepId: detail.stepId,
              ...(row && !detail.authoredOnly
                ? {
                    occurrence: rowOccurrence(row).map(([workflowId, stepId]) => ({
                      workflowId,
                      stepId,
                    })),
                  }
                : {}),
              ...(row?.action
                ? { kind: 'action' as const, action: actionAddress(row.action, source) }
                : { kind: 'step' as const }),
            },
          }
        : {}),
    };
    const wanted = expected.current;
    if (wanted) {
      if (
        current.root !== wanted.root ||
        current.subview !== wanted.subview ||
        selectionKey(current.selection) !== selectionKey(wanted.selection)
      )
        return;
      expected.current = undefined;
      if (!props.location) initial.current = undefined;
    }
    history?.recordCallers(
      session.trail.map((frame) => ({
        ...current,
        root: frame.root,
        subview: frame.view,
        selection: {
          kind: 'step',
          workflowId: frame.row.workflowId,
          stepId: frame.row.step!.stepId,
          occurrence: rowOccurrence(frame.row).map(([workflowId, stepId]) => ({
            workflowId,
            stepId,
          })),
        },
      })),
      current,
    );
    history?.commit(current);
    const key = encodeLocation(current);
    if (lastRequested.current === key) {
      lastRequested.current = undefined;
      emitted.current = key;
      return;
    }
    if (emitted.current === key) return;
    emitted.current = key;
    latest.current.props.onLocationChange?.(current);
    if (
      props.location &&
      request &&
      (current.root !== request.root ||
        current.subview !== request.subview ||
        selectionKey(current.selection) !== selectionKey(request.selection) ||
        (systems?.enabled && !systems.matches(request.extensions?.[SYSTEMS_NAMESPACE])))
    ) {
      // location remains authoritative until the host accepts a navigation request.
      const result = resolveLocation(viewer.model, request, {
        document: source,
        revision: props.documentRevision,
        digest: readyDigest,
      });
      emitted.current = encodeLocation({
        ...current,
        root: result.root,
        subview: request.subview,
        selection: result.row ? request.selection : undefined,
      });
      expected.current = {
        ...request,
        root: result.root,
        ...(result.row ? {} : { selection: undefined }),
      };
      latest.current.session.restoreLocation(result, request.subview);
      if (systems?.enabled && !systems.matches(request.extensions?.[SYSTEMS_NAMESPACE]))
        systems.restore(request.extensions?.[SYSTEMS_NAMESPACE] ?? null);
    }
  }, [
    readyDigest,
    source,
    props.documentRevision,
    view,
    viewer.activeWorkflowId,
    viewer.selectedNodeId,
    session.details,
    session.views,
    session.trail,
    systemsExtensionKey,
    guideKey,
  ]);
  if (session.details || !status || (status.state === 'restored' && !status.notices?.length))
    return null;
  return (
    <div role="status" className="arazzo-location-status">
      {status.message} {status.notices?.join(' ')}
    </div>
  );
}
