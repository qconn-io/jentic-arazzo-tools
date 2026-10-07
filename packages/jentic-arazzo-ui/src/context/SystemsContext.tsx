import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import type { ArazzoUIProps, WorkflowLocationJSON, WorkflowPerspective } from '../types';
import { useArazzoViewer } from './ArazzoViewerContext';
import { useContractFacts } from './ContractFactsContext';
import { useViewerSession } from './ViewerSessionContext';
import { rowOccurrence } from '../utils/location/resolve';
import { buildSystemScene, type SystemRow } from '../utils/systems/scene';
import { digitalProductProfile } from '../utils/systems/digitalProductProfile';

export const SYSTEMS_NAMESPACE = 'jentic.systems';
interface Address {
  workflowId: string;
  stepId?: string;
  path: [string, string][];
  associations: string[];
  associationPaths?: [string, string][][];
  kind: SystemRow['kind'];
  associationId?: string;
  reason?: string;
}
const address = (row: SystemRow): Address => ({
  workflowId: row.workflowId,
  stepId: row.step?.stepId,
  path: row.path,
  associations: row.associations,
  associationPaths: row.associationPaths,
  kind: row.kind,
  ...(row.reason ? { reason: row.reason } : {}),
  ...(row.association ? { associationId: row.association.id } : {}),
});
const addressKey = (a: Address | undefined) =>
  JSON.stringify(
    a && [
      a.workflowId,
      a.stepId ?? null,
      a.path,
      a.associations,
      a.associationPaths ?? a.associations.map(() => []),
      a.kind,
      a.associationId ?? null,
      a.reason ?? null,
    ],
  );
