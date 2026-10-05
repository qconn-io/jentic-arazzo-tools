import { MarkerType } from 'reactflow';

import type { ArazzoDocument, Workflow } from '../../types/arazzo';
import type { ArazzoNode, ArazzoEdge } from '../../types/viewer';
import type { OverviewWorkflowNodeData } from '../../nodes/WorkflowNode';
import type { RelationshipEdgeData } from '../../edges/RelationshipEdge';
import { createSnapshot, inspect } from '../inspection';
import {
  buildViewerModel,
  type ArazzoViewerModel,
  type WorkflowRelationship,
} from '../model/viewerModel';
import {
  layoutRelationshipGraph,
  prerequisiteCycleEdges,
  OVERVIEW_WIDTH,
  OVERVIEW_HEIGHT,
  type LayoutRelationship,
} from '../model/graphLayout';

function relationshipLabel(relationship: WorkflowRelationship): string {
  if (relationship.kind === 'prerequisite') return `Prerequisite ${relationship.target.reference}`;
  const parameterCount = relationship.parameters.length;
  const parameters = `${parameterCount} parameter${parameterCount === 1 ? '' : 's'}`;
  if (relationship.kind === 'call') return `Call from ${relationship.sourceStepId} · ${parameters}`;
  const channel = relationship.channel === 'onFailure' ? 'failure' : 'success';
  const criteria = relationship.criteria?.length
    ? ` · criteria: ${relationship.criteria.map((criterion) => (typeof criterion === 'object' && criterion !== null && 'condition' in criterion ? String(criterion.condition) : JSON.stringify(criterion))).join('; ')}`
    : '';
  return `${relationship.actionName} · ${channel}/${relationship.actionType} · step ${relationship.sourceStepId} · ${parameters}${criteria}`;
}

/** convert the shared semantic model into a complete document relationship graph. */
export function convertDocumentToFlow(
  document: ArazzoDocument,
  options?: {
    onWorkflowClick?: (workflowId: string) => void;
    model?: ArazzoViewerModel;
  },
): { nodes: ArazzoNode[]; edges: ArazzoEdge[] } {
  const model = options?.model ?? buildViewerModel(inspect(createSnapshot(document)));
  const nodes: ArazzoNode[] = [];
  const edges: ArazzoEdge[] = [];
  const nodeIds = new Map(
    model.workflows.map((workflow) => [workflow.workflowId, `doc-workflow-${workflow.internalId}`]),
  );
  const supplementCount = new Map<string, number>();
  const supplemental: Array<{
    id: string;
    owner: string;
    index: number;
    relationship: WorkflowRelationship;
  }> = [];
  const projected: Array<LayoutRelationship & { relationship: WorkflowRelationship }> = [];
  for (const relationship of model.relationships) {
    const owner = nodeIds.get(relationship.sourceWorkflowId);
    if (!owner) continue;
    let referenceNode: string;
    if (
      relationship.target.kind === 'local-workflow' &&
      relationship.targetWorkflowId &&
      nodeIds.has(relationship.targetWorkflowId)
    ) {
      referenceNode = nodeIds.get(relationship.targetWorkflowId)!;
    } else {
      const index = supplementCount.get(owner) || 0;
      supplementCount.set(owner, index + 1);
      referenceNode = JSON.stringify(['overview-reference', model.documentId, relationship.id]);
      supplemental.push({ id: referenceNode, owner, index, relationship });
    }
    projected.push({
      id: relationship.id,
      kind: relationship.kind,
      source: relationship.kind === 'prerequisite' ? referenceNode : owner,
      target: relationship.kind === 'prerequisite' ? owner : referenceNode,
      relationship,
    });
  }
  const ids = [...nodeIds.values()];
  const positions = layoutRelationshipGraph(ids, projected, supplementCount);
  const cycleEdges = prerequisiteCycleEdges(ids, projected);
  for (const workflow of model.workflows) {
    const id = nodeIds.get(workflow.workflowId)!;
    const data: OverviewWorkflowNodeData = {
      type: 'workflow',
      workflow: workflow.value as Workflow,
      onClick: options?.onWorkflowClick,
      warning: projected.some(
        (edge) => cycleEdges.has(edge.id) && (edge.source === id || edge.target === id),
      )
        ? 'Prerequisite cycle'
        : undefined,
    };
    nodes.push({
      id,
      type: 'workflow',
      position: positions.get(id)!,
      width: OVERVIEW_WIDTH,
      height: OVERVIEW_HEIGHT,
      data,
    });
  }
  for (const supplement of supplemental) {
    const target = supplement.relationship.target;
    const owner = positions.get(supplement.owner)!;
    const referenceKind = target.kind.startsWith('external')
      ? 'external'
      : target.kind === 'missing'
        ? 'missing'
        : target.kind === 'malformed'
          ? 'malformed'
          : 'unsupported';
    const data: OverviewWorkflowNodeData = {
      type: 'workflow',
      workflow: { workflowId: target.workflowId || target.reference, steps: [] },
      referenceKind,
      referenceLabel: target.reference,
      warning:
        target.reason ||
        (referenceKind === 'external' ? 'External source not fetched' : `${referenceKind} target`),
    };
    nodes.push({
      id: supplement.id,
      type: 'workflow',
      position: { x: owner.x + (supplement.index + 1) * (OVERVIEW_WIDTH + 100), y: owner.y },
      width: OVERVIEW_WIDTH,
      height: OVERVIEW_HEIGHT,
      data,
    });
  }
  const lanes = new Map<string, number>();
  for (const [index, edge] of projected.entries()) {
    // unordered endpoint grouping also separates reciprocal relationships.
    const key = JSON.stringify([edge.source, edge.target].sort());
    const lane = lanes.get(key) || 0;
    lanes.set(key, lane + 1);
    const relationship = edge.relationship;
    const warning = cycleEdges.has(edge.id)
      ? 'Prerequisite cycle'
      : relationship.target.kind === 'local-workflow'
        ? undefined
        : `${relationship.target.kind} target`;
    const data: RelationshipEdgeData = {
      type: 'relationship',
      kind: relationship.kind,
      label: relationshipLabel(relationship),
      compactLabel: `R${index + 1} · ${relationship.actionType || relationship.kind}${warning ? ' · warning' : ''}`,
      lane,
      selfLoop: edge.source === edge.target,
      warning,
      channel:
        relationship.channel === 'onFailure'
          ? 'failure'
          : relationship.channel === 'onSuccess'
            ? 'success'
            : undefined,
      actionType: relationship.actionType,
      provenance: {
        workflowId: relationship.sourceWorkflowId,
        stepId: relationship.sourceStepId,
        path: relationship.path,
        declarationPath: relationship.declarationPath,
      },
      relationship,
    };
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ariaLabel: `${data.compactLabel}: ${data.label}${warning ? ` · ${warning}` : ''}`,
      type: 'relationship',
      sourceHandle: 'relationship-out',
      targetHandle: 'relationship-in',
      markerEnd: { type: MarkerType.ArrowClosed },
      data,
    });
  }
  return { nodes, edges };
}
