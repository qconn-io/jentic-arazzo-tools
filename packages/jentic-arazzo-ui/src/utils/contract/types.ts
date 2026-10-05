export interface ContractOperationParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema?: any;
}

export interface ContractSecurityRequirement {
  [name: string]: string[];
}

export interface ContractDocumentFacts {
  version: string;
  dialect: 'openapi' | 'asyncapi' | 'unsupported';
  uri: string;
  revision?: string;
  operations: Map<
    string,
    {
      operationId?: string;
      path?: string;
      method?: string;
      parameters: ContractOperationParameter[];
      security?: ContractSecurityRequirement[];
      requestBody?: any;
      responses?: any;
      // For AsyncAPI:
      channel?: string;
      action?: 'send' | 'receive';
      messages?: any;
    }
  >;
  rawContent: string | object;
  unsupportedDiagnostics: string[];
}
