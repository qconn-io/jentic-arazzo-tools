import type { ScenarioControls } from './scenario';
import type {
  WorkflowViewProfile,
  WorkflowViewProfileAdapter,
  WorkflowPerspective,
} from './profile';
import type { WorkflowLocation, WorkflowLocationStatus, WorkflowLocationAdapter } from './location';
/**
 * Viewer-specific types for \@jentic/arazzo-ui
 */

import { Node, Edge } from 'reactflow';
import {
  Step,
  Workflow,
  SuccessAction,
  FailureAction,
  Criterion,
  JSONSchema,
  ArazzoDocument,
  ReusableObject,
  Parameter,
} from './arazzo';
import type { SourceDocumentProvider, ExternalNavigationRequest } from './source';

// ============================================================================
// Viewer Mode & Events
// ============================================================================

/** @public */
export type ViewerMode = 'diagram' | 'docs' | 'split';

/** @public */
export interface ViewerEvents {
  onNodeSelect?: (nodeId: string, node: ArazzoNode) => void;
  onEdgeSelect?: (edgeId: string, edge: ArazzoEdge) => void;
  onWorkflowSelect?: (workflowId: string) => void;
  onViewChange?: (view: ViewerMode) => void;
}

// ============================================================================
// Component Props & Ref
// ============================================================================

/** @public */
export interface ArazzoUIProps extends ScenarioControls {
  document: ArazzoDocument | string;
  viewProfile?: WorkflowViewProfile;
  viewProfileAdapter?: WorkflowViewProfileAdapter;
  perspective?: WorkflowPerspective;
  onPerspectiveChange?: (perspective: WorkflowPerspective) => void;
  view?: ViewerMode;
  activeWorkflowId?: string | null;
  selectedNodeId?: string | null;
  /** explicit host identity for supplied/inline content */
  documentIdentity?: string;
  documentRevision?: string;
  location?: WorkflowLocation;
  defaultLocation?: WorkflowLocation;
  onLocationChange?: (location: WorkflowLocation) => void;
  onLocationStatus?: (status: WorkflowLocationStatus) => void;
  locationAdapters?: readonly WorkflowLocationAdapter[];
  diagramType?: DiagramType | 'none';
  className?: string;
  style?: React.CSSProperties;
  onNodeSelect?: (nodeId: string, node: ArazzoNode) => void;
  onEdgeSelect?: (edgeId: string, edge: ArazzoEdge) => void;
  onWorkflowSelect?: (workflowId: string) => void;
  onViewChange?: (view: ViewerMode) => void;
  /** Base URI for relative sources in inline/uploaded documents. */
  baseURI?: string;
  sourceProvider?: SourceDocumentProvider;
  onExternalNavigation?: (request: ExternalNavigationRequest) => void;
}

/** @public */
export interface ArazzoUIRef {
  fitView(): void;
  setZoom(level: number): void;
  getDocument(): ArazzoDocument;
  setActiveWorkflow(workflowId: string | null): void;
  selectStep(stepId: string): void;
  clearSelection(): void;
  getActiveWorkflowId(): string | null;
  getSelectedStepId(): string | null;
}

// ============================================================================
// Context
// ============================================================================

export interface ArazzoViewerContextValue {
  document: ArazzoDocument;
  documentURL: string | null;
  activeWorkflowId: string | null;
  setActiveWorkflow: (id: string | null) => void;
  activeWorkflow: Workflow | null;
  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;
  nodes: ArazzoNode[];
  edges: ArazzoEdge[];
  setNodes: (nodes: ArazzoNode[]) => void;
  setEdges: (edges: ArazzoEdge[]) => void;
  readOnly: boolean;
  events?: ViewerEvents;
}

// ============================================================================
// Documentation Types
// ============================================================================

/** @public */
export type DiagramType = 'sequence' | 'flowchart';

/** @public */
export interface DocsViewConfig {
  includeMetadata?: boolean;
  includeDiagrams?: boolean;
  diagramType?: DiagramType;
}

