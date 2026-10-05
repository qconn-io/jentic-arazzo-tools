import { dereferenceOpenAPI } from '@jentic/arazzo-resolver';
import { Resolver, File, ResolverError } from '@speclynx/apidom-reference/configuration/empty';
import { isObjectElement, isStringElement, isArrayElement, Element, ObjectElement } from '@speclynx/apidom-datamodel';

import { SourceRegistry } from '../source/SourceRegistry';
import { ContractDocumentFacts } from './types';

function createSourceRegistryResolver(registry: SourceRegistry, baseUri: string, rawContent: string | object) {
  const resolver = new (Resolver as any)({ name: 'source-registry' });
  
  resolver.canRead = (file: File): boolean => {
    return true; // We intercept everything
  };

  resolver.read = async (file: File): Promise<Buffer> => {
    console.log(`[SourceRegistryResolver] read called for ${file.uri}`);
    try {
      if (file.uri === baseUri) {
        console.log(`[SourceRegistryResolver] returning raw content for ${file.uri}`);
        const text = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        return new TextEncoder().encode(text) as unknown as Buffer;
      }
      const content = await registry.acquire(file.uri, undefined, baseUri);
      const text = typeof content.content === 'string' ? content.content : JSON.stringify(content.content);
      return new TextEncoder().encode(text) as unknown as Buffer;
    } catch (e) {
      throw new ResolverError(`Failed to load ${file.uri}`, { cause: e });
    }
  };

  return resolver;
}

export async function projectOpenAPI(
  content: string | object,
  uri: string,
  registry: SourceRegistry,
  revision?: string,
): Promise<ContractDocumentFacts> {
  const resolver = createSourceRegistryResolver(registry, uri, content);

  const derefOptions = {
    baseURI: uri,
    resolve: { resolvers: [resolver] },
  };

  console.log('[projectOpenAPI] calling dereferenceOpenAPI');
  const dereferenced = await dereferenceOpenAPI(uri, derefOptions);
  console.log('[projectOpenAPI] dereferenceOpenAPI completed');

  // 3. Extract facts
  const facts: ContractDocumentFacts = {
    version: '',
    dialect: 'openapi',
    uri,
    revision,
    operations: new Map(),
    rawContent: content,
    unsupportedDiagnostics: [],
  };

  const api = dereferenced.api;
  if (!api || !isObjectElement(api)) {
    facts.dialect = 'unsupported';
    facts.unsupportedDiagnostics.push('No API object found');
    return facts;
  }

  // Version
  const openapiElem = api.get('openapi');
  if (isStringElement(openapiElem)) {
    facts.version = String(openapiElem.toValue());
  } else {
    const swaggerElem = api.get('swagger');
    if (isStringElement(swaggerElem)) {
      facts.version = String(swaggerElem.toValue());
      facts.dialect = 'unsupported';
      facts.unsupportedDiagnostics.push('OpenAPI 2.0 (Swagger) is not fully supported');
    } else {
      facts.dialect = 'unsupported';
      facts.unsupportedDiagnostics.push('Unknown or missing OpenAPI version');
    }
  }

  // Paths
  const paths = api.get('paths');
  if (isObjectElement(paths)) {
    paths.forEach((pathItem: Element, pathKey: Element) => {
      if (!isObjectElement(pathItem)) return;
      const pathValue = String(pathKey.toValue());

      // Path-level parameters
      const pathParamsElem = pathItem.get('parameters');
      const pathParams = extractParameters(pathParamsElem);

      // Operations
      const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
      for (const method of methods) {
        const op = pathItem.get(method);
        if (isObjectElement(op)) {
          const operationId = op.get('operationId')
            ? String(op.get('operationId')?.toValue())
            : undefined;

          const opParams = extractParameters(op.get('parameters'));
          // Merge parameters (operation overrides path)
          const paramsMap = new Map();
          for (const p of pathParams) paramsMap.set(`${p.in}:${p.name}`, p);
          for (const p of opParams) paramsMap.set(`${p.in}:${p.name}`, p);

          const parameters = Array.from(paramsMap.values());

          const opKey = operationId || `${method.toUpperCase()} ${pathValue}`;

          facts.operations.set(opKey, {
            operationId,
            path: pathValue,
            method: method.toUpperCase(),
            parameters,
            // add security, requestBody, responses...
          });
        }
      }
    });
  }

  return facts;
}

function extractParameters(paramsElem: Element | undefined) {
  const result: any[] = [];
  if (isArrayElement(paramsElem)) {
    paramsElem.forEach((p: Element) => {
      if (isObjectElement(p)) {
        result.push({
          name: String(p.get('name')?.toValue()),
          in: String(p.get('in')?.toValue()),
          required: Boolean(p.get('required')?.toValue() ?? false),
          schema: p.get('schema')?.toValue(),
        });
      }
    });
  }
  return result;
}
