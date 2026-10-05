import type { ParseResultElement } from '@jentic/arazzo-parser';

import type { ArazzoDocument } from '../../types/arazzo';

// plain projections are deliberately open: authored extensions and future fields are data.
export type PlainObject = Record<string, any>;
export type PlainDocument = ArazzoDocument & PlainObject;
export type OccurrencePath = (string | number)[];
export type ActionChannel = 'onSuccess' | 'onFailure';
export interface DocumentSnapshot {
  id: string;
  authored: ParseResultElement;
  restored: ParseResultElement;
  authoredDocument: PlainDocument;
  document: PlainDocument;
  exactVersion: string;
  retrievalURI?: string;
  baseURI?: string;
  self?: string;
  diagnostics?: InspectionDiagnostic[];
  trustedInternalIds?: boolean;
}
export interface Owner {
  workflowId?: string;
  stepId?: string;
}
export interface Provenance extends Owner {
  path: OccurrencePath;
  declarationPath?: OccurrencePath;
  reference?: string;
}
export interface InspectionDiagnostic extends Provenance {
  resolutionReasons?: ('self' | 'schema-dialect' | 'base-uri')[];
  phase: 'parsing' | 'resolution' | 'inspection';
  category:
    | 'missing-reference'
    | 'malformed-target'
    | 'ambiguous-binding'
    | 'unsupported-version'
    | 'unsupported-feature'
    | 'unsupported-resolution'
    | 'prerequisite-cycle';
  severity: 'warning' | 'info';
  code: string;
  message: string;
  originalReference?: string;
}
export interface ReusableOccurrence extends Provenance {
  reference: string;
  bucket?: 'parameters' | 'successActions' | 'failureActions';
  key?: string;
  malformed?: boolean;
  owner: Owner;
}
export type TargetRole = 'workflow-prerequisite' | 'step-prerequisite' | 'call' | 'action';
export interface TargetContext extends Owner {
  role: TargetRole;
  targetType?: 'workflow' | 'step';
  path?: OccurrencePath;
}
export interface ClassifiedTarget {
  kind:
    | 'local-workflow'
    | 'local-step'
    | 'external-workflow'
    | 'external-step'
    | 'missing'
    | 'malformed'
    | 'ambiguous';
  reference: string;
  role: TargetRole;
  workflowId?: string;
  stepId?: string;
  sourceName?: string;
  sourceType?: string;
  reason?: string;
  navigable: boolean;
}
export interface PrerequisiteFact extends Provenance {
  target: ClassifiedTarget;
  authoredIndex: number;
}
export interface ParameterFact extends Provenance {
  status: 'resolved' | 'unresolved' | 'unsupported';
  authored: PlainObject;
  value: PlainObject;
  diagnostics: InspectionDiagnostic[];
}
export interface ActionFact extends Provenance {
  channel: ActionChannel;
  origin: 'workflow' | 'step';
  authoredIndex: number;
  status: 'resolved' | 'unresolved' | 'unsupported';
  authored: PlainObject;
  value: PlainObject;
  parameters: ParameterFact[];
  target?: ClassifiedTarget;
  diagnostics: InspectionDiagnostic[];
}
export interface SourceBinding extends Provenance {
  status: 'declared' | 'ambiguous' | 'unverified' | 'unsupported';
  verification: 'unverified';
  sourceName?: string;
  sourceType?: string;
  source?: PlainObject;
  candidates: string[];
  locators: PlainObject;
  intent?: string;
  timeout?: unknown;
  correlationId?: unknown;
}
export interface StepFact extends Provenance {
  stepId: string;
  workflowId: string;
  authoredIndex: number;
  authored: PlainObject;
  value: PlainObject;
  prerequisites: PrerequisiteFact[];
  actions: Record<ActionChannel, ActionFact[]>;
  parameters: ParameterFact[];
  sourceBinding: SourceBinding;
  callTarget?: ClassifiedTarget;
  diagnostics: InspectionDiagnostic[];
}
export interface WorkflowFact extends Provenance {
  workflowId: string;
  authoredIndex: number;
  authored: PlainObject;
  value: PlainObject;
  prerequisites: PrerequisiteFact[];
  actions: Record<ActionChannel, ActionFact[]>;
  parameters: ParameterFact[];
  steps: StepFact[];
  diagnostics: InspectionDiagnostic[];
}
export interface FeatureSupport {
  profile?: string;
  exactVersion: string;
  semanticInspection: 'supported' | 'selected' | 'unsupported';
  representation: 'available';
  referenceExpansion: 'limited';
  schemaValidation: 'not-established';
  execution: 'not-established';
  sourceVerification: 'unverified';
  limitations: string[];
}
export interface InspectionResult {
  snapshot: DocumentSnapshot;
  documentId: string;
  profileId?: string;
  support: FeatureSupport;
  workflows: WorkflowFact[];
  workflowsById: Map<string, WorkflowFact>;
  stepsByWorkflow: Map<string, Map<string, StepFact>>;
  diagnostics: InspectionDiagnostic[];
  raw: PlainDocument;
  classifyTarget(reference: string, context: TargetContext): ClassifiedTarget;
}
export interface InspectionProfile {
  id: string;
  features: ReadonlySet<string>;
  supports(feature: string): boolean;
  inventory(document: PlainObject): ReusableOccurrence[];
  extract(snapshot: DocumentSnapshot): InspectionResult;
}
export interface PendingSelection {
  documentId: string;
  requestId: number;
  workflowId: string;
  stepId: string;
}
