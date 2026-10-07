import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ArazzoUIProps } from '../types/viewer';
import type { ScenarioSelection, ScenarioWaypoint } from '../types/scenario';
import type { WorkflowLocation, WorkflowLocationJSON } from '../types/location';
import { useArazzoViewer } from './ArazzoViewerContext';
import { authoredDigest } from '../utils/location/codec';
import {
  normalizeScenarioManifest,
  readScenarioSelection,
  SCENARIO_NAMESPACE,
  scenarioWaypoint,
  scenarioSelectionKey,
} from '../utils/scenario/manifest';
interface GuideState {
  manifest: ReturnType<typeof normalizeScenarioManifest>;
  identity: string;
  source: { document: string; revision?: string; digest?: string };
  selection: ScenarioSelection | null;
  select: (
    value: ScenarioSelection | null,
    waypoint?: ScenarioWaypoint,
    origin?: HTMLElement,
  ) => void;
  request?: { location: WorkflowLocation; id: number };
  requestOrigin?: HTMLElement;
  restore: (value: WorkflowLocationJSON) => boolean;
}
const ScenarioContext = createContext<GuideState | null>(null);
export const useScenario = () => useContext(ScenarioContext);
export function ScenarioProvider({
  props,
  children,
}: {
  props: ArazzoUIProps;
  children: React.ReactNode;
}) {
  const viewer = useArazzoViewer();
  const [digest, setDigest] = useState<{ snapshot: typeof viewer.snapshot; value: string }>();
  useEffect(() => {
    let active = true;
    if (props.scenarioManifest)
      authoredDigest(viewer.snapshot.authoredDocument)
        .then((value) => {
          if (active) setDigest({ snapshot: viewer.snapshot, value });
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [viewer.snapshot, props.scenarioManifest]);
  const source = {
    document:
      props.documentIdentity ??
      viewer.snapshot.retrievalURI ??
      viewer.documentURL ??
      viewer.snapshot.id,
    revision: props.documentRevision,
    digest: digest?.snapshot === viewer.snapshot ? digest.value : undefined,
  };
  const manifest = useMemo(
    () => normalizeScenarioManifest(props.scenarioManifest, props.scenarioManifestURI),
    [props.scenarioManifest, props.scenarioManifestURI],
  );
  const localIdentity = useRef(
    `urn:arazzo-ui:scenario:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
  );
  const identity = manifest.manifest?.id ?? props.scenarioManifestURI ?? localIdentity.current;
  const incoming = props.location ?? props.defaultLocation;
  const [local, setLocal] = useState<ScenarioSelection | null>(
    () => readScenarioSelection(incoming?.extensions?.[SCENARIO_NAMESPACE]) ?? null,
  );
  const selection = props.scenarioSelection !== undefined ? props.scenarioSelection : local;
  const [request, setRequest] = useState<GuideState['request']>();
  const origin = useRef<HTMLElement>();
  const counter = useRef(0);
  const previous = useRef(props.scenarioManifest);
  useEffect(() => {
    if (previous.current === props.scenarioManifest) return;
    previous.current = props.scenarioManifest;
    setRequest(undefined);
    setLocal(null);
  }, [props.scenarioManifest]);
  const restore = (value: WorkflowLocationJSON) => {
    const decoded = readScenarioSelection(value);
    if (
      !decoded ||
      decoded.manifest !== identity ||
      decoded.revision !== manifest.manifest?.revision
    )
      return false;
    if (props.scenarioSelection === undefined)
      setLocal((current) =>
        scenarioSelectionKey(current) === scenarioSelectionKey(decoded) ? current : decoded,
      );
    return true;
  };
  const select: GuideState['select'] = (value, point, control) => {
    props.onScenarioSelectionChange?.(value);
    if (props.scenarioSelection === undefined) setLocal(value);
    if (!value) {
      setRequest(undefined);
      return;
    }
    if (!point) return;
    origin.current = control;
    props.onScenarioLocationRequest?.(point.location, point.focus);
    if (
      props.scenarioSelection === undefined ||
      scenarioSelectionKey(props.scenarioSelection) === scenarioSelectionKey(value)
    )
      setRequest({ location: point.location, id: ++counter.current });
  };
  // Accepted controlled state and initial guide links use an authored reading address.
  const selectionKey = scenarioSelectionKey(selection);
  useEffect(() => {
    if (!selection) {
      if (props.scenarioSelection === null) setRequest(undefined);
      return;
    }
    if (selection.manifest !== identity || selection.revision !== manifest.manifest?.revision) {
      setRequest(undefined);
      return;
    }
    const linked = readScenarioSelection(incoming?.extensions?.[SCENARIO_NAMESPACE]);
    const restoring = scenarioSelectionKey(linked) === selectionKey;
    if (props.scenarioSelection === undefined && (!restoring || request)) return;
    const point = scenarioWaypoint(manifest.manifest, selection, props.view);
    if (!point) {
      setRequest(undefined);
      return;
    }
    const location =
      restoring && incoming?.document === point.location.document
        ? {
            ...point.location,
            view: incoming.view,
            ...(incoming.revision !== undefined ? { revision: incoming.revision } : {}),
            ...(incoming.digest !== undefined ? { digest: incoming.digest } : {}),
            extensions: { ...incoming.extensions, ...point.location.extensions },
          }
        : point.location;
    setRequest({ location, id: ++counter.current });
  }, [selectionKey, manifest, identity]);
  if (props.scenarioManifest === undefined) return <>{children}</>;
  return (
    <ScenarioContext.Provider
      value={{
        manifest,
        identity,
        source,
        selection,
        select,
        request,
        requestOrigin: origin.current,
        restore,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}
