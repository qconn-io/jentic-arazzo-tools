/** JSON data only; optional presentation state never changes authored identity. @public */
export type WorkflowLocationJSON =
  | null
  | boolean
  | number
  | string
  | WorkflowLocationJSON[]
  | { [key: string]: WorkflowLocationJSON };
/** An authored call site, ordered from the root to the selected workflow. @public */
export interface WorkflowCallSite {
  workflowId: string;
  stepId: string;
}
/** Declaration identity, separate from the step where an action is used. @public */
export interface WorkflowActionAddress {
  document: string;
  pointer: string;
  /** authored reference or declaration at the scoped use site */
  usePointer: string;
  channel: 'onSuccess' | 'onFailure';
  index: number;
  name?: string;
}
/** No occurrence means an authored step; an empty occurrence means the root occurrence. @public */
export type WorkflowLocationSelection = WorkflowCallSite & {
  occurrence?: WorkflowCallSite[];
} & ({ kind: 'step' } | { kind: 'action'; action: WorkflowActionAddress });
/** A shareable authored address, independent of generated rows and layout. @public */
export interface WorkflowLocation {
  version: 1;
  document: string;
  revision?: string;
  digest?: string;
  root: string | null;
  view: 'docs' | 'diagram' | 'split';
  subview: 'docs' | 'sequence' | 'flowchart';
  selection?: WorkflowLocationSelection;
  extensions?: { [namespace: string]: WorkflowLocationJSON };
}
/** Restoration outcome; a cross-document request waits for the host to supply that document. @public */
export interface WorkflowLocationStatus {
  state: 'restored' | 'invalid' | 'stale' | 'bounded' | 'conflict' | 'document-request';
  location?: WorkflowLocation;
  message: string;
  unavailableSegment?: WorkflowCallSite;
  notices?: string[];
}
/** Optional state adapter created with createLocationAdapter. @public */
export interface WorkflowLocationAdapter {
  namespace: string;
  restore(value: WorkflowLocationJSON): boolean;
}
/** Bounded codec result; malformed input never becomes a navigation request. @public */
export interface WorkflowLocationDecodeResult {
  location?: WorkflowLocation;
  error?: string;
}
