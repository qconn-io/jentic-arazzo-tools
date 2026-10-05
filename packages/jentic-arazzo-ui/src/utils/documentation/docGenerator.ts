import type {
  ArazzoDocument,
  SuccessAction,
  FailureAction,
  ReusableObject,
  Parameter,
} from '../../types/arazzo';
import type {
  DocumentationMetadata,
  DocumentationPrerequisite,
  DocumentationProvenance,
  DocumentationSupport,
  WorkflowDocumentation,
} from '../../types/viewer';
import { createSnapshot, inspect } from '../inspection';
import type { ClassifiedTarget, Provenance } from '../inspection';
import { buildViewerModel } from '../model/viewerModel';
import type { ArazzoViewerModel } from '../model/viewerModel';
import { generateMetadata } from './metadataGenerator';
import {
  formatAsMarkdown,
  formatHeaderAsMarkdown,
  formatWorkflowAsMarkdown,
} from './markdownFormatter';

export interface GenerateDocumentationOptions {
  includeMetadata?: boolean;
  includeDiagrams?: boolean;
  documentURL?: string | null;
  model?: ArazzoViewerModel;
  includeStatus?: boolean;
  compact?: boolean;
}
export interface DocumentationOutput {
  metadata: DocumentationMetadata;
  workflows: WorkflowDocumentation[];
  markdown: string;
  headerMarkdown: string;
  workflowMarkdowns: Map<string, string>;
}

// support is inspection information, never a validation or execution certificate.
export function generateDocumentation(
  document: ArazzoDocument,
  options: GenerateDocumentationOptions = {},
): DocumentationOutput {
  const model =
    options.model ??
    buildViewerModel(
      inspect(
        createSnapshot(document, options.documentURL ? { retrievalURI: options.documentURL } : {}),
      ),
    );
  const { snapshot } = model.inspection;
  const support: DocumentationSupport = {
    declaredVersion: model.support.exactVersion,
    profile:
      model.support.profile === '1.0' || model.support.profile === '1.1'
        ? model.support.profile
        : undefined,
    semanticInspection: model.support.semanticInspection !== 'unsupported',
    limitations: model.support.limitations,
  };
  const provenance = (fact?: Provenance): DocumentationProvenance => ({
    retrievalURI: snapshot.retrievalURI,
    baseURI: snapshot.baseURI,
    self: snapshot.self,
    occurrencePath: fact ? pointer(fact.path) : undefined,
    declarationPath: fact?.declarationPath ? pointer(fact.declarationPath) : undefined,
  });
  const prerequisite = (target: ClassifiedTarget, fact: Provenance): DocumentationPrerequisite => ({
    reference: target.reference,
    kind: target.kind.startsWith('local-')
      ? 'local'
      : target.kind.startsWith('external-')
        ? 'external'
        : target.kind === 'ambiguous'
          ? 'unsupported'
          : (target.kind as 'missing' | 'malformed'),
    workflowId: target.workflowId,
    stepId: target.stepId,
    sourceName: target.sourceName,
    message: target.reason,
    provenance: provenance(fact),
  });
  const metadata = {
    ...generateMetadata(snapshot.document),
    documentURL: options.documentURL ?? snapshot.retrievalURI,
    support,
    provenance: provenance(),
    authored: snapshot.authoredDocument,
    diagnostics: model.diagnostics,
  };
  const workflows = model.workflows.map((workflow) => ({
    ...workflow.value,
    workflowId: workflow.workflowId,
    support,
    provenance: provenance(workflow),
    authored: workflow.authored,
    diagnostics: workflow.diagnostics,
    prerequisites: workflow.prerequisites.map((fact) => prerequisite(fact.target, fact)),
    successActions: workflow.actions.onSuccess.map(
      (action) => action.value as SuccessAction | ReusableObject,
    ),
    failureActions: workflow.actions.onFailure.map(
      (action) => action.value as FailureAction | ReusableObject,
    ),
    steps: workflow.steps.map((step) => ({
      ...step.value,
      stepId: step.stepId,
      support,
      provenance: provenance(step),
      authored: step.authored,
      diagnostics: step.diagnostics,
      actionDetails: step.effectiveActions,
      parameterDetails: step.parameters,
      prerequisites: step.prerequisites.map((fact) => prerequisite(fact.target, fact)),
      parameters: step.parameters.map((parameter) => parameter.value as Parameter | ReusableObject),
      onSuccess: step.effectiveActions.onSuccess.map(
        (action) => action.value as SuccessAction | ReusableObject,
      ),
      onFailure: step.effectiveActions.onFailure.map(
        (action) => action.value as FailureAction | ReusableObject,
      ),
      sourceBinding: {
        ...step.sourceBinding.locators,
        sourceName: step.sourceBinding.sourceName,
        sourceType: step.sourceBinding.sourceType,
        sourceURL: step.sourceBinding.source?.url,
        action:
          step.sourceBinding.intent === 'send' || step.sourceBinding.intent === 'receive'
            ? step.sourceBinding.intent
            : undefined,
        timeout:
          typeof step.sourceBinding.timeout === 'number' ? step.sourceBinding.timeout : undefined,
        correlationId:
          typeof step.sourceBinding.correlationId === 'string'
            ? step.sourceBinding.correlationId
            : undefined,
        verification:
          step.sourceBinding.status === 'ambiguous'
            ? 'ambiguous'
            : step.sourceBinding.status === 'unsupported'
              ? 'unresolved'
              : 'unverified',
      },
    })),
  }));
  const documentationWorkflows = workflows as WorkflowDocumentation[];
  const headerMarkdown = formatHeaderAsMarkdown(metadata, options);
  const workflowMarkdowns = new Map(
    documentationWorkflows.map((workflow) => [
      workflow.workflowId,
      formatWorkflowAsMarkdown(metadata, workflow, options),
    ]),
  );
  return {
    metadata,
    workflows: documentationWorkflows,
    headerMarkdown,
    workflowMarkdowns,
    markdown: formatAsMarkdown(metadata, documentationWorkflows, options),
  };
}

function pointer(path: (string | number)[]): string {
  return (
    '/' + path.map((segment) => String(segment).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')
  );
}
