import type { OccurrencePath, Owner, PlainObject, ReusableOccurrence } from './types';

export function parseReusableReference(reference: string) {
  // Match the resolver's component-name identifier grammar, including dotted names.
  const match =
    /^\$components\.(parameters|successActions|failureActions)\.([A-Za-z0-9._-]+)$/.exec(reference);
  return match && match[0] === reference
    ? { bucket: match[1] as 'parameters' | 'successActions' | 'failureActions', key: match[2] }
    : undefined;
}

export function inventory(document: PlainObject, actionParameters: boolean): ReusableOccurrence[] {
  const occurrences: ReusableOccurrence[] = [];
  const visit = (value: any, path: OccurrencePath, owner: Owner) => {
    if (value && typeof value === 'object' && typeof value.reference === 'string') {
      const parsed = parseReusableReference(value.reference);
      occurrences.push({
        path,
        owner,
        ...owner,
        reference: value.reference,
        ...parsed,
        malformed: !parsed,
      });
    }
  };
  const list = (values: any, path: OccurrencePath, owner: Owner, actions = false) => {
    if (!Array.isArray(values)) return;
    values.forEach((value, index) => {
      const occurrencePath = [...path, index];
      visit(value, occurrencePath, owner);
      if (actions && actionParameters && value && typeof value === 'object') {
        list(value.parameters, [...occurrencePath, 'parameters'], owner);
      }
    });
  };
  (Array.isArray(document.workflows) ? document.workflows : []).forEach(
    (workflow: PlainObject, wi: number) => {
      const owner = { workflowId: workflow.workflowId };
      list(workflow.parameters, ['workflows', wi, 'parameters'], owner);
      list(workflow.successActions, ['workflows', wi, 'successActions'], owner, true);
      list(workflow.failureActions, ['workflows', wi, 'failureActions'], owner, true);
      (Array.isArray(workflow.steps) ? workflow.steps : []).forEach(
        (step: PlainObject, si: number) => {
          const stepOwner = { ...owner, stepId: step.stepId };
          list(step.parameters, ['workflows', wi, 'steps', si, 'parameters'], stepOwner);
          list(step.onSuccess, ['workflows', wi, 'steps', si, 'onSuccess'], stepOwner, true);
          list(step.onFailure, ['workflows', wi, 'steps', si, 'onFailure'], stepOwner, true);
        },
      );
    },
  );
  for (const bucket of ['parameters', 'successActions', 'failureActions']) {
    const values = document.components?.[bucket];
    if (!values || typeof values !== 'object') continue;
    Object.entries(values).forEach(([key, value]) => {
      const path = ['components', bucket, key];
      visit(value, path, {});
      if (bucket !== 'parameters' && actionParameters && value && typeof value === 'object') {
        list((value as PlainObject).parameters, [...path, 'parameters'], {});
      }
    });
  }
  return occurrences;
}
