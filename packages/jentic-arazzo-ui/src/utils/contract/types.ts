export type ContractValue =
  null | boolean | number | string | ContractValue[] | { [key: string]: ContractValue };
export interface ContractOperationParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema?: ContractValue;
  content?: ContractValue;
  description?: string;
}
export interface ContractSecurityRequirement {
  [name: string]: string[];
}
export interface InspectedSchemaReference {
  occurrence: string;
  authoredReference: string;
  declaringURI: string;
  targetURI?: string;
  targetPointer?: string;
  revision?: string;
  declaration?: ContractValue;
  status: 'located' | 'unresolved' | 'recursive' | 'unsupported';
  diagnostic?: string;
}
export interface ContractDeclarationIdentity {
  uri: string;
  pointer: string;
  revision?: string;
  declaringURI: string;
  occurrence: string;
  authoredReference?: string;
  status: 'located' | 'unresolved';
}
export interface ContractOperation {
  channelIdentity?: ContractDeclarationIdentity;
  messageIdentities?: ContractDeclarationIdentity[];
  schemaReferences?: InspectedSchemaReference[];
  operationId?: string;
  pointer?: string;
  path?: string;
  method?: string;
  summary?: string;
  parameters: ContractOperationParameter[];
  security?: ContractValue;
  servers?: ContractValue;
  requestBody?: ContractValue;
  responses?: ContractValue;
  channel?: string;
  channelPointer?: string;
  address?: ContractValue;
  action?: 'send' | 'receive';
  messages?: ContractValue[];
}
export interface ContractDocumentFacts {
  version: string;
  dialect: 'openapi' | 'asyncapi' | 'unsupported';
  uri: string;
  revision?: string;
  operations: Map<string, ContractOperation>;
  rawContent: string | object;
  unsupportedDiagnostics: string[];
}