/**
 * inspection limits for generated documentation; these do not certify conformance.
 * @public
 */
export interface DocumentationSupport {
  declaredVersion: string;
  profile?: '1.0' | '1.1';
  semanticInspection: boolean;
  limitations?: string[];
}

/**
 * available document and occurrence locations; absent metadata is not inferred.
 * @public
 */
export interface DocumentationProvenance {
  retrievalURI?: string;
  baseURI?: string;
  self?: string;
  occurrencePath?: string;
  declarationPath?: string;
}

/**
 * authored source locators and intent without fetching the source document.
 * @public
 */
export interface DocumentationSourceBinding {
  sourceName?: string;
  sourceType?: string;
  sourceURL?: string;
  operationId?: string;
  operationPath?: string;
  channelPath?: string;
  workflowId?: string;
  action?: 'send' | 'receive';
  timeout?: number;
  correlationId?: string;
  verification: 'unverified' | 'ambiguous' | 'unresolved';
}

/**
 * classified prerequisite information used by documentation links and badges.
 * @public
 */
export interface DocumentationPrerequisite {
  reference: string;
  kind: 'local' | 'external' | 'missing' | 'malformed' | 'unsupported';
  workflowId?: string;
  stepId?: string;
  sourceName?: string;
  message?: string;
  provenance?: DocumentationProvenance;
}

/** @public */
export interface DocumentationMetadata {
  title: string;
  version: string;
  arazzoVersion: string;
  documentURL?: string | null;
  support?: DocumentationSupport;
  provenance?: DocumentationProvenance;
  summary?: string;
  description?: string;
  sourceDescriptions: Array<{
    name: string;
    url: string;
    type?: string;
  }>;
}

/** @public */
export interface WorkflowDocumentation {
  workflowId: string;
  dependsOn?: string[];
  prerequisites?: DocumentationPrerequisite[];
  support?: DocumentationSupport;
  provenance?: DocumentationProvenance;
  summary?: string;
  description?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  steps: StepDocumentation[];
  successActions?: (SuccessAction | ReusableObject)[];
  failureActions?: (FailureAction | ReusableObject)[];
}

/** @public */
export interface StepDocumentation {
  stepId: string;
  dependsOn?: string[];
  prerequisites?: DocumentationPrerequisite[];
  channelPath?: string;
  action?: 'send' | 'receive';
  timeout?: number;
  correlationId?: string;
  sourceBinding?: DocumentationSourceBinding;
  support?: DocumentationSupport;
  provenance?: DocumentationProvenance;
  description?: string;
  operationId?: string;
  operationPath?: string;
  workflowId?: string;
  parameters?: (Parameter | ReusableObject)[];
  outputs?: Record<string, string>;
  successCriteria?: Criterion[];
  onSuccess?: (SuccessAction | ReusableObject)[];
  onFailure?: (FailureAction | ReusableObject)[];
}

/** @public */
export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  level: number;
}

// ============================================================================
// Node Types
// ============================================================================

/** @public */
export type ArazzoNodeType =
  'start' | 'end' | 'step' | 'workflowRef' | 'workflow' | 'externalWorkflow';

/** @public */
export interface StepNodeData {
  type: 'step';
  step: Step;
  workflowId: string;
  workflowSuccessActions?: (SuccessAction | { $ref: string })[];
  workflowFailureActions?: (FailureAction | { $ref: string })[];
  isValid: boolean;
  errors?: ValidationError[];
  isSelected?: boolean;
  isHighlighted?: boolean;
}

/** @public */
export interface WorkflowRefNodeData {
  type: 'workflowRef';
  step: Step;
  targetWorkflowId: string;
  /** workflow containing the calling step; optional for existing node consumers. */
  workflowId?: string;
  workflowSuccessActions?: (SuccessAction | ReusableObject)[];
  workflowFailureActions?: (FailureAction | ReusableObject)[];
  isValid: boolean;
}

