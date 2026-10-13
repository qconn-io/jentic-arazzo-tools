/**
 * document types for Arazzo 1.0 and selected Arazzo 1.1 inspection fields.
 * these interfaces do not establish validation or execution support and are not
 * a lossless representation of every specification field or extension.
 */

/** @public */
export interface ArazzoDocument {
  arazzo: string;
  $self?: string;
  info: InfoObject;
  sourceDescriptions: SourceDescription[];
  workflows: Workflow[];
  components?: ComponentsObject;
}

/** @public */
export interface InfoObject {
  title: string;
  version: string;
  summary?: string;
  description?: string;
}

/** @public */
export interface SourceDescription {
  name: string;
  url: string;
  type?: 'openapi' | 'arazzo' | 'asyncapi';
  /** viewer tracking ID; authored values are preserved during export. */
  _internalId?: string;
}

/** @public */
export interface Workflow {
  workflowId: string;
  summary?: string;
  description?: string;
  inputs?: JSONSchema;
  dependsOn?: string[];
  steps: Step[];
  successActions?: (SuccessAction | ReusableObject)[];
  failureActions?: (FailureAction | ReusableObject)[];
  outputs?: Record<string, string>;
  parameters?: (Parameter | ReusableObject)[];
  /** viewer tracking ID; authored values are preserved during export. */
  _internalId?: string;
}

/** @public */
export interface Step {
  stepId: string;
  description?: string;
  operationId?: string;
  operationPath?: string;
  workflowId?: string;
  dependsOn?: string[];
  channelPath?: string;
  action?: 'send' | 'receive';
  /** maximum authored wait in milliseconds; the viewer does not execute it. */
  timeout?: number;
  correlationId?: string;
  parameters?: (Parameter | ReusableObject)[];
  requestBody?: RequestBody;
  successCriteria?: Criterion[];
  onSuccess?: (SuccessAction | ReusableObject)[];
  onFailure?: (FailureAction | ReusableObject)[];
  outputs?: Record<string, string>;
  /** viewer tracking ID; authored values are preserved during export. */
  _internalId?: string;
}

/** @public */
export interface Parameter {
  name: string;
  in?: 'path' | 'query' | 'querystring' | 'header' | 'cookie';
  value: any;
}

/** @public */
export interface RequestBody {
  contentType?: string;
  payload?: any;
  replacements?: PayloadReplacement[];
}

/** @public */
export interface PayloadReplacement {
  target: string;
  value: any;
}

/** @public */
export interface SuccessAction {
  name: string;
  type: 'end' | 'goto';
  workflowId?: string;
  stepId?: string;
  criteria?: Criterion[];
  parameters?: (Parameter | ReusableObject)[];
}

/** @public */
export interface FailureAction {
  name: string;
  type: 'end' | 'retry' | 'goto';
  workflowId?: string;
  stepId?: string;
  retryAfter?: number;
  retryLimit?: number;
  criteria?: Criterion[];
  parameters?: (Parameter | ReusableObject)[];
}

/** @public */
export interface Criterion {
  context?: string;
  condition: string;
  type?: 'simple' | 'regex' | 'jsonpath' | 'xpath' | CriterionExpressionType;
}

/** @public */
export interface CriterionExpressionType {
  type: 'jsonpath' | 'xpath';
  version: string;
}

/** @public */
export interface ReusableObject {
  reference: string;
  value?: Parameter['value'];
}

/** @public */
export interface ComponentsObject {
  inputs?: Record<string, JSONSchema>;
  parameters?: Record<string, Parameter>;
  successActions?: Record<string, SuccessAction>;
  failureActions?: Record<string, FailureAction>;
}

/** @public */
export type JSONSchema = Record<string, any>;
