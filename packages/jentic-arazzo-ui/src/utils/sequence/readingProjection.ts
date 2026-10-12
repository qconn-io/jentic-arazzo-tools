import type { EffectiveAction } from '../model/viewerModel';
import type { SequenceRow, SequenceScene } from './sequenceModel';

export interface StepActionPresentation {
  action: EffectiveAction;
  transfer?: SequenceRow;
}

export interface StepPresentation {
  number: string;
  actions: StepActionPresentation[];
}

export function projectSequenceSteps(scene: SequenceScene): Map<string, StepPresentation> {
  const steps = new Map<string, StepPresentation>();
  const nextByParent = new Map<string, number>();
  const transfers = scene.rows.filter((row) => row.kind === 'transfer');
  for (const row of scene.rows) {
    if ((row.kind !== 'operation' && row.kind !== 'call') || !row.step) continue;
    const parent = row.parentId ?? '';
    const next = (nextByParent.get(parent) ?? 0) + 1;
    nextByParent.set(parent, next);
    const prefix = row.parentId ? steps.get(row.parentId)?.number : undefined;
    const number = prefix ? `${prefix}.${next}` : String(next);
    const actions = (['onSuccess', 'onFailure'] as const).flatMap((channel) =>
      row.step!.effectiveActions[channel].map((action) => ({
        action,
        transfer: transfers.find(
          (candidate) =>
            candidate.parentId === row.parentId &&
            candidate.workflowId === row.workflowId &&
            candidate.step?.stepId === row.step?.stepId &&
            candidate.action === action,
        ),
      })),
    );
    steps.set(row.id, { number, actions });
  }
  return steps;
}

// display numbering follows the visible authored-step hierarchy. Scene row IDs,
// occurrence paths, traversal and limits remain the source of identity.
export function projectSequenceNumbers(scene: SequenceScene): Map<string, string> {
  return new Map(Array.from(projectSequenceSteps(scene), ([id, step]) => [id, step.number]));
}
