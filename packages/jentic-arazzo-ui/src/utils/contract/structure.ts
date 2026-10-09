// pure declaration roles shared by contract projection and offline usage analysis.
// map entry names never act as field keywords; literal values never introduce references.
export type ContractRole =
  | 'contract'
  | 'components'
  | 'pathItem'
  | 'operation'
  | 'response'
  | 'requestBody'
  | 'parameter'
  | 'media'
  | 'encoding'
  | 'opaqueReference'
  | 'example'
  | 'channel'
  | 'message'
  | 'reply'
  | 'callback'
  | 'server'
  | 'variable'
  | 'securityScheme'
  | 'link'
  | 'schema'
  | 'literal'
  | { map: ContractRole }
  | { array: ContractRole };
export interface StructureProfile {
  eventSchemas?: boolean;
}
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const schemaMaps = new Set([
  'properties',
  'patternProperties',
  '$defs',
  'definitions',
  'dependentSchemas',
  'dependencies',
]);
const schemaArrays = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);
const schemaSingles = new Set([
  'items',
  'additionalProperties',
  'additionalItems',
  'contains',
  'not',
  'if',
  'then',
  'else',
  'propertyNames',
  'unevaluatedProperties',
  'unevaluatedItems',
  'contentSchema',
]);
const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const componentRoles: Record<string, ContractRole> = {
  schemas: 'schema',
  responses: 'response',
  parameters: 'parameter',
  headers: 'parameter',
  examples: 'example',
  requestBodies: 'requestBody',
  securitySchemes: 'securityScheme',
  links: 'link',
  callbacks: 'callback',
  pathItems: 'pathItem',
  channels: 'channel',
  messages: 'message',
  operations: 'operation',
  servers: 'server',
  messageTraits: 'message',
  operationTraits: 'operation',
  correlationIds: 'opaqueReference',
  replyAddresses: 'opaqueReference',
  replies: 'reply',
  serverBindings: 'opaqueReference',
  channelBindings: 'opaqueReference',
  operationBindings: 'opaqueReference',
  messageBindings: 'opaqueReference',
};
export function childContractRole(
  role: ContractRole,
  key: string,
  value: unknown,
  profile: StructureProfile = {},
): ContractRole {
  if (typeof role === 'object') return 'map' in role ? role.map : role.array;
  if (role === 'literal') return 'literal';
  if (role === 'schema') {
    if (typeof record(value).schemaFormat === 'string')
      return key === 'schema' ? 'schema' : 'literal';
    if (schemaMaps.has(key)) return { map: 'schema' };
    if (schemaArrays.has(key) || (key === 'items' && Array.isArray(record(value).items)))
      return { array: 'schema' };
    return schemaSingles.has(key) ? 'schema' : 'literal';
  }
  if (role === 'components')
    return Object.hasOwn(componentRoles, key) ? { map: componentRoles[key] } : 'literal';
  if (role === 'callback') return key.startsWith('x-') ? 'literal' : 'pathItem';
  if (key.startsWith('x-')) return 'literal';
  if (profile.eventSchemas && key === 'bindings') return 'opaqueReference';
  if (profile.eventSchemas && key === 'security') return { array: 'securityScheme' };
  if (role === 'message' && key === 'correlationId') return 'opaqueReference';
  if (role === 'reply' && key === 'address') return 'opaqueReference';
  if (role === 'example' || role === 'variable' || role === 'link' || role === 'opaqueReference')
    return 'literal';
  if (key === 'schema' && ['parameter', 'media', 'securityScheme'].includes(role)) return 'schema';
  if (role === 'message') {
    if (profile.eventSchemas && ['payload', 'headers'].includes(key)) return 'schema';
    if (key === 'traits') return { array: 'message' };
    return 'literal';
  }
  if (role === 'media' && key === 'encoding') return { map: 'encoding' };
  if (role === 'encoding' && key === 'headers') return { map: 'parameter' };
  if (key === 'examples' && ['media', 'parameter'].includes(role)) return { map: 'example' };
  if (key === 'content' && ['parameter', 'response', 'requestBody'].includes(role))
    return { map: 'media' };
  if (role === 'pathItem' && methods.has(key)) return 'operation';
  if (key === 'parameters' && ['operation', 'pathItem'].includes(role))
    return { array: 'parameter' };
  if (key === 'parameters' && role === 'channel') return { map: 'parameter' };
  if (key === 'responses' && role === 'operation') return { map: 'response' };
  if (key === 'requestBody' && role === 'operation') return 'requestBody';
  if (key === 'callbacks' && role === 'operation') return { map: 'callback' };
  if (key === 'headers' && role === 'response') return { map: 'parameter' };
  if (key === 'links' && role === 'response') return { map: 'link' };
  if (key === 'servers')
    return role === 'contract' && profile.eventSchemas ? { map: 'server' } : { array: 'server' };
  if (role === 'server' && key === 'variables') return { map: 'variable' };
  if (role === 'operation' && key === 'traits') return { array: 'operation' };
  if (role === 'operation' && key === 'channel') return 'channel';
  if (role === 'operation' && key === 'reply') return 'reply';
  if (role === 'reply' && key === 'channel') return 'channel';
  if (key === 'messages') {
    if (role === 'channel') return { map: 'message' };
    if (role === 'operation' || role === 'reply') return { array: 'message' };
  }
  if (role === 'contract') {
    if (key === 'components') return 'components';
    if (key === 'paths' || key === 'webhooks') return { map: 'pathItem' };
    if (key === 'channels') return { map: 'channel' };
    if (key === 'operations') return { map: 'operation' };
  }
  return 'literal';
}
export function contractRoleAt(
  root: unknown,
  path: string[],
  profile: StructureProfile = {},
  fallback: ContractRole = 'contract',
): ContractRole {
  const raw = record(root);
  let role: ContractRole = raw.openapi || raw.asyncapi ? 'contract' : fallback;
  let value: unknown = root;
  for (const key of path) {
    role = childContractRole(role, key, value, profile);
    value = record(value)[key] ?? (Array.isArray(value) ? value[Number(key)] : undefined);
  }
  return role;
}
export function declarationReference(value: unknown, role: ContractRole): string | undefined {
  if (typeof role === 'object' || role === 'literal' || role === 'components') return undefined;
  const ref = record(value).$ref;
  return typeof ref === 'string' ? ref : undefined;
}
export function supportedSchemaFormat(format: string): boolean {
  const normalized = format.replace(/\s+/g, '').toLowerCase();
  return (
    /^application\/vnd\.aai\.asyncapi(?:\+(?:json|yaml))?;version=3\.0\.\d+$/.test(normalized) ||
    /^application\/schema\+(?:json|yaml);version=draft-0[467]$/.test(normalized) ||
    /^application\/vnd\.oai\.openapi(?:\+(?:json|yaml))?;version=3\.[01]\.\d+$/.test(normalized)
  );
}
export function schemaLimitation(
  value: unknown,
  supportsFormat?: (format: string) => boolean,
): string | undefined {
  const schema = record(value);
  if (
    typeof schema.schemaFormat === 'string' &&
    supportsFormat &&
    !supportsFormat(schema.schemaFormat)
  )
    return `Unsupported schema format retained: ${schema.schemaFormat}`;
  if (
    typeof schema.$schema === 'string' &&
    !/^https?:\/\/json-schema.org\/(draft\/(2020-12|2019-09)|draft-0[467])\/schema#?$/.test(
      schema.$schema,
    ) &&
    !/^https?:\/\/spec.openapis.org\/oas\/3\.1\/dialect\/base#?$/.test(schema.$schema)
  )
    return `Unsupported schema dialect retained: ${schema.$schema}`;
  if (
    ['$id', 'id', '$anchor', '$dynamicAnchor', '$dynamicRef'].some(
      (key) => schema[key] !== undefined,
    )
  )
    return 'Unsupported schema resource identifiers or anchors; authored schema retained';
  return undefined;
}
export function enclosingSchemaLimitation(
  root: unknown,
  path: string[],
  profile: StructureProfile = {},
  supportsFormat?: (format: string) => boolean,
): string | undefined {
  const raw = record(root);
  if (
    typeof raw.openapi === 'string' &&
    typeof raw.jsonSchemaDialect === 'string' &&
    raw.jsonSchemaDialect !== 'https://spec.openapis.org/oas/3.1/dialect/base'
  )
    return `Unsupported document schema dialect retained: ${raw.jsonSchemaDialect}`;
  let role: ContractRole = raw.openapi || raw.asyncapi ? 'contract' : 'schema';
  let value: unknown = root;
  for (let i = 0; i <= path.length; i++) {
    if (role === 'schema') {
      const limitation = schemaLimitation(value, supportsFormat);
      if (limitation) return limitation;
    }
    if (i === path.length) break;
    role = childContractRole(role, path[i], value, profile);
    value = Array.isArray(value) ? value[Number(path[i])] : record(value)[path[i]];
  }
  return undefined;
}
