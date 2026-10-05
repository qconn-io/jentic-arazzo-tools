import type { ClassifiedTarget } from '../inspection';
import type {
  ArazzoViewerModel,
  ViewerStep,
  ViewerWorkflow,
  EffectiveAction,
} from '../model/viewerModel';

export type CallPath = [string, string][];
export interface SequenceParticipant {
  id: string;
  kind: 'workflow' | 'source' | 'unknown' | 'external';
  name: string;
}
export interface SequenceRow {
  id: string;
  kind: 'operation' | 'call' | 'continuation' | 'prerequisite' | 'transfer' | 'marker';
  workflowId: string;
  path: CallPath;
  depth: number;
  parentId?: string;
  step?: ViewerStep;
  workflow: ViewerWorkflow;
  action?: EffectiveAction;
  target?: ClassifiedTarget;
  from: string;
  to: string;
  label: string;
  expanded?: boolean;
  reason?: string;
  returnTo?: 'source-step';
}
export interface SequenceScene {
  rootWorkflowId: string;
  documentId: string;
  participants: SequenceParticipant[];
  rows: SequenceRow[];
  bounded: boolean;
}

// This is a display scene over inspected facts, never a trace or expression evaluator.
// Full tuple identities distinguish repeated calls. Limits count every visible row,
// including annotations and markers, and reserve the last row for omitted content.
export function buildSequence(
  model: ArazzoViewerModel,
  rootWorkflowId: string,
  expansion: Readonly<Record<string, boolean>> = {},
): SequenceScene {
  const scene: SequenceScene = {
    rootWorkflowId,
    documentId: model.documentId,
    participants: [],
    rows: [],
    bounded: false,
  };
  const root = model.workflowsById.get(rootWorkflowId);
  if (!root || model.support.semanticInspection === 'unsupported') return scene;
  const participants = new Map<string, string>();
  const participant = (kind: SequenceParticipant['kind'], name: string, occurrence?: string) => {
    const key = JSON.stringify([kind, name, occurrence ?? null]);
    let id = participants.get(key);
    if (!id) {
      id = `P${participants.size}`;
      participants.set(key, id);
      scene.participants.push({ id, kind, name });
    }
    return id;
  };
  const identity = (path: CallPath, local: unknown[]) =>
    JSON.stringify([model.documentId, rootWorkflowId, path, local]);
  let exhausted = false;
  const append = (row: SequenceRow) => {
    if (exhausted) return false;
    if (scene.rows.length === 199) {
      scene.rows.push({
        ...row,
        id: identity(row.path, ['row-limit', row.id]),
        kind: 'marker',
        reason: 'rows',
        label: `Display limit: remaining content in ${row.workflowId} omitted (200 rows). View complete workflow documentation to inspect.`,
        to: row.from,
        target: {
          kind: 'local-workflow',
          workflowId: row.workflowId,
          reference: row.workflowId,
          role: 'call',
          navigable: true,
        },
      });
      exhausted = true;
      scene.bounded = true;
      return false;
    }
    scene.rows.push(row);
    return true;
  };
  const destination = (target: ClassifiedTarget, rowId: string) =>
    target.navigable && target.workflowId
      ? participant('workflow', target.workflowId)
      : participant(
          target.kind.startsWith('external') ? 'external' : 'unknown',
          `${target.reference} (${target.kind})`,
          rowId,
        );
  const visit = (
    workflow: ViewerWorkflow,
    path: CallPath,
    active: string[],
    parentId?: string,
  ): boolean => {
    const from = participant('workflow', workflow.workflowId);
    const base = {
      workflowId: workflow.workflowId,
      workflow,
      path,
      depth: path.length,
      parentId,
      from,
      to: from,
    };
    for (const prerequisite of workflow.prerequisites) {
      if (
        !append({
          ...base,
          id: identity(path, [workflow.workflowId, 'prerequisite', prerequisite.authoredIndex]),
          kind: 'prerequisite',
          target: prerequisite.target,
          label: `Prerequisite: ${prerequisite.target.reference} (${prerequisite.target.kind})`,
        })
      )
        return false;
    }
    for (const step of workflow.steps) {
      if (exhausted) return false;
      for (const prerequisite of step.prerequisites) {
        if (
          !append({
            ...base,
            step,
            id: identity(path, [step.stepId, 'prerequisite', prerequisite.authoredIndex]),
            kind: 'prerequisite',
            target: prerequisite.target,
            label: `${step.stepId} depends on ${prerequisite.target.reference} (${prerequisite.target.kind})`,
          })
        )
          return false;
      }
      const id = identity(path, [step.stepId, 'interaction']);
      if (step.callTarget) {
        const target = step.callTarget;
        const callee =
          target.kind === 'local-workflow'
            ? model.workflowsById.get(target.workflowId!)
            : undefined;
        const expanded = !!callee && (expansion[id] ?? path.length === 0);
        const to = destination(target, id);
        const childPath: CallPath = [...path, [workflow.workflowId, step.stepId]];
        const call: SequenceRow = {
          ...base,
          path: childPath,
          id,
          step,
          kind: 'call',
          target,
          to,
          expanded,
          label: `${step.stepId}: Call ${target.reference}`,
        };
        if (!append(call)) return false;
        let reason: string | undefined;
        if (!callee) reason = target.kind;
        else if (expanded && active.includes(callee.workflowId)) reason = 'recursion';
        else if (expanded && childPath.length > 8) reason = 'depth';
        else if (!expanded) reason = 'collapsed';
        if (reason) {
          const message =
            reason === 'collapsed'
              ? 'Collapsed call — expand to show interactions'
              : reason === 'recursion'
                ? 'Recursion on the current call path — open workflow to inspect'
                : reason === 'depth'
                  ? 'Display limit: eight nested call levels — open workflow to inspect'
                  : target.reason || `Expansion unavailable: ${reason}`;
          if (
            !append({
              ...call,
              id: identity(childPath, ['marker', reason]),
              kind: 'marker',
              parentId: id,
              path: childPath,
              depth: childPath.length,
              reason,
              label: `${target.reference}: ${message}`,
            })
          )
            return false;
          if (reason !== 'collapsed') {
            scene.bounded ||= reason === 'recursion' || reason === 'depth';
          }
        } else if (callee && !visit(callee, childPath, [...active, callee.workflowId], id))
          return false;
        if (
          callee &&
          (!reason || reason === 'collapsed') &&
          !append({
            ...call,
            id: identity(childPath, ['continuation']),
            kind: 'continuation',
            parentId: id,
            path: childPath,
            depth: childPath.length,
            from: to,
            to: from,
            label: `Structural continuation to ${workflow.workflowId} after ${step.stepId}`,
          })
        )
          return false;
      } else {
        const binding = step.sourceBinding;
        const to =
          binding.sourceName && binding.status === 'declared'
            ? participant('source', binding.sourceName)
            : participant(
                'unknown',
                `${binding.status === 'ambiguous' ? 'Ambiguous' : 'Unknown'} destination · ${step.stepId}`,
                id,
              );
        const receive = binding.intent === 'receive';
        if (
          !append({
            ...base,
            id,
            kind: 'operation',
            step,
            from: receive ? to : from,
            to: receive ? from : to,
            label: `${step.stepId} · ${binding.intent ?? 'Operation'}${binding.status === 'ambiguous' ? ' · ambiguous destination' : ''}`,
          })
        )
          return false;
      }
      for (const channel of ['onSuccess', 'onFailure'] as const) {
        for (const action of step.effectiveActions[channel]) {
          if (
            action.status !== 'resolved' ||
            !action.target ||
            !['goto', 'retry'].includes(action.value.type)
          )
            continue;
          const actionId = identity(path, [
            step.stepId,
            channel,
            action.origin,
            action.authoredIndex,
          ]);
          const target = action.target;
          const returnsToSource =
            action.value.type === 'retry' &&
            (target.navigable || target.kind.startsWith('external'));
          if (
            !append({
              ...base,
              id: actionId,
              kind: 'transfer',
              step,
              action,
              target,
              to: destination(target, actionId),
              returnTo: returnsToSource ? 'source-step' : undefined,
              label: `Possible ${channel} ${action.value.type}: ${action.value.name} → ${target.reference}${action.value.type === 'retry' ? (returnsToSource ? ` → retry ${step.stepId}` : ' (recovery unavailable)') : ' (one-way)'}`,
            })
          )
            return false;
        }
      }
    }
    return true;
  };
  visit(root, [], [rootWorkflowId]);
  // Building a rejected row may have registered a destination; only visible lanes survive.
  const visible = new Set(scene.rows.flatMap((row) => [row.from, row.to]));
  scene.participants = scene.participants.filter((p) => visible.has(p.id));
  return scene;
}

// A graph call uses the same root occurrence identity without rendering preceding rows.
export function rootCallOccurrence(
  model: ArazzoViewerModel,
  workflowId: string,
  stepId: string,
): SequenceRow | undefined {
  const workflow = model.workflowsById.get(workflowId);
  const step = model.stepsByWorkflow.get(workflowId)?.get(stepId);
  if (!workflow || !step?.callTarget) return undefined;
  return {
    id: JSON.stringify([model.documentId, workflowId, [], [stepId, 'interaction']]),
    kind: 'call',
    workflowId,
    workflow,
    step,
    target: step.callTarget,
    path: [[workflowId, stepId]],
    depth: 0,
    from: '',
    to: '',
    expanded: true,
    label: `${stepId}: Call ${step.callTarget.reference}`,
  };
}
