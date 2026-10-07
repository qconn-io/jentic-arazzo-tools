/** Authority for presentation metadata, separate from execution semantics. @public */
export type WorkflowProfileProvenance =
  { kind: 'authored'; document: string; pointer: string } | { kind: 'host'; description: string };
/** Business participant; organization ownership is optional catalog data. @public */
export interface WorkflowSystemParticipant {
  id: string;
  name: string;
  organizationalOwner?: string;
  provenance: WorkflowProfileProvenance;
}
/** A workflow actor or an explicit step-level actor override. @public */
export interface WorkflowActorBinding {
  workflowId: string;
  stepId?: string;
  participant: string;
  provenance: WorkflowProfileProvenance;
}
/** API source owner or an explicit exchange target override. @public */
export interface WorkflowSourceOwnerBinding {
  sourceName?: string;
  exchange?: { workflowId: string; stepId: string };
  participant: string;
  provenance: WorkflowProfileProvenance;
}
/** Descriptive implementation, never an executable workflow call. @public */
export interface WorkflowImplementationAssociation {
  id: string;
  exchange: { workflowId: string; stepId: string };
  workflowId: string;
  provenance: WorkflowProfileProvenance;
  mappings?: { [key: string]: import('./location').WorkflowLocationJSON };
}
/** Resolved contract declaration, distinct from its display name. @public */
export interface WorkflowContractIdentity {
  uri: string;
  pointer: string;
  revision?: string;
}
/** Explicit publisher/receiver association; it does not assert delivery. @public */
export interface WorkflowEventAssociation {
  id: string;
  producer: { workflowId: string; stepId: string };
  consumer: { workflowId: string; stepId: string };
  channel: WorkflowContractIdentity;
  message: WorkflowContractIdentity;
  provenance: WorkflowProfileProvenance;
}
/** Document-scoped Systems presentation profile. @public */
export interface WorkflowViewProfile {
  version: 1;
  document: string;
  revision?: string;
  participants: WorkflowSystemParticipant[];
  actors: WorkflowActorBinding[];
  sourceOwners: WorkflowSourceOwnerBinding[];
  implementations: WorkflowImplementationAssociation[];
  events: WorkflowEventAssociation[];
}
/** Additive perspective; legacy viewer modes and diagram types stay compatible. @public */
export type WorkflowPerspective = 'workflow' | 'systems';
/** Opt-in example metadata adapter. @public */
export type WorkflowViewProfileAdapter = 'digital-product';
