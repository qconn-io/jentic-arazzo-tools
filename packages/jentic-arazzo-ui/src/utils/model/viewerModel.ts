import type { ArazzoDocument } from '../../types/arazzo';
import type {
  ActionChannel,
  ActionFact,
  ClassifiedTarget,
  InspectionResult,
  OccurrencePath,
  ParameterFact,
  StepFact,
  WorkflowFact,
} from '../inspection';
import { clone } from '../inspection/snapshot';
import { prerequisiteCycleEdges } from './graphLayout';

export interface EffectiveAction extends ActionFact {
  effectiveIndex: number;
  isOverride: boolean;
  applicableWorkflowId: string;
  applicableStepId: string;
}
export interface ViewerStep extends StepFact {
  internalId: string;
  nodeId: string;
  effectiveActions: Record<ActionChannel, EffectiveAction[]>;
}
export interface ViewerWorkflow extends WorkflowFact {
  internalId: string;
  nodeId: string;
  steps: ViewerStep[];
}
export interface WorkflowRelationship {
  id: string;
  kind: 'prerequisite' | 'call' | 'action';
  sourceWorkflowId: string;
  targetWorkflowId?: string;
  sourceStepId?: string;
  target: ClassifiedTarget;
  channel?: ActionChannel;
  actionType?: string;
  actionName?: string;
  criteria?: Record<string, any>[];
  parameters: ParameterFact[];
  path: OccurrencePath;
  declarationPath?: OccurrencePath;
  action?: EffectiveAction;
}
export interface ArazzoViewerModel {
  documentId: string;
  inspection: InspectionResult;
  document: ArazzoDocument;
  support: InspectionResult['support'];
  diagnostics: InspectionResult['diagnostics'];
  orderLabel: 'Viewer inspection order';
  workflows: ViewerWorkflow[];
  workflowsById: Map<string, ViewerWorkflow>;
  stepsByWorkflow: Map<string, Map<string, ViewerStep>>;
  nodeIds: Map<string, Map<string, string>>;
  relationships: WorkflowRelationship[];
}

// this ordering is presentation policy; extraction retains both authored collections.
function effectiveActions(
  workflow: WorkflowFact,
  step: StepFact,
  channel: ActionChannel,
): EffectiveAction[] {
  const defaults = workflow.actions[channel];
  const declared = step.actions[channel];
  const matches = (a: ActionFact, b: ActionFact) =>
    a.status === 'resolved' &&
    b.status === 'resolved' &&
    a.value.name === b.value.name &&
    a.value.type === b.value.type;
  const entries = [
    ...declared.map((entry) => ({
      entry,
      isOverride: defaults.some((other) => matches(entry, other)),
    })),
    ...defaults
      .filter((entry) => !declared.some((other) => matches(entry, other)))
      .map((entry) => ({ entry, isOverride: false })),
  ];
  return entries.map(({ entry, isOverride }, effectiveIndex) => {
    const effective = {
      ...entry,
      effectiveIndex,
      isOverride,
      applicableWorkflowId: workflow.workflowId,
      applicableStepId: step.stepId,
    };
    // an inherited retry without a target retries its applicable step.
    if (
      entry.status === 'resolved' &&
      entry.value.type === 'retry' &&
      !entry.target &&
      !entry.value.workflowId &&
      !entry.value.stepId
    ) {
      effective.target = {
        kind: 'local-step',
        reference: step.stepId,
        role: 'action',
        workflowId: workflow.workflowId,
        stepId: step.stepId,
        navigable: true,
      };
    }
    return effective;
  });
}