/** @public */
export interface StartNodeData {
  type: 'start';
  workflowId: string;
  inputs?: JSONSchema;
  description?: string;
}

/** @public */
export interface EndNodeData {
  type: 'end';
  workflowId: string;
  outputs?: Record<string, string>;
}

/** @public */
export interface WorkflowNodeData {
  type: 'workflow';
  workflow: Workflow;
  onClick?: (workflowId: string) => void;
}

/** @public */
export interface ExternalWorkflowNodeData {
  type: 'externalWorkflow';
  workflowId: string;
  workflow?: Workflow;
  onClick?: (workflowId: string) => void;
}

/** @public */
export type ArazzoNodeData =
  | StepNodeData
  | WorkflowRefNodeData
  | StartNodeData
  | EndNodeData
  | WorkflowNodeData
  | ExternalWorkflowNodeData;

/** @public */
export type ArazzoNode = Node<ArazzoNodeData>;

// ============================================================================
// Edge Types
// ============================================================================

/** @public */
export type ArazzoEdgeType =
  | 'relationship'
  | 'sequential'
  | 'success'
  | 'failure'
  | 'retry'
  | 'bundled-success'
  | 'bundled-failure'
  | 'bundled-retry';

/**
 * Public inspection details for a workflow relationship or step prerequisite.
 * This describes authored relationships, not predicted execution. Rendering and
 * internal inspection-model details are excluded from onEdgeSelect payloads.
 * @public
 */
export interface RelationshipEdgeData {
  type: 'relationship';
  kind: 'prerequisite' | 'call' | 'action';
  label: string;
  warning?: string;
  channel?: 'success' | 'failure';
  actionType?: string;
}

/** @public */
export interface SequentialEdgeData {
  type: 'sequential';
}

/** @public */
export interface SuccessEdgeData {
  type: 'success';
  action: SuccessAction;
  criteria?: Criterion[];
  isInherited?: boolean;
}

/** @public */
export interface FailureEdgeData {
  type: 'failure';
  action: FailureAction;
  criteria?: Criterion[];
  isInherited?: boolean;
}

/** @public */
export interface RetryEdgeData {
  type: 'retry';
  action: FailureAction;
  retryAfter?: number;
  retryLimit?: number;
  criteria?: Criterion[];
  isInherited?: boolean;
}

/** @public */
export interface BundledSuccessEdgeData {
  type: 'bundled-success';
  action: SuccessAction;
  criteria?: Criterion[];
  sources: Array<{ nodeId: string; handleId: string }>;
  actionIdx: number;
}

/** @public */
export interface BundledFailureEdgeData {
  type: 'bundled-failure';
  action: FailureAction;
  criteria?: Criterion[];
  sources: Array<{ nodeId: string; handleId: string }>;
  actionIdx: number;
}

/** @public */
export interface BundledRetryEdgeData {
  type: 'bundled-retry';
  action: FailureAction;
  retryAfter?: number;
  retryLimit?: number;
  criteria?: Criterion[];
  sources: Array<{ nodeId: string; handleId: string }>;
  actionIdx: number;
}

/** @public */
export type ArazzoEdgeData =
  | RelationshipEdgeData
  | SequentialEdgeData
  | SuccessEdgeData
  | FailureEdgeData
  | RetryEdgeData
  | BundledSuccessEdgeData
  | BundledFailureEdgeData
  | BundledRetryEdgeData;

/** @public */
export type ArazzoEdge = Edge<ArazzoEdgeData>;

// ============================================================================
// Validation
// ============================================================================

/** @public */
export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  nodeId?: string;
  edgeId?: string;
  specRef?: string;
}

// ============================================================================
// Conversion Options
// ============================================================================

/** @public */
export interface ConversionOptions {
  autoLayout?: boolean;
  layout?: {
    direction?: 'TB' | 'LR';
    nodeSpacing?: number;
    rankSpacing?: number;
  };
}
