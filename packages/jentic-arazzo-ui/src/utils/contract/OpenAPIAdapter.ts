import { parseOpenAPI, defaultParseOpenAPIOptions } from '@jentic/arazzo-parser';

import { decodePointer, encodePointer } from './pointer';
import type { SourceRegistry, SourceValidityToken } from '../source/SourceRegistry';
import type {
  ContractDocumentFacts,
  ContractOperation,
  ContractOperationParameter,
  ContractValue,
} from './types';
import {
  createReferenceProjector,
  indexOperations,
  object,
  parseContract,
  string,
} from './references';

export async function projectOpenAPI(
  content: string | object,
  uri: string,
  registry: SourceRegistry,
  revision?: string,
  acquisitionValidity?: SourceValidityToken,
): Promise<ContractDocumentFacts> {
  const validity = acquisitionValidity ?? registry.captureValidity(uri, revision);
  const ensureCurrent = () => {
    if (!registry.isCurrent(validity)) throw new Error('Obsolete contract projection');
  };
  let api = await parseContract(content);
  const version = string(api.openapi) ?? string(api.swagger) ?? '';
  const facts: ContractDocumentFacts = {
    version,
    dialect: 'openapi',
    uri,
    revision,
    operations: new Map(),
    rawContent: content,
    unsupportedDiagnostics: [],
  };
  if (!/^3\.[01]\.\d+$/.test(version)) {
    facts.dialect = 'unsupported';
    facts.unsupportedDiagnostics.push(
      api.swagger === '2.0'
        ? 'OpenAPI 2.0 (Swagger) is not fully supported'
        : `Unsupported OpenAPI version: ${version || 'missing'}`,
    );
    return facts;
  }
  // The object path cannot be interpreted as a URI; only the parser's memory resolver is enabled.
  const parsed = await parseOpenAPI(api, {
    resolve: {
      resolvers: defaultParseOpenAPIOptions.resolve?.resolvers?.filter(
        (resolver) => resolver.name === 'memory',
      ),
    },
    parse: { parserOpts: { strict: false } },
  });
  api = object(parsed.api?.toValue());
  if (
    typeof api.jsonSchemaDialect === 'string' &&
    api.jsonSchemaDialect !== 'https://spec.openapis.org/oas/3.1/dialect/base'
  ) {
    facts.unsupportedDiagnostics.push(
      `Unsupported document schema dialect: ${api.jsonSchemaDialect}; schema declarations are retained without compatibility claims`,
    );
  }
  const makeProjector = () =>
    createReferenceProjector(
      api,
      uri,
      registry,
      facts.unsupportedDiagnostics,
      typeof api.jsonSchemaDialect === 'string' &&
        api.jsonSchemaDialect !== 'https://spec.openapis.org/oas/3.1/dialect/base',
      undefined,
      { revision, openapi31: version.startsWith('3.1.'), ensureCurrent, validity },
    );
  ensureCurrent();
  const operations: ContractOperation[] = [];
  const parameters = (value: ContractValue | undefined): ContractOperationParameter[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map(object)
      .filter(
        (p) =>
          typeof p.name === 'string' &&
          ['query', 'header', 'path', 'cookie'].includes(String(p.in)),
      )
      .map((p) => ({
        name: String(p.name),
        in: p.in as ContractOperationParameter['in'],
        required: p.required === true,
        ...(p.schema !== undefined ? { schema: p.schema } : {}),
        ...(p.content !== undefined ? { content: p.content } : {}),
        ...(typeof p.description === 'string' ? { description: p.description } : {}),
      }));
  };
  for (const [path, authoredPath] of Object.entries(object(api.paths))) {
    if (!path.startsWith('/')) continue;
    const followed = await makeProjector().follow(authoredPath);
    const pathItem = object(followed.value);
    const pathLocation = followed.pointer ? decodePointer(followed.pointer) : ['paths', path];
    if (
      object(authoredPath).$ref &&
      Object.keys(object(authoredPath)).some((key) => key !== '$ref')
    )
      facts.unsupportedDiagnostics.push(
        `Path Item reference siblings retained in raw source; their combined semantics are unsupported: ${path}`,
      );
    for (const method of ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']) {
      if (!pathItem[method] || typeof pathItem[method] !== 'object') continue;
      const { project, schemaReferences } = makeProjector();
      const op = object(
        await project(pathItem[method], followed.base, followed.depth, followed.links, 0, false, [
          ...pathLocation,
          method,
        ]),
      );
      const pathParameters = await project(
        pathItem.parameters,
        followed.base,
        followed.depth,
        followed.links,
        0,
        false,
        [...pathLocation, 'parameters'],
      );
      const merged = new Map<string, ContractOperationParameter>();
      [...parameters(pathParameters), ...parameters(op.parameters)].forEach((p) =>
        merged.set(`${p.in}:${p.name}`, p),
      );
      operations.push({
        schemaReferences,
        operationId: string(op.operationId),
        pointer: encodePointer(['paths', path, method]),
        path,
        method: method.toUpperCase(),
        summary: string(op.summary),
        parameters: [...merged.values()],
        security: op.security ?? api.security,
        servers: op.servers ?? pathItem.servers ?? api.servers,
        requestBody: op.requestBody,
        responses: op.responses,
      });
    }
  }
  ensureCurrent();
  facts.operations = indexOperations(operations);
  return facts;
}
