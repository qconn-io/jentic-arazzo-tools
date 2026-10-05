import type { DocumentSnapshot, InspectionProfile, InspectionResult } from './types';
import { inventory } from './inventory';
import { extractFacts } from './facts';

export * from './types';
export { createSnapshot } from './snapshot';
export { parseReusableReference } from './inventory';

function profile(id: string, selected: boolean): InspectionProfile {
  const features = new Set([
    'workflowPrerequisites',
    'calls',
    'actions',
    'parameters',
    ...(selected ? ['stepPrerequisites', 'actionParameters', 'querystring', 'asyncIntent'] : []),
  ]);
  const result: InspectionProfile = {
    id,
    features,
    supports: (feature) => features.has(feature),
    inventory: (document) => inventory(document, selected),
    extract: (snapshot) => extractFacts(snapshot, result),
  };
  return result;
}
const profiles = new Map([
  ['1.0', profile('1.0', false)],
  ['1.1', profile('1.1', true)],
]);

export function selectProfile(version: string): InspectionProfile | undefined {
  const match = /^(\d+)\.(\d+)\.\d+(?:[-+].*)?$/.exec(version);
  return match ? profiles.get(`${match[1]}.${match[2]}`) : undefined;
}

export function inspect(
  snapshot: DocumentSnapshot,
  privateProfile?: InspectionProfile,
): InspectionResult {
  const selected = privateProfile ?? selectProfile(snapshot.exactVersion);
  if (selected) {
    const workflowIds = new Set<string>();
    for (const workflow of snapshot.document.workflows ?? []) {
      if (
        typeof workflow.workflowId !== 'string' ||
        !workflow.workflowId ||
        workflowIds.has(workflow.workflowId)
      )
        throw new Error('Inspection: missing or duplicate workflow ID');
      workflowIds.add(workflow.workflowId);
      const stepIds = new Set<string>();
      for (const step of workflow.steps ?? []) {
        if (typeof step.stepId !== 'string' || !step.stepId || stepIds.has(step.stepId))
          throw new Error('Inspection: missing or duplicate scoped step ID');
        stepIds.add(step.stepId);
      }
    }
  }
  return selected ? selected.extract(snapshot) : extractFacts(snapshot);
}
