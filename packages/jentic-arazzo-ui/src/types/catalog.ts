import type { SourceDocumentProvider } from './source';
import type { WorkflowLocation } from './location';
import type { WorkflowViewProfile } from './profile';
import type { ScenarioManifest } from './scenario';

/** Explicit manifest metadata; names do not establish organizational ownership. @public */
export interface WorkflowCatalogLabel {
  id: string;
  name: string;
}
/** Logical document, revision and authored workflow identity. @public */
export interface WorkflowCatalogIdentity {
  documentId: string;
  revision: string;
  workflowId: string;
}
/** Optional descriptive metadata supplied by the manifest author. @public */
export interface WorkflowCatalogMetadata {
  workflowId: string;
  title?: string;
  role?: 'entry' | 'helper' | 'diagnostic';
  product?: string;
  capabilities?: string[];
  owner?: string;
  lifecycle?: string;
  tags?: string[];
  api?: string[];
  systems?: string[];
  description?: string;
}
/** A supplied revision; URI alone cannot prove the revision. @public */
export interface WorkflowCatalogDocument {
  id: string;
  revision: string;
  uri: string;
  kind?: 'arazzo' | 'openapi' | 'asyncapi';
  content?: string | object;
  /** SHA-256 of canonical parsed JSON, calculated with authoredDigest. */
  expectedDigest?: string;
  workflows?: WorkflowCatalogMetadata[];
  /** Source name to exact supplied document revision. */
  sources?: { [sourceName: string]: { documentId: string; revision: string } };
  viewProfile?: WorkflowViewProfile;
  scenarioManifest?: ScenarioManifest;
}
/** Explicit descriptive association, kept separate from standard workflow references. @public */
export interface WorkflowCatalogAssociation {
  id: string;
  from: WorkflowCatalogIdentity;
  to: WorkflowCatalogIdentity;
  stepId?: string;
  description: string;
}
/** Version one supplied catalog. Authentication/storage/discovery are host concerns. @public */
export interface WorkflowCatalogManifest {
  version: 1;
  id: string;
  revision: string;
  products?: WorkflowCatalogLabel[];
  capabilities?: WorkflowCatalogLabel[];
  owners?: WorkflowCatalogLabel[];
  documents: WorkflowCatalogDocument[];
  associations?: WorkflowCatalogAssociation[];
}
/** Coverage is restricted to this supplied catalog scope. @public */
export interface WorkflowCatalogCoverage {
  key: string;
  uri: string;
  revision?: string;
  state: 'loaded' | 'pending' | 'failed' | 'unsupported';
  message?: string;
}
/** Selected authored destination with optional step/action occurrence. @public */
export interface WorkflowCatalogSelection extends WorkflowCatalogIdentity {
  location?: WorkflowLocation;
}
/** Optional embedded catalog; callbacks do not mutate host history. @public */
export interface ArazzoCatalogProps {
  manifest: WorkflowCatalogManifest;
  manifestURI?: string;
  sourceProvider?: SourceDocumentProvider;
  selection?: WorkflowCatalogSelection | null;
  defaultSelection?: WorkflowCatalogSelection;
  onSelectionChange?: (selection: WorkflowCatalogSelection | null) => void;
  onLocationChange?: (location: WorkflowLocation) => void;
  onCoverageChange?: (coverage: readonly WorkflowCatalogCoverage[]) => void;
  className?: string;
}
