import type { ArazzoDocument } from '../../types/arazzo';
import type { WorkflowViewProfile, WorkflowProfileProvenance } from '../../types/profile';
import { encodePointer } from '../contract/pointer';

/** Explicitly translate the digital-product example's presentation extensions. @public */
export function digitalProductProfile(
  document: ArazzoDocument,
  identity: string,
  revision?: string,
): WorkflowViewProfile {
  const profile: WorkflowViewProfile = {
    version: 1,
    document: identity,
    revision,
    participants: [],
    actors: [],
    sourceOwners: [],
    implementations: [],
    events: [],
  };
  const provenance = (path: string[]): WorkflowProfileProvenance => ({
    kind: 'authored',
    document: identity,
    pointer: encodePointer(path),
  });
  const participants = (document as unknown as Record<string, unknown>)['x-example-participants'];
  if (participants && typeof participants === 'object')
    for (const [id, name] of Object.entries(participants)) {
      if (typeof name === 'string')
        profile.participants.push({
          id,
          name,
          provenance: provenance(['x-example-participants', id]),
        });
    }
  // source ownership is an explicit adapter convention for this example schema.
  for (const [i, source] of document.sourceDescriptions.entries())
    if (profile.participants.some((p) => p.id === source.name))
      profile.sourceOwners.push({
        sourceName: source.name,
        participant: source.name,
        provenance: provenance(['sourceDescriptions', String(i), 'name']),
      });
  for (const [wi, workflow] of document.workflows.entries())
    for (const [si, step] of workflow.steps.entries()) {
      const path = ['workflows', String(wi), 'steps', String(si)];
      const metadata = step as unknown as Record<string, unknown>;
      if (typeof metadata['x-example-actor'] === 'string')
        profile.actors.push({
          workflowId: workflow.workflowId,
          stepId: step.stepId,
          participant: metadata['x-example-actor'],
          provenance: provenance([...path, 'x-example-actor']),
        });
      if (typeof metadata['x-example-target'] === 'string')
        profile.sourceOwners.push({
          exchange: { workflowId: workflow.workflowId, stepId: step.stepId },
          participant: metadata['x-example-target'],
          provenance: provenance([...path, 'x-example-target']),
        });
      const implValue = metadata['x-example-implementation'];
      const impl =
        implValue && typeof implValue === 'object'
          ? (implValue as Record<string, import('../../types/location').WorkflowLocationJSON>)
          : undefined;
      if (impl && typeof impl === 'object' && typeof impl.workflowId === 'string')
        profile.implementations.push({
          id: `${workflow.workflowId}.${step.stepId}`,
          exchange: { workflowId: workflow.workflowId, stepId: step.stepId },
          workflowId: impl.workflowId,
          mappings: impl,
          provenance: provenance([...path, 'x-example-implementation']),
        });
    }
  // Event packs supply explicit participant/binding/association metadata in their manifest profile.
  return profile;
}
