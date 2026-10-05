/**
 * Source document acquisition and provenance types.
 */

/** @public */
export interface SourceDocumentRequest {
  uri: string;
  revision?: string;
  signal?: AbortSignal;
}

/** @public */
export interface SourceDocumentContent {
  content: string | object;
  retrievalURI: string;
  revision?: string;
}

/** @public */
export interface SourceDocumentProvider {
  load(request: SourceDocumentRequest): Promise<SourceDocumentContent>;
}

/** @public */
export interface ProvidedSourceProvenance {
  uri: string;
  revision?: string;
  providerGeneration: number;
}

/** @public */
export interface ExternalNavigationRequest {
  documentUri: string;
  revision?: string;
  workflowId?: string;
}