const same = (a: Address | undefined, b: Address | undefined) => addressKey(a) === addressKey(b);
function idFor(document: string, root: string, ref: Address) {
  const id = JSON.stringify([
    document,
    root,
    ref.associations,
    ref.associationPaths ?? ref.associations.map(() => []),
    ref.path,
    ref.workflowId,
    ref.stepId,
  ]);
  return ref.associationId ? `${id}:implementation:${ref.associationId}` : id;
}
function validAddress(value: unknown): value is Address {
  if (!value || typeof value !== 'object') return false;
  const v = value as Address;
  return (
    typeof v.workflowId === 'string' &&
    typeof v.stepId === 'string' &&
    ['exchange', 'call', 'implementation', 'marker'].includes(v.kind) &&
    Array.isArray(v.path) &&
    v.path.length <= 8 &&
    v.path.every(
      (p) => Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === 'string'),
    ) &&
    Array.isArray(v.associations) &&
    v.associations.length <= 8 &&
    v.associations.every((x) => typeof x === 'string') &&
    (v.associationPaths === undefined ||
      (Array.isArray(v.associationPaths) &&
        v.associationPaths.length === v.associations.length &&
        v.associationPaths.flat().length <= 8 &&
        v.associationPaths.every(
          (path) =>
            Array.isArray(path) &&
            path.every(
              (site) =>
                Array.isArray(site) &&
                site.length === 2 &&
                site.every((x) => typeof x === 'string'),
            ),
        ))) &&
    (v.associationId === undefined || typeof v.associationId === 'string') &&
    (v.reason === undefined || typeof v.reason === 'string')
  );
}
interface SystemsState {
  enabled: boolean;
  perspective: WorkflowPerspective;
  setPerspective: (value: WorkflowPerspective) => void;
  root: string | null;
  scene: ReturnType<typeof buildSystemScene>;
  selected?: SystemRow;
  select: (row: SystemRow) => void;
  toggle: (row: SystemRow) => void;
  returnToSystems: () => void;
  extension?: WorkflowLocationJSON;
  restore: (value: WorkflowLocationJSON) => boolean;
  matches: (value: WorkflowLocationJSON | undefined) => boolean;
  document: string;
}
const SystemsContext = createContext<SystemsState | null>(null);
export const useSystems = () => useContext(SystemsContext);
export function SystemsProvider({
  props,
  children,
}: {
  props: ArazzoUIProps;
  children: React.ReactNode;
}) {
  const viewer = useArazzoViewer();
  const contracts = useContractFacts();
  const session = useViewerSession();
  const document =
    props.documentIdentity ??
    viewer.snapshot.retrievalURI ??
    viewer.documentURL ??
    viewer.snapshot.id;
  const profile = useMemo(
    () =>
      props.viewProfile ??
      (props.viewProfileAdapter === 'digital-product'
        ? digitalProductProfile(viewer.document, document, props.documentRevision)
        : undefined),
    [
      props.viewProfile,
      props.viewProfileAdapter,
      viewer.document,
      document,
      props.documentRevision,
    ],
  );
  const [perspective, setPerspectiveState] = useState<WorkflowPerspective>('workflow');
  const [contextRoot, setContextRoot] = useState<string | null>(viewer.activeWorkflowId);
  const [selected, setSelected] = useState<Address>();
  const [expanded, setExpanded] = useState<Address[]>([]);
  const [collapsed, setCollapsed] = useState<Address[]>([]);
  const currentPerspective = props.perspective ?? perspective;
  const root = currentPerspective === 'systems' ? viewer.activeWorkflowId : contextRoot;
  const scene = useMemo(
    () =>
      buildSystemScene(viewer.model, root ?? '', profile, {
        document,
        revision: props.documentRevision,
        contracts: contracts.loaded,
        expansion: Object.fromEntries([
          ...expanded.map((ref) => [idFor(document, root ?? '', ref), true]),
          ...collapsed.map((ref) => [idFor(document, root ?? '', ref), false]),
        ]),
      }),
    [
      viewer.model,
      root,
      profile,
      document,
      props.documentRevision,
      contracts.loaded,
      expanded,
      collapsed,
    ],
  );
  const selectedRow = scene.rows.find((row) => same(address(row), selected));
  const mapWorkflowSelection = () => {
    const current = session.details;
    const occurrence = current?.row ?? session.selectedRow;
    const workflowId = current?.workflowId ?? occurrence?.workflowId;
    const stepId = current?.stepId ?? occurrence?.step?.stepId;
    const path = occurrence ? rowOccurrence(occurrence) : [];
    const nextRoot = viewer.activeWorkflowId;
    const expandedCalls: Address[] = path.map(([workflowId, stepId], i) => ({
      workflowId,
      stepId,
      path: path.slice(0, i),
      associations: [],
      associationPaths: [],
      kind: 'call',
    }));
    const nextScene = buildSystemScene(viewer.model, nextRoot ?? '', profile, {
      document,
      revision: props.documentRevision,
      contracts: contracts.loaded,
      expansion: Object.fromEntries(
        expandedCalls.map((ref) => [idFor(document, nextRoot ?? '', ref), true]),
      ),
    });
    const target = nextScene.rows.find(
      (row) =>
        row.workflowId === workflowId &&
        row.step?.stepId === stepId &&
        row.associations.length === 0 &&
        JSON.stringify(row.path) === JSON.stringify(path),
    );
    setContextRoot(nextRoot);
    setExpanded(expandedCalls);
    setCollapsed([]);
    setSelected(target ? address(target) : undefined);
  };
  const setPerspective = (value: WorkflowPerspective) => {
    if (value === 'workflow' && currentPerspective === 'systems')
      setContextRoot(viewer.activeWorkflowId);
    if (value === 'systems' && currentPerspective === 'workflow') mapWorkflowSelection();
    setPerspectiveState(value);
    props.onPerspectiveChange?.(value);
  };
  const previousControlledPerspective = useRef(props.perspective);
  useEffect(() => {
    const previous = previousControlledPerspective.current;
    previousControlledPerspective.current = props.perspective;
    if (previous === props.perspective || props.perspective === undefined) return;
    if (props.perspective === 'workflow') setContextRoot(viewer.activeWorkflowId);
    else if (!(props.location ?? props.defaultLocation)?.extensions?.[SYSTEMS_NAMESPACE])
      mapWorkflowSelection();
  }, [props.perspective]);
  const extension: WorkflowLocationJSON | undefined = profile
    ? JSON.parse(
        JSON.stringify({
          version: 1,
          perspective: currentPerspective,
          root,
          selection: selected,
          expanded,
          collapsed,
        }),
      )
    : undefined;
  const extensionKey = (value: WorkflowLocationJSON | undefined) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const v = value as Record<string, unknown>;
    if (
      !Array.isArray(v.expanded) ||
      !v.expanded.every(validAddress) ||
      !Array.isArray(v.collapsed) ||
      !v.collapsed.every(validAddress) ||
      (v.selection !== undefined && !validAddress(v.selection))
    )
      return undefined;
    return JSON.stringify([
      v.version,
      v.perspective,
      v.root,
      addressKey(v.selection as Address | undefined),
      v.expanded.map((ref) => addressKey(ref as Address)).sort(),
      v.collapsed.map((ref) => addressKey(ref as Address)).sort(),
    ]);
  };
  const state: SystemsState = {
    enabled: !!profile,
    perspective: currentPerspective,
    setPerspective,
    root,
    scene,
    selected: selectedRow,
    document,
    select: (row) => {
      setSelected(address(row));
      setContextRoot(root);
    },
    toggle: (row) => {
      const ref = address(row);
      setCollapsed((old) =>
        row.expanded
          ? [...old.filter((a) => !same(a, ref)), ref]
          : old.filter((a) => !same(a, ref)),
      );
      setExpanded((old) =>
        row.expanded
          ? old.filter((a) => !same(a, ref))
          : [...old.filter((a) => !same(a, ref)), ref],
      );
    },
    returnToSystems: () => {
      viewer.setActiveWorkflow(contextRoot);
      setPerspectiveState('systems');
      props.onPerspectiveChange?.('systems');
    },
    extension,
    matches: (value) =>
      value === undefined
        ? currentPerspective === 'workflow' &&
          !selected &&
          expanded.length === 0 &&
          collapsed.length === 0
        : extensionKey(value) === extensionKey(extension),
    restore: (value) => {
      if (value === null) {
        setPerspectiveState('workflow');
        setSelected(undefined);
        setExpanded([]);
        setCollapsed([]);
        setContextRoot(viewer.activeWorkflowId);
        return true;
      }
      if (!profile || !value || typeof value !== 'object' || Array.isArray(value)) return false;
      const v = value as Record<string, unknown>;
      if (
        v.version !== 1 ||
        (v.perspective !== 'workflow' && v.perspective !== 'systems') ||
        (v.root !== null && typeof v.root !== 'string') ||
        !Array.isArray(v.expanded) ||
        v.expanded.length > 200 ||
        !v.expanded.every(validAddress) ||
        !Array.isArray(v.collapsed) ||
        v.collapsed.length > 200 ||
        !v.collapsed.every(validAddress) ||
        (v.selection !== undefined && !validAddress(v.selection))
      )
        return false;
      const restoredRoot = v.root as string | null;
      if (restoredRoot && !viewer.model.workflowsById.has(restoredRoot)) return false;
      if (props.perspective !== undefined && props.perspective !== v.perspective) return false;
      const restoredScene = buildSystemScene(viewer.model, restoredRoot ?? '', profile, {
        document,
        revision: props.documentRevision,
        expansion: Object.fromEntries([
          ...v.expanded.map((ref) => [idFor(document, restoredRoot ?? '', ref), true]),
          ...v.collapsed.map((ref) => [idFor(document, restoredRoot ?? '', ref), false]),
        ]),
      });
      if (
        v.selection &&
        !restoredScene.rows.some((row) => same(address(row), v.selection as Address))
      )
        return false;
      setContextRoot(restoredRoot);
      setSelected(v.selection as Address | undefined);
      setExpanded(v.expanded);
      setCollapsed(v.collapsed);
      setPerspectiveState(v.perspective);
      return true;
    },
  };
  return <SystemsContext.Provider value={state}>{children}</SystemsContext.Provider>;
}
