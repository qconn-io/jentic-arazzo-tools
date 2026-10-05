import { MarkerType } from 'reactflow';

import type { Workflow, ArazzoDocument } from '../../types/arazzo';
import type {
  ArazzoNode,
  ArazzoEdge,
  ConversionOptions,
  StepNodeData,
  WorkflowRefNodeData,
} from '../../types/viewer';
import type { ViewerStep, EffectiveAction, ArazzoViewerModel } from '../model/viewerModel';
import { buildViewerModel, transferSemantics } from '../model/viewerModel';
import { inspect, createSnapshot, type ClassifiedTarget } from '../inspection';
import type { RelationshipEdgeData } from '../../edges/RelationshipEdge';

export type InspectionStepNodeData = (StepNodeData | WorkflowRefNodeData) & {
  inspectionStep?: ViewerStep;
};
export interface InspectionReferenceNodeData {
  type: 'externalWorkflow';
  workflowId: string;
  workflow?: Workflow;
  target: ClassifiedTarget;
  ownerNodeId: string;
  referenceLabel: string;
}
export function actionHandle(action: EffectiveAction): string {
  return `action-${action.channel}-${action.effectiveIndex}`;
}

/** create nodes in authored order and overlay declared transitions without predicting execution. */
export function convertWorkflowToFlow(
  workflow: Workflow,
  options?: ConversionOptions,
  document?: ArazzoDocument,
  suppliedModel?: ArazzoViewerModel,
): { nodes: ArazzoNode[]; edges: ArazzoEdge[] } {
  const model =
    suppliedModel ??
    buildViewerModel(
      inspect(
        createSnapshot(
          document ?? {
            arazzo: '1.0.1',
            info: { title: '', version: '' },
            sourceDescriptions: [],
            workflows: [workflow],
          },
          { trustedInternalIds: !document },
        ),
      ),
    );
  const viewed = model.workflowsById.get(workflow.workflowId);
  if (!viewed) return { nodes: [], edges: [] };
  const authored = model.document.workflows.find(
    (item) => item.workflowId === workflow.workflowId,
  )!;
  const nodes: ArazzoNode[] = [];
  const edges: ArazzoEdge[] = [];
  const prefix = viewed.internalId;
  const start = `${prefix}-start`;
  const end = `${prefix}-end`;
  nodes.push({
    id: start,
    type: 'start',
    position: { x: 0, y: 0 },
    data: {
      type: 'start',
      workflowId: workflow.workflowId,
      inputs: workflow.inputs,
      description: workflow.description,
    },
  });
  for (const step of viewed.steps) {
    const value = authored.steps.find((item) => item.stepId === step.stepId)!;
    const data: InspectionStepNodeData = step.callTarget
      ? {
          type: 'workflowRef',
          step: value,
          workflowId: workflow.workflowId,
          targetWorkflowId: value.workflowId || step.callTarget.reference,
          isValid:
            step.callTarget.kind === 'local-workflow' ||
            step.callTarget.kind === 'external-workflow',
          inspectionStep: step,
        }
      : {
          type: 'step',
          step: value,
          workflowId: workflow.workflowId,
          isValid: !!(value.operationId || value.operationPath || value.channelPath),
          inspectionStep: step,
        };
    nodes.push({ id: step.nodeId, type: data.type, position: { x: 0, y: 0 }, data });
  }
  nodes.push({
    id: end,
    type: 'end',
    position: { x: 0, y: 0 },
    data: { type: 'end', workflowId: workflow.workflowId, outputs: workflow.outputs },
  });
  const chain = [start, ...viewed.steps.map((step) => step.nodeId), end];
  for (let i = 0; i < chain.length - 1; i++) {
    edges.push({
      id: JSON.stringify([model.documentId, workflow.workflowId, 'authored-order', i]),
      source: chain[i],
      target: chain[i + 1],
      sourceHandle: i ? 'sequential' : undefined,
      type: 'sequential',
      label: 'Authored order',
      data: { type: 'sequential' },
      markerEnd: { type: MarkerType.ArrowClosed },
    });
  }
  const referenceNode = (
    target: ClassifiedTarget,
    owner: ViewerStep,
    occurrence: unknown,
  ): string => {
    const id = JSON.stringify([
      model.documentId,
      workflow.workflowId,
      'reference',
      owner.stepId,
      occurrence,
      target.kind,
      target.reference,
    ]);
    const data: InspectionReferenceNodeData = {
      type: 'externalWorkflow',
      workflowId: target.workflowId || target.reference,
      target,
      ownerNodeId: owner.nodeId,
      referenceLabel: target.reference,
      workflow:
        target.kind === 'local-workflow'
          ? model.document.workflows.find((item) => item.workflowId === target.workflowId)
          : undefined,
    };
    nodes.push({ id, type: 'externalWorkflow', position: { x: 0, y: 0 }, data });
    return id;
  };
  const targetNode = (target: ClassifiedTarget, owner: ViewerStep, occurrence: unknown): string => {
    if (target.kind === 'local-step' && target.workflowId === workflow.workflowId)
      return model.nodeIds.get(workflow.workflowId)!.get(target.stepId!)!;
    return referenceNode(target, owner, occurrence);
  };
  viewed.steps.forEach((step, index) => {
    const callTransfer = transferSemantics(step);
    if (step.callTarget) {
      const target = referenceNode(step.callTarget, step, 'call');
      edges.push({
        id: JSON.stringify([step.nodeId, 'call']),
        source: step.nodeId,
        sourceHandle: 'call',
        target,
        type: 'sequential',
        label: 'Call',
        data: { type: 'sequential' },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
      if (callTransfer?.returnTo === 'next-step')
        edges.push({
          id: JSON.stringify([step.nodeId, 'call-return']),
          source: target,
          sourceHandle: 'return',
          target: chain[index + 2],
          type: 'sequential',
          label: 'Call return',
          data: { type: 'sequential' },
          markerEnd: { type: MarkerType.ArrowClosed },
        });
    }
    for (const channel of ['onSuccess', 'onFailure'] as const) {
      for (const action of step.effectiveActions[channel]) {
        if (action.status !== 'resolved' || !action.target || action.value.type === 'end') continue;
        const target = targetNode(action.target, step, [channel, action.effectiveIndex]);
        const type =
          action.value.type === 'retry' ? 'retry' : channel === 'onSuccess' ? 'success' : 'failure';
        const data = {
          type,
          action: action.value,
          criteria: action.value.criteria,
          retryAfter: action.value.retryAfter,
          retryLimit: action.value.retryLimit,
          isInherited: action.origin === 'workflow',
          provenance: {
            path: action.path,
            declarationPath: action.declarationPath,
            applicableWorkflowId: action.applicableWorkflowId,
            applicableStepId: action.applicableStepId,
          },
          effectiveAction: action,
        };
        edges.push({
          id: JSON.stringify([
            model.documentId,
            step.nodeId,
            channel,
            action.effectiveIndex,
            action.path,
            'transition',
          ]),
          source: step.nodeId,
          target,
          sourceHandle: actionHandle(action),
          type,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: type === 'success' ? '#16a34a' : type === 'failure' ? '#dc2626' : '#b45309',
          },
          label: action.value.name,
          data,
        } as ArazzoEdge);
        if (transferSemantics(step, action)?.returnTo === 'source-step')
          edges.push({
            id: JSON.stringify([step.nodeId, channel, action.effectiveIndex, 'retry-return']),
            source: target,
            sourceHandle: action.target.kind === 'local-step' ? 'sequential' : 'return',
            target: step.nodeId,
            type: 'sequential',
            label: 'Retry return',
            data: { type: 'sequential' },
            markerEnd: { type: MarkerType.ArrowClosed },
          });
      }
    }
    step.prerequisites.forEach((prerequisite, lane) => {
      const source = targetNode(prerequisite.target, step, [
        'prerequisite',
        prerequisite.authoredIndex,
      ]);
      const data: RelationshipEdgeData = {
        type: 'relationship',
        kind: 'prerequisite',
        label: `Prerequisite ${prerequisite.target.reference}`,
        lane,
        sideRoute: true,
        selfLoop: source === step.nodeId,
        warning: prerequisite.target.kind === 'local-step' ? undefined : prerequisite.target.kind,
        provenance: prerequisite,
      };
      edges.push({
        id: JSON.stringify([
          model.documentId,
          workflow.workflowId,
          step.stepId,
          'prerequisite',
          prerequisite.path,
        ]),
        source,
        target: step.nodeId,
        sourceHandle: 'prerequisite-out',
        targetHandle: 'prerequisite-in',
        type: 'relationship',
        data,
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    });
  });
  // positions are owned by sequentialLayout; options are retained for caller compatibility.
  void options;
  return { nodes, edges };
}
