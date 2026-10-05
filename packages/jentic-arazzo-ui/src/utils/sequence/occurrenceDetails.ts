import type { ArazzoViewerModel } from '../model/viewerModel';
import type { SequenceRow } from './sequenceModel';

export interface OccurrenceDetails {
  title: string;
  sections: { title: string; value: unknown }[];
}

export function projectOccurrenceDetails(
  model: ArazzoViewerModel,
  workflowId: string,
  stepId?: string,
  row?: SequenceRow,
): OccurrenceDetails | undefined {
  const workflow = model.workflowsById.get(workflowId);
  const step = stepId ? model.stepsByWorkflow.get(workflowId)?.get(stepId) : undefined;
  if (!workflow) return undefined;
  if (!step) {
    if (stepId) return undefined;
    return {
      title: workflowId,
      sections: [
        {
          title: 'Context',
          value: { owningWorkflow: workflowId, callPath: row?.path ?? [], occurrence: row?.label },
        },
        { title: 'Prerequisites', value: workflow.prerequisites },
        { title: 'Authored workflow', value: workflow.value },
      ],
    };
  }
  const callee =
    step.callTarget?.kind === 'local-workflow'
      ? model.workflowsById.get(step.callTarget.workflowId!)
      : undefined;
  const unavailable = 'Unavailable: no authored mapping or declaration';
  const actions = (['onSuccess', 'onFailure'] as const).flatMap((channel) =>
    step.effectiveActions[channel].map((action) => ({
      channel,
      inspectionIndex: action.effectiveIndex,
      origin: action.origin,
      status: action.status,
      isOverride: action.isOverride,
      authored: action.authored,
      effective: action.value,
      parameters: action.parameters.map((p) => ({
        authored: p.authored,
        effective: p.value,
        status: p.status,
        path: p.path,
        declarationPath: p.declarationPath,
      })),
      path: action.path,
      declarationPath: action.declarationPath,
    })),
  );
  const sections = [
    {
      title: 'Context',
      value: {
        owningWorkflow: workflowId,
        step: stepId,
        caller: step.callTarget ? workflowId : undefined,
        callee: step.callTarget?.reference,
        classification: step.callTarget?.kind,
        callPath: row?.path ?? [],
      },
    },
    {
      title: step.callTarget ? 'Caller-supplied parameters' : 'Parameters',
      value: step.parameters.length
        ? step.parameters.map((p) => ({
            ...p.value,
            status: p.status,
            authored: p.authored,
            path: p.path,
            declarationPath: p.declarationPath,
          }))
        : unavailable,
    },
    { title: 'Caller-side output expressions', value: step.value.outputs ?? unavailable },
    ...(step.callTarget
      ? [
          { title: 'Declared callee inputs', value: callee?.value.inputs ?? unavailable },
          { title: 'Declared callee outputs', value: callee?.value.outputs ?? unavailable },
        ]
      : []),
    {
      title: 'Viewer inspection order — effective actions',
      value: actions.length ? actions : unavailable,
    },
    {
      title: 'Authored action lists',
      value: {
        workflow: {
          successActions: workflow.authored.successActions,
          failureActions: workflow.authored.failureActions,
        },
        step: { onSuccess: step.authored.onSuccess, onFailure: step.authored.onFailure },
      },
    },
    { title: 'Criteria', value: step.value.successCriteria ?? unavailable },
    { title: 'Source metadata', value: step.sourceBinding },
    { title: 'Prerequisites', value: step.prerequisites },
    {
      title: 'Provenance',
      value: { path: step.path, declarationPath: step.declarationPath, callPath: row?.path ?? [] },
    },
    {
      title: 'Diagnostics',
      value: model.diagnostics.filter(
        (d) => d.workflowId === workflowId && (!d.stepId || d.stepId === stepId),
      ),
    },
    { title: 'Authored content', value: step.authored },
  ];
  if (!step.callTarget && (step.authored['x-internal-processing'] || workflow.authored.description))
    sections.push({
      title: 'Descriptive associations',
      value: 'No standard workflow-call relationship is declared by descriptions or extensions.',
    });
  return { title: `${workflowId}.${stepId}`, sections };
}
