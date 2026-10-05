import type {
  WorkflowActionAddress,
  WorkflowCallSite,
  WorkflowLocation,
  WorkflowLocationStatus,
} from '../../types/location';
import type { ArazzoViewerModel, EffectiveAction } from '../model/viewerModel';
import {
  buildSequence,
  type SequenceRow,
  type SequenceScene,
  type CallPath,
} from '../sequence/sequenceModel';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const pointer = (path: (string | number)[]) =>
  '/' + path.map((value) => String(value).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
export function actionAddress(action: EffectiveAction, document: string): WorkflowActionAddress {
  return {
    document,
    pointer: pointer(action.declarationPath ?? action.path),
    usePointer: pointer(action.path),
    channel: action.channel,
    index: action.declarationPath ? 0 : action.authoredIndex,
    ...(typeof action.value.name === 'string' ? { name: action.value.name } : {}),
  };
}
export function rowOccurrence(row: SequenceRow): CallPath {
  return row.kind === 'call' ||
    row.kind === 'continuation' ||
    (row.kind === 'marker' && row.reason !== 'rows')
    ? row.path.slice(0, -1)
    : row.path;
}
export interface ResolvedLocation {
  root: string | null;
  authoredOnly?: boolean;
  row?: SequenceRow;
  scene?: SequenceScene;
  expansions: Record<string, boolean>;
  focusRowId?: string;
  status: WorkflowLocationStatus;
}
export function resolveLocation(
  model: ArazzoViewerModel,
  location: WorkflowLocation,
  source: { document: string; revision?: string; digest?: string },
): ResolvedLocation {
  const result: ResolvedLocation = {
    root: location.root,
    expansions: {},
    status: { state: 'restored', location, message: 'Workflow location restored.' },
  };
  const unavailable = (message: string, segment?: WorkflowCallSite) => {
    result.status = { state: 'stale', location, message, unavailableSegment: segment };
    return result;
  };
  if (source.document !== location.document) {
    result.status = {
      state: 'document-request',
      location,
      message: `Supply document ${location.document} to restore this location.`,
    };
    return result;
  }
  if (
    location.root !== null &&
    model.workflows.filter((w) => w.workflowId === location.root).length !== 1
  ) {
    result.root = null;
    return unavailable(`Unavailable root workflow: ${location.root}`);
  }
  if (
    (location.revision !== undefined && location.revision !== source.revision) ||
    (location.digest !== undefined && location.digest !== source.digest)
  )
    return unavailable(
      'Document revision mismatch: linked authored content has changed or its revision cannot be verified.',
    );
  if (model.support.semanticInspection === 'unsupported')
    return unavailable('This inspection profile cannot restore workflow locations.');
  const selection = location.selection;
  if (!selection || location.root === null) return result;
  let owner = location.root;
  const path: CallPath = [];
  const uniqueStep = (workflowId: string, stepId: string) => {
    const workflows = model.workflows.filter((w) => w.workflowId === workflowId);
    if (workflows.length !== 1) return undefined;
    const steps = workflows[0].steps.filter((s) => s.stepId === stepId);
    return steps.length === 1 ? steps[0] : undefined;
  };
  for (const segment of selection.occurrence ?? []) {
    const step = uniqueStep(owner, segment.stepId);
    if (
      segment.workflowId !== owner ||
      step?.callTarget?.kind !== 'local-workflow' ||
      !step.callTarget.navigable
    )
      return unavailable(
        `Unavailable call segment: ${segment.workflowId}.${segment.stepId}`,
        segment,
      );
    path.push([owner, step.stepId]);
    owner = step.callTarget.workflowId!;
  }
  if (owner !== selection.workflowId)
    return unavailable(`Occurrence does not reach ${selection.workflowId}.`);
  const workflow = model.workflowsById.get(owner)!;
  const step = uniqueStep(owner, selection.stepId);
  if (!step) return unavailable(`Unavailable or ambiguous step: ${owner}.${selection.stepId}`);
  let action: EffectiveAction | undefined;
  if (selection.kind === 'action') {
    action = step.effectiveActions[selection.action.channel].find((a) => {
      const address = actionAddress(a, source.document);
      return (
        address.document === selection.action.document &&
        address.pointer === selection.action.pointer &&
        address.usePointer === selection.action.usePointer &&
        address.index === selection.action.index &&
        (selection.action.name === undefined || address.name === selection.action.name)
      );
    });
    if (!action) return unavailable(`Unavailable authored action: ${selection.action.pointer}`);
  }
  // all root calls start collapsed; open only the requested ancestry.
  let scene = buildSequence(model, location.root);
  for (const row of scene.rows) if (row.kind === 'call') result.expansions[row.id] = false;
  scene = buildSequence(model, location.root, result.expansions);
  for (let index = 0; index < path.length; index += 1) {
    const call = scene.rows.find(
      (row) => row.kind === 'call' && same(row.path, path.slice(0, index + 1)),
    );
    if (!call) break;
    result.expansions[call.id] = true;
    scene = buildSequence(model, location.root, result.expansions);
  }
  result.authoredOnly = selection.occurrence === undefined;
  result.scene = scene;
  const row = scene.rows.find(
    (r) =>
      r.workflowId === owner &&
      r.step?.stepId === selection.stepId &&
      same(rowOccurrence(r), path) &&
      (selection.kind === 'action'
        ? r.action === action
        : r.kind === 'operation' || r.kind === 'call'),
  );
  // some actions have no sequence arrow; authored inspection remains addressable.
  result.row = row ?? {
    id: `authored:${JSON.stringify(selection)}`,
    kind: action ? 'transfer' : step.callTarget ? 'call' : 'operation',
    workflowId: owner,
    workflow,
    step,
    action,
    target: action?.target ?? step.callTarget,
    path: step.callTarget && !action ? [...path, [owner, step.stepId]] : path,
    depth: path.length,
    from: '',
    to: '',
    label: `${owner}.${step.stepId}${action ? ` · ${action.channel} ${action.value.name}` : ''}`,
  };
  if (
    selection.occurrence !== undefined &&
    !row &&
    (!action ||
      scene.rows.some(
        (r) => r.reason === 'rows' || r.reason === 'depth' || r.reason === 'recursion',
      ))
  ) {
    const boundary = scene.rows.find(
      (r) => r.kind === 'marker' && ['rows', 'depth', 'recursion'].includes(r.reason ?? ''),
    );
    result.status = {
      state: 'bounded',
      location,
      message: `Display limit (${boundary?.reason ?? 'scene'}): authored details remain available; open ${owner} as a new root to inspect.`,
    };
    result.focusRowId = boundary?.id;
  } else result.focusRowId = row?.id;
  return result;
}
