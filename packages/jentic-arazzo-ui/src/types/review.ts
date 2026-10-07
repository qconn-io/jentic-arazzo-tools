import type {
  WorkflowCatalogManifest,
  WorkflowCatalogIdentity,
  WorkflowCatalogCoverage,
} from './catalog';
import type { WorkflowLocation } from './location';

/** Immutable supplied catalog revision; missing source bytes remain unavailable. @public */
export interface WorkflowReviewSnapshot extends WorkflowCatalogManifest {}
/** Scoped authored identity for an explicit one-to-one rename match. @public */
export interface WorkflowReviewAddress {
  documentId: string;
  workflowId: string;
  stepId?: string;
}
/** No heuristic rename matching is performed. @public */
export interface WorkflowReviewMatch {
  before: WorkflowReviewAddress;
  after: WorkflowReviewAddress;
}
/** Bounds are capped at 10,000 relationships, 100 paths and depth 32. @public */
export interface WorkflowReviewOptions {
  matches?: WorkflowReviewMatch[];
  maxRelationships?: number;
  maxPaths?: number;
  maxDepth?: number;
}
/** Authored JSON values, including falsy leaves. @public */
export type WorkflowReviewValue =
  null | boolean | number | string | WorkflowReviewValue[] | { [key: string]: WorkflowReviewValue };
/** Authored difference classification; no category implies compatibility. @public */
export type WorkflowReviewCategory =
  | 'structure'
  | 'declarations'
  | 'mappings'
  | 'criteria'
  | 'actions'
  | 'sources'
  | 'metadata'
  | 'contracts';
/** Revision-owned authored value and readable destination. @public */
export interface WorkflowReviewEvidence {
  documentId: string;
  revision: string;
  uri: string;
  digest: string;
  pointer: string;
  present: boolean;
  value?: WorkflowReviewValue;
  workflowId?: string;
  stepId?: string;
  location?: WorkflowLocation;
}
/** Classified authored relationship, copied without private catalog/session objects. @public */
export interface WorkflowReviewRelationship {
  id: string;
  kind: 'call' | 'prerequisite' | 'goto' | 'retry' | 'descriptive' | 'api';
  from: WorkflowCatalogIdentity;
  to?: WorkflowCatalogIdentity;
  pointer: string;
  location: WorkflowLocation;
  reference: string;
}
/** Potential entry exposure, never a runtime prediction. @public */
export interface WorkflowReviewImpactPath {
  entry: WorkflowCatalogIdentity;
  relationships: WorkflowReviewRelationship[];
}
/** Coverage and traversal records belong to one snapshot. @public */
export interface WorkflowReviewImpact {
  direct: WorkflowReviewRelationship[];
  paths: WorkflowReviewImpactPath[];
  cycles: string[][];
  visitedRelationships: number;
  truncated: boolean;
  complete: boolean;
  coverage: WorkflowCatalogCoverage[];
}
/** Effective inherited use with declaration and use provenance, excluded from finding counts. @public */
export interface WorkflowReviewEffect {
  side: 'baseline' | 'candidate';
  declarationPointer: string;
  location: WorkflowLocation;
  value: WorkflowReviewValue;
}
/** One counted authored difference and separately classified static exposure. @public */
export interface WorkflowReviewFinding {
  id: string;
  category: WorkflowReviewCategory;
  kind: 'added' | 'removed' | 'changed';
  before?: WorkflowReviewEvidence;
  after?: WorkflowReviewEvidence;
  effects: WorkflowReviewEffect[];
  baselineImpact: WorkflowReviewImpact;
  candidateImpact: WorkflowReviewImpact;
}
/** Portable snapshot identity and coverage. @public */
export interface WorkflowReviewIdentity {
  id: string;
  revision: string;
  documents: { documentId: string; revision: string; uri: string; digest?: string }[];
  coverage: WorkflowCatalogCoverage[];
}
/** Deterministic authored review export; approval/test state is intentionally absent. @public */
export interface WorkflowReviewResult {
  version: 1;
  baseline: WorkflowReviewIdentity;
  candidate: WorkflowReviewIdentity;
  limits: { maxRelationships: number; maxPaths: number; maxDepth: number };
  findings: WorkflowReviewFinding[];
  runtimeEffect: 'undetermined';
}
/** Optional review UI independent of normal viewer selection and host history. @public */
export interface ArazzoWorkflowReviewProps {
  baseline: WorkflowReviewSnapshot;
  candidate: WorkflowReviewSnapshot;
  options?: WorkflowReviewOptions;
  onExport?: (format: 'json' | 'markdown', content: string) => void;
  onLocationRequest?: (side: 'baseline' | 'candidate', location: WorkflowLocation) => void;
  className?: string;
}
