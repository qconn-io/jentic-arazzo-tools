import type { ClassifiedTarget, PlainObject, TargetContext } from './types';

export function targetClassifier(document: PlainObject) {
  const workflows: PlainObject[] = Array.isArray(document.workflows) ? document.workflows : [];
  const sources: PlainObject[] = Array.isArray(document.sourceDescriptions)
    ? document.sourceDescriptions
    : [];
  return (reference: string, context: TargetContext): ClassifiedTarget => {
    const base = { reference, role: context.role, navigable: false };
    const wantsStep = context.role === 'step-prerequisite' || context.targetType === 'step';
    const wantsWorkflow =
      context.role === 'workflow-prerequisite' ||
      context.role === 'call' ||
      context.targetType === 'workflow';
    const malformed = (reason: string): ClassifiedTarget => ({
      ...base,
      kind: 'malformed',
      reason,
    });
    const local = (workflowId: string, stepId?: string): ClassifiedTarget => {
      if (context.role === 'action' && stepId !== undefined && workflowId !== context.workflowId)
        return malformed('action step targets must belong to the current workflow');
      const workflow = workflows.find((w) => w.workflowId === workflowId);
      if (!workflow)
        return {
          ...base,
          kind: 'missing',
          workflowId,
          stepId,
          reason: 'workflow is not present in this document',
        };
      if (
        stepId !== undefined &&
        !(workflow.steps ?? []).some((step: PlainObject) => step.stepId === stepId)
      ) {
        return {
          ...base,
          kind: 'missing',
          workflowId,
          stepId,
          reason: 'step is not present in its owning workflow',
        };
      }
      return {
        ...base,
        kind: stepId === undefined ? 'local-workflow' : 'local-step',
        workflowId,
        stepId,
        navigable: true,
      };
    };
    if (typeof reference !== 'string' || !reference)
      return malformed('target must be a nonempty string');
    if (reference.startsWith('$sourceDescriptions.')) {
      if (context.role === 'action' && wantsStep)
        return malformed('action step targets must belong to the current workflow');
      const rest = reference.slice('$sourceDescriptions.'.length);
      const candidates = sources.filter(
        (source) => typeof source.name === 'string' && rest.startsWith(`${source.name}.`),
      );
      if (candidates.length > 1)
        return {
          ...base,
          kind: 'ambiguous',
          reason: 'more than one declared source matches this target',
        };
      const source = candidates[0];
      if (!source) return { ...base, kind: 'missing', reason: 'external source is not declared' };
      const sourceInfo = { sourceName: source.name, sourceType: source.type };
      if (source.type !== 'arazzo')
        return {
          ...base,
          ...sourceInfo,
          kind: 'malformed',
          reason: 'workflow targets require an Arazzo source',
        };
      const target = rest.slice(source.name.length + 1);
      const separator = target.lastIndexOf('.steps.');
      const workflowId = separator < 0 ? target : target.slice(0, separator);
      const stepId = separator < 0 ? undefined : target.slice(separator + '.steps.'.length);
      if (!workflowId || stepId === '')
        return malformed('external workflow or step identifier is empty');
      if (wantsStep && !stepId) return malformed('a step prerequisite must identify a step');
      if (wantsWorkflow && stepId) return malformed('this role requires a workflow target');
      return {
        ...base,
        ...sourceInfo,
        workflowId,
        stepId,
        kind: stepId ? 'external-step' : 'external-workflow',
        reason: 'external document has not been fetched',
      };
    }
    if (reference.startsWith('$workflows.')) {
      const target = reference.slice('$workflows.'.length);
      // match complete indexed identifiers, retaining dots in both workflow and step IDs.
      const matches: { workflowId: string; stepId?: string }[] = [];
      for (const workflow of workflows) {
        if (target === workflow.workflowId) matches.push({ workflowId: workflow.workflowId });
        for (const step of workflow.steps ?? []) {
          if (target === `${workflow.workflowId}.steps.${step.stepId}`)
            matches.push({ workflowId: workflow.workflowId, stepId: step.stepId });
        }
      }
      const roleMatches = matches.filter((match) =>
        wantsStep ? match.stepId !== undefined : wantsWorkflow ? match.stepId === undefined : true,
      );
      if (roleMatches.length > 1)
        return {
          ...base,
          kind: 'ambiguous',
          reason: 'target matches multiple indexed identifiers',
        };
      if (roleMatches.length === 1) {
        const match = roleMatches[0];
        if (wantsStep && !match.stepId)
          return malformed('a step prerequisite must identify a step');
        if (wantsWorkflow && match.stepId) return malformed('this role requires a workflow target');
        return local(match.workflowId, match.stepId);
      }
      const separator = target.lastIndexOf('.steps.');
      if (
        !target ||
        (separator >= 0 && (!target.slice(0, separator) || !target.slice(separator + 7)))
      )
        return malformed('workflow or step identifier is empty');
      if (wantsWorkflow && separator >= 0) return malformed('this role requires a workflow target');
      if (wantsStep && separator < 0) return malformed('a step prerequisite must identify a step');
      return separator >= 0
        ? local(target.slice(0, separator), target.slice(separator + 7))
        : local(target);
    }
    if (reference.startsWith('$'))
      return malformed('target expression is not understood by this inspection profile');
    if (wantsStep) return local(context.workflowId ?? '', reference);
    return local(reference);
  };
}