export function buildViewerModel(inspection: InspectionResult): ArazzoViewerModel {
  const document = clone(inspection.raw);
  const suppliedIds = new Map<string, number>();
  for (const workflow of inspection.workflows) {
    for (const value of [workflow.value, ...workflow.steps.map((step) => step.value)]) {
      if (typeof value._internalId === 'string' && value._internalId)
        suppliedIds.set(value._internalId, (suppliedIds.get(value._internalId) ?? 0) + 1);
    }
  }
  const suppliedNodeIds = new Map<string, number>();
  for (const workflow of inspection.workflows)
    for (const step of workflow.steps) {
      if (
        typeof workflow.value._internalId === 'string' &&
        typeof step.value._internalId === 'string'
      ) {
        const nodeId = `${workflow.value._internalId}-${step.value._internalId}`;
        suppliedNodeIds.set(nodeId, (suppliedNodeIds.get(nodeId) ?? 0) + 1);
      }
    }
  const used = new Set<string>();
  const trackingId = (value: Record<string, any>, parts: unknown[], allowExisting = true) => {
    const existing = value._internalId;
    if (
      inspection.snapshot.trustedInternalIds &&
      allowExisting &&
      typeof existing === 'string' &&
      suppliedIds.get(existing) === 1 &&
      !used.has(existing)
    ) {
      used.add(existing);
      return existing;
    }
    const baseId = `viewer-${JSON.stringify(parts)}`;
    let id = baseId;
    let suffix = 0;
    while (used.has(id) || suppliedIds.has(id)) id = `${baseId}-${++suffix}`;
    used.add(id);
    return id;
  };
  const nodeIds = new Map<string, Map<string, string>>();
  const relationships: WorkflowRelationship[] = [];
  const addRelationship = (relationship: Omit<WorkflowRelationship, 'id'>) => {
    const target = relationship.target;
    relationships.push({
      ...relationship,
      id: JSON.stringify([
        inspection.documentId,
        relationship.kind,
        relationship.sourceWorkflowId,
        relationship.sourceStepId ?? null,
        relationship.channel ?? null,
        relationship.action?.authoredIndex ?? null,
        relationship.actionType ?? null,
        relationship.path,
        relationship.declarationPath ?? null,
        target.kind,
        target.sourceName ?? null,
        target.workflowId ?? null,
        target.stepId ?? null,
      ]),
    });
  };
  const workflowTrackingIds = new Map(
    inspection.workflows.map((workflow) => [
      workflow.workflowId,
      trackingId(workflow.value, [inspection.documentId, 'workflow', workflow.authoredIndex]),
    ]),
  );
  const structuralNodeIds = new Set(
    [...workflowTrackingIds.values()].flatMap((id) => [id, `${id}-start`, `${id}-end`]),
  );
  const usedNodeIds = new Set<string>();
  const workflows = inspection.workflows.map((workflow): ViewerWorkflow => {
    const internalId = workflowTrackingIds.get(workflow.workflowId)!;
    const stepIds = new Map<string, string>();
    nodeIds.set(workflow.workflowId, stepIds);
    const renderWorkflow = document.workflows?.[workflow.authoredIndex];
    if (renderWorkflow) renderWorkflow._internalId = internalId;
    const steps = workflow.steps.map((step): ViewerStep => {
      const suppliedNodeId = `${workflow.value._internalId}-${step.value._internalId}`;
      let stepInternalId = trackingId(
        step.value,
        [inspection.documentId, 'step', workflow.authoredIndex, step.authoredIndex],
        suppliedNodeIds.get(suppliedNodeId) === 1,
      );
      const baseStepInternalId = stepInternalId;
      let nodeId = `${internalId}-${stepInternalId}`;
      let suffix = 0;
      while (
        usedNodeIds.has(nodeId) ||
        structuralNodeIds.has(nodeId) ||
        (suppliedNodeIds.has(nodeId) && nodeId !== suppliedNodeId)
      ) {
        do {
          stepInternalId = `${baseStepInternalId}-${++suffix}`;
        } while (used.has(stepInternalId));
        nodeId = `${internalId}-${stepInternalId}`;
      }
      used.add(stepInternalId);
      usedNodeIds.add(nodeId);
      stepIds.set(step.stepId, nodeId);
      if (renderWorkflow?.steps?.[step.authoredIndex])
        renderWorkflow.steps[step.authoredIndex]._internalId = stepInternalId;
      const effective = {
        onSuccess: effectiveActions(workflow, step, 'onSuccess'),
        onFailure: effectiveActions(workflow, step, 'onFailure'),
      };
      if (step.callTarget)
        addRelationship({
          kind: 'call',
          sourceWorkflowId: workflow.workflowId,
          sourceStepId: step.stepId,
          targetWorkflowId: step.callTarget.workflowId,
          target: step.callTarget,
          path: [...step.path, 'workflowId'],
          parameters: step.parameters,
        });
      for (const channel of ['onSuccess', 'onFailure'] as const)
        for (const action of effective[channel]) {
          if (
            action.status !== 'resolved' ||
            !action.target ||
            action.value.type === 'end' ||
            ['ambiguous', 'malformed'].includes(action.target.kind)
          )
            continue;
          // local step transitions remain in the step model, not the workflow overview.
          if (
            action.target.kind === 'local-step' &&
            action.target.workflowId === workflow.workflowId
          )
            continue;
          addRelationship({
            kind: 'action',
            sourceWorkflowId: workflow.workflowId,
            sourceStepId: step.stepId,
            targetWorkflowId: action.target.workflowId,
            target: action.target,
            channel,
            actionType: action.value.type,
            actionName: action.value.name,
            criteria: clone(action.value.criteria),
            parameters: action.parameters,
            path: action.path,
            declarationPath: action.declarationPath,
            action,
          });
        }
      return { ...step, internalId: stepInternalId, nodeId, effectiveActions: effective };
    });
    for (const prerequisite of workflow.prerequisites)
      addRelationship({
        kind: 'prerequisite',
        sourceWorkflowId: workflow.workflowId,
        targetWorkflowId: prerequisite.target.workflowId,
        target: prerequisite.target,
        path: prerequisite.path,
        declarationPath: prerequisite.declarationPath,
        parameters: [],
      });
    return { ...workflow, internalId, nodeId: internalId, steps };
  });
  const diagnostics = [...inspection.diagnostics];
  const cycles = prerequisiteCycleEdges(
    workflows.map((workflow) => workflow.workflowId),
    relationships
      .filter(
        (relationship) =>
          relationship.kind === 'prerequisite' && relationship.target.kind === 'local-workflow',
      )
      .map((relationship) => ({
        id: relationship.id,
        kind: relationship.kind,
        source: relationship.targetWorkflowId!,
        target: relationship.sourceWorkflowId,
      })),
  );
  for (const relationship of relationships)
    if (cycles.has(relationship.id)) {
      diagnostics.push({
        phase: 'inspection',
        category: 'prerequisite-cycle',
        severity: 'warning',
        code: 'prerequisite-cycle',
        message: 'workflow prerequisite participates in a prerequisite-only cycle',
        workflowId: relationship.sourceWorkflowId,
        path: relationship.path,
        declarationPath: relationship.declarationPath,
        reference: relationship.target.reference,
        originalReference: relationship.target.reference,
      });
    }
  return {
    documentId: inspection.documentId,
    inspection,
    document,
    support: inspection.support,
    diagnostics,
    orderLabel: 'Viewer inspection order',
    workflows,
    workflowsById: new Map(workflows.map((workflow) => [workflow.workflowId, workflow])),
    stepsByWorkflow: new Map(
      workflows.map((workflow) => [
        workflow.workflowId,
        new Map(workflow.steps.map((step) => [step.stepId, step])),
      ]),
    ),
    nodeIds,
    relationships,
  };
}
