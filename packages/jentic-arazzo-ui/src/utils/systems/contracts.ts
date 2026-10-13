import type { ArazzoViewerModel, ViewerStep } from '../model/viewerModel';
import type { OperationSourceCandidate } from '../contract/OperationStatusResolver';
import { resolveStepOperation } from '../contract/stepOperation';
import { resolvePointer } from '../contract/pointer';
import type { ContractDeclarationIdentity } from '../contract/types';
import type { WorkflowEventAssociation, WorkflowContractIdentity } from '../../types/profile';

export function lookupSystemOperation(
  model: ArazzoViewerModel,
  step: ViewerStep,
  loaded: Readonly<Record<string, OperationSourceCandidate>>,
) {
  return resolveStepOperation(model, step, loaded);
}
function identityMatches(
  actual: ContractDeclarationIdentity | undefined,
  expected: WorkflowContractIdentity,
): boolean {
  if (
    !actual ||
    actual.status !== 'located' ||
    (expected.revision !== undefined && actual.revision !== expected.revision)
  )
    return false;
  try {
    const a = resolvePointer(actual.pointer, actual.uri);
    const e = resolvePointer(expected.pointer, expected.uri);
    return a.uri === e.uri && a.pointer === e.pointer;
  } catch {
    return false;
  }
}
export function validateEventAssociation(
  model: ArazzoViewerModel,
  association: WorkflowEventAssociation,
  loaded: Readonly<Record<string, OperationSourceCandidate>>,
) {
  const producer = model.stepsByWorkflow
    .get(association.producer.workflowId)
    ?.get(association.producer.stepId);
  const consumer = model.stepsByWorkflow
    .get(association.consumer.workflowId)
    ?.get(association.consumer.stepId);
  if (!producer || !consumer) return { valid: false, diagnostic: 'Unavailable event endpoint' };
  const p = lookupSystemOperation(model, producer, loaded);
  const c = lookupSystemOperation(model, consumer, loaded);
  if (p.status !== 'located' || c.status !== 'located')
    return {
      valid: false,
      diagnostic: `Contract not established: producer ${p.status}, consumer ${c.status}`,
    };
  if (p.operation?.action !== 'send' || c.operation?.action !== 'receive')
    return {
      valid: false,
      diagnostic: 'Declared send/receive direction does not match association',
    };
  if (
    ![p.operation, c.operation].every(
      (op) =>
        identityMatches(op?.channelIdentity, association.channel) &&
        op?.messageIdentities?.some((m) => identityMatches(m, association.message)),
    )
  )
    return {
      valid: false,
      diagnostic: 'Channel/message declaration is different, stale or unresolved',
    };
  return {
    valid: true,
    diagnostic: 'Declared event association; delivery and correlation success are not established',
  };
}
