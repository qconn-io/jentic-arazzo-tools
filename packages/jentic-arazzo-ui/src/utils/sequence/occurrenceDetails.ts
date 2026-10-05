import type { ArazzoViewerModel } from '../model/viewerModel';
import type { SequenceRow } from './sequenceModel';
import type { ClassifiedTarget, ParameterFact, PrerequisiteFact } from '../inspection';
import type { EffectiveAction } from '../model/viewerModel';

interface PresentValue {
  present: boolean;
  value?: unknown;
}
interface ValueRow extends PresentValue {
  label: string;
  location?: string;
  status?: ParameterFact['status'];
}
interface RecoveryCard {
  name: string;
  channel: 'onSuccess' | 'onFailure';
  index: number;
  origin: EffectiveAction['origin'];
  status: EffectiveAction['status'];
  isOverride: boolean;
  semantics: string;
  target?: ClassifiedTarget;
  criteria: PresentValue;
  parameters: ValueRow[];
  parameterContainer: PresentValue;
  retryLimit: PresentValue;
  retryAfter: PresentValue;
}
export type ReadingSection =
  | ({ kind: 'values'; title: string; rows: ValueRow[] } & PresentValue)
  | ({ kind: 'tree'; title: string } & PresentValue)
  | { kind: 'prerequisites'; title: string; entries: PrerequisiteFact[] }
  | { kind: 'recovery'; title: string; cards: RecoveryCard[] };

const property = (object: Record<string, unknown> | undefined, key: string): PresentValue => ({
  present: !!object && Object.prototype.hasOwnProperty.call(object, key),
  value: object?.[key],
});
const parameterRows = (parameters: ParameterFact[]): ValueRow[] =>
  parameters.map((p) => ({
    label: String(p.value.name ?? p.authored.reference ?? p.authored.$ref ?? 'Unnamed parameter'),
    location: p.value.in,
    status: p.status,
    ...property(p.value, 'value'),
  }));
const outputRows = (object: Record<string, unknown> | undefined): ValueRow[] =>
  Object.entries(object ?? {}).map(([label, value]) => ({ label, present: true, value }));
function recoveryCard(action: EffectiveAction, workflowId: string, stepId: string): RecoveryCard {
  const self =
    action.target?.kind === 'local-step' &&
    action.target.workflowId === workflowId &&
    action.target.stepId === stepId;
  const semantics =
    action.status !== 'resolved'
      ? 'Unresolved action; inspect authored declaration'
      : action.value.type === 'retry'
        ? !action.target || self
          ? `Retry source step ${workflowId}.${stepId}`
          : `Recovery before retrying ${workflowId}.${stepId}`
        : action.value.type === 'goto'
          ? 'One-way transfer'
          : action.value.type === 'end'
            ? 'End'
            : 'Unsupported action';
  return {
    name: String(
      action.value.name ?? action.authored.reference ?? action.authored.$ref ?? 'Unnamed action',
    ),
    channel: action.channel,
    index: action.effectiveIndex,
    origin: action.origin,
    status: action.status,
    isOverride: action.isOverride,
    semantics,
    target: action.target,
    criteria: property(action.value, 'criteria'),
    parameters: parameterRows(action.parameters),
    parameterContainer: property(action.value, 'parameters'),
    retryLimit: property(action.value, 'retryLimit'),
    retryAfter: property(action.value, 'retryAfter'),
  };
}

export interface OccurrenceDetails {
  title: string;
  sections: { title: string; value: unknown }[];
  reading: {
    context: {
      owningWorkflow: string;
      step?: string;
      callPath: SequenceRow['path'];
      occurrence?: string;
      classification?: string;
      callee?: string;
    };
    sections: ReadingSection[];
  };
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
      reading: {
        context: { owningWorkflow: workflowId, callPath: row?.path ?? [], occurrence: row?.label },
        sections: [
          { kind: 'prerequisites', title: 'Prerequisites', entries: workflow.prerequisites },
          { kind: 'tree', title: 'Declared inputs', ...property(workflow.value, 'inputs') },
          {
            kind: 'values',
            title: 'Outputs',
            ...property(workflow.value, 'outputs'),
            rows: outputRows(workflow.value.outputs),
          },
        ],
      },
      sections: [
        {
          title: 'Context',
          value: { owningWorkflow: workflowId, callPath: row?.path ?? [], occurrence: row?.label },
        },
        { title: 'Prerequisites', value: workflow.prerequisites },
        { title: 'Authored workflow', value: workflow.authored },
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
  const reading: OccurrenceDetails['reading'] = {
    context: {
      owningWorkflow: workflowId,
      step: stepId,
      callPath: row?.path ?? [],
      occurrence: row?.label,
      classification: step.callTarget?.kind,
      callee: step.callTarget?.reference,
    },
    sections: [
      {
        kind: 'values',
        title: step.callTarget ? 'Caller-supplied parameters' : 'Parameters',
        ...property(step.value, 'parameters'),
        rows: parameterRows(step.parameters),
      },
      {
        kind: 'tree',
        title: 'Request body / message payload',
        ...property(step.value, 'requestBody'),
      },
      {
        kind: 'values',
        title: step.callTarget ? 'Caller-side output expressions' : 'Outputs',
        ...property(step.value, 'outputs'),
        rows: outputRows(step.value.outputs),
      },
      ...(step.callTarget
        ? [
            {
              kind: 'tree' as const,
              title: 'Declared callee inputs',
              ...property(callee?.value, 'inputs'),
            },
            {
              kind: 'tree' as const,
              title: 'Declared callee outputs',
              ...property(callee?.value, 'outputs'),
            },
          ]
        : []),
      {
        kind: 'tree',
        title: 'Success criteria (not evaluated)',
        ...property(step.value, 'successCriteria'),
      },
      {
        kind: 'values',
        title: 'Source / operation',
        present: true,
        rows: [
          ...outputRows(step.sourceBinding.locators),
          {
            label: 'Source',
            present: !!step.sourceBinding.sourceName,
            value: step.sourceBinding.sourceName,
          },
          { label: 'Source verification', present: true, value: step.sourceBinding.status },
          ...(step.sourceBinding.sourceType === 'asyncapi' && model.inspection.profileId === '1.1'
            ? [
                { label: 'Action', ...property(step.value, 'action') },
                { label: 'Correlation', ...property(step.value, 'correlationId') },
                { label: 'Timeout', ...property(step.value, 'timeout') },
              ]
            : []),
        ],
      },
      {
        kind: 'prerequisites',
        title: 'Prerequisites',
        entries: [...workflow.prerequisites, ...step.prerequisites],
      },
      {
        kind: 'recovery',
        title: 'Possible actions — viewer inspection order',
        cards: (['onSuccess', 'onFailure'] as const).flatMap((channel) =>
          step.effectiveActions[channel].map((action) =>
            recoveryCard(action, workflowId, step.stepId),
          ),
        ),
      },
    ],
  };
  return { title: `${workflowId}.${stepId}`, sections, reading };
}
