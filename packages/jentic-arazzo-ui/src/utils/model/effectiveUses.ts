import type { WorkflowActionAddress, WorkflowLocation } from '../../types/location';
import { encodePointer } from '../contract/pointer';
import { actionAddress } from '../location/resolve';
import type { ArazzoViewerModel, EffectiveAction } from './viewerModel';

// applicability follows the viewer's inspection policy, not evaluated action selection.
export interface EffectiveActionUse {
  documentId: string;
  revision: string;
  workflowId: string;
  stepId: string;
  declarationPointer: string;
  usePointer: string;
  origin: 'inherited' | 'override' | 'step';
  address: WorkflowActionAddress;
  action: EffectiveAction;
}

export function effectiveActionUses(
  model: ArazzoViewerModel,
  document: { documentId: string; revision: string; uri: string },
): EffectiveActionUse[] {
  return model.workflows.flatMap((workflow) =>
    workflow.steps.flatMap((step) =>
      [...step.effectiveActions.onSuccess, ...step.effectiveActions.onFailure].map((action) => ({
        documentId: document.documentId,
        revision: document.revision,
        workflowId: workflow.workflowId,
        stepId: step.stepId,
        declarationPointer: encodePointer((action.declarationPath ?? action.path).map(String)),
        usePointer: encodePointer(action.path.map(String)),
        origin:
          action.origin === 'workflow' ? 'inherited' : action.isOverride ? 'override' : 'step',
        address: actionAddress(action, document.uri),
        action,
      })),
    ),
  );
}

export function effectiveUseLocation(
  base: WorkflowLocation,
  use: EffectiveActionUse,
): WorkflowLocation {
  return {
    ...structuredClone(base),
    selection: {
      kind: 'action',
      workflowId: use.workflowId,
      stepId: use.stepId,
      action: structuredClone(use.address),
    },
  };
}

export const pointersOverlap = (a: string, b: string) =>
  a === b || a.startsWith(b + '/') || b.startsWith(a + '/') || a === '#' || b === '#';
