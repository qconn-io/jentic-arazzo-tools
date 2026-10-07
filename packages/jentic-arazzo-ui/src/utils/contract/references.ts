import * as yamlAdapter from '@speclynx/apidom-parser-adapter-yaml-1-2';

import type { SourceRegistry, SourceValidityToken } from '../source/SourceRegistry';
import type { ContractValue, InspectedSchemaReference } from './types';
import { decodePointer, encodePointer, readPointer, resolvePointer } from './pointer';

export type ContractObject = { [key: string]: ContractValue };
export const object = (value: unknown): ContractObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as ContractObject)
    : {};
export const string = (value: ContractValue | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

/** Parse acquired content only; the generic YAML adapter has no URI acquisition fallback. */
async function parseValue(content: string | object): Promise<ContractValue> {
  if (typeof content !== 'string') return JSON.parse(JSON.stringify(content));
  try {
    return JSON.parse(content);
  } catch {
    const result = await yamlAdapter.parse(content, { sourceMap: true });
    if (!result.result) throw new Error('No contract value found');
    return result.result.toValue() as ContractValue;
  }
}
export async function parseContract(content: string | object): Promise<ContractObject> {
  const value = await parseValue(content);
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new Error('No contract object found');
  return object(value);
}

export function pointerValue(root: ContractValue, fragment: string): ContractValue | undefined {
  return readPointer(root, decodePointer(fragment || '#')) as ContractValue | undefined;
}

interface ProjectorProfile {
  revision?: string;
  openapi31?: boolean;
  eventSchemas?: boolean;
  ensureCurrent?: () => void;
  validity?: SourceValidityToken;
}

/** Contract references are projected; schema declarations stay authored, with separate targets. */
export function createReferenceProjector(
  root: ContractObject,
  uri: string,
  registry: SourceRegistry,
  diagnostics: string[],
  unsupportedDefaultDialect = false,
  supportsSchemaFormat?: (format: string) => boolean,
  profile: ProjectorProfile = {},
) {
  const validity = profile.validity ?? registry.captureValidity(uri, profile.revision);
  const ensureCurrent =
    profile.ensureCurrent ??
    (() => {
      if (!registry.isCurrent(validity)) throw new Error('Obsolete contract projection');
    });
  const schemaReferences: InspectedSchemaReference[] = [];
  const documents = new Map<
    string,
    Promise<{ root: ContractValue; uri: string; revision?: string }>
  >([[uri, Promise.resolve({ root, uri, revision: profile.revision })]]);
  const diagnose = (message: string) => {
    if (!diagnostics.includes(message)) diagnostics.push(message);
  };
  const literalKeys = new Set(['example', 'examples', 'default', 'enum', 'const']);
  const mapKeys = new Set([
    'channels',
    'operations',
    'messages',
    'responses',
    'content',
    'securitySchemes',
    'headers',
  ]);
  const schemaMaps = [
    'properties',
    'patternProperties',
    '$defs',
    'definitions',
    'dependentSchemas',
    'dependencies',
  ];
  const schemaArrays = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
  const schemaSingles = [
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
  ];

  async function referenceTarget(
    ref: string,
    base: string,
    depth: number,
    links: Set<string>,
    schema = false,
  ) {
    ensureCurrent();
    const resolved = resolvePointer(ref, base);
    const identity = `${resolved.uri}${resolved.pointer}`;
    if (links.has(identity)) throw new Error(`Recursive reference retained: ${identity}`);
    const external = resolved.uri !== base;
    const nextDepth = depth + (external ? 1 : 0);
    if (external && nextDepth > registry.budget.maxReferenceDepth)
      throw new Error(`Reference depth limit reached: ${identity}`);
    if (external) {
      if (base !== uri) registry.registerDependency(base, resolved.uri);
      registry.registerDependency(validity, resolved.uri);
    }
    let document = documents.get(resolved.uri);
    if (!document) {
      document = registry
        .acquire(resolved.uri, undefined, base, nextDepth)
        .then(async (provided) => {
          ensureCurrent();
          const acquired = {
            root: await parseValue(provided.content),
            uri: provided.retrievalURI,
            revision: provided.revision,
          };
          ensureCurrent();
          documents.set(provided.retrievalURI, Promise.resolve(acquired));
          return acquired;
        });
      documents.set(resolved.uri, document);
    }
    const acquired = await document;
    ensureCurrent();
    if (schema) {
      const limitation = enclosingSchemaLimitation(acquired.root, resolved.tokens);
      if (limitation) throw new Error(limitation);
    }
    const target = pointerValue(acquired.root, resolved.pointer);
    if (target === undefined) throw new Error(`Unresolved reference retained: ${identity}`);
    return {
      value: target,
      base: acquired.uri,
      revision: acquired.revision,
      pointer: resolved.pointer,
      depth: nextDepth,
      links: new Set(links).add(identity),
    };
  }

  function schemaLimitation(value: ContractObject): string | undefined {
    if (
      typeof value.schemaFormat === 'string' &&
      supportsSchemaFormat &&
      !supportsSchemaFormat(value.schemaFormat)
    )
      return `Unsupported schema format retained: ${value.schemaFormat}`;
    if (
      typeof value.$schema === 'string' &&
      !/^https?:\/\/json-schema.org\/(draft\/(2020-12|2019-09)|draft-0[467])\/schema#?$/.test(
        value.$schema,
      ) &&
      !/^https?:\/\/spec.openapis.org\/oas\/3\.1\/dialect\/base#?$/.test(value.$schema)
    )
      return `Unsupported schema dialect retained: ${value.$schema}`;
    if (
      value.$id !== undefined ||
      value.id !== undefined ||
      value.$anchor !== undefined ||
      value.$dynamicAnchor !== undefined ||
      value.$dynamicRef !== undefined
    )
      return 'Unsupported schema resource identifiers or anchors; authored schema retained';
    return undefined;
  }

  function enclosingSchemaLimitation(
    document: ContractValue,
    tokens: string[],
  ): string | undefined {
    const contract = object(document);
    if (
      typeof contract.openapi === 'string' &&
      typeof contract.jsonSchemaDialect === 'string' &&
      contract.jsonSchemaDialect !== 'https://spec.openapis.org/oas/3.1/dialect/base'
    )
      return `Unsupported document schema dialect retained: ${contract.jsonSchemaDialect}`;
    let mode: 'contract' | 'schema' | 'map' | 'array' =
      contract.openapi || contract.asyncapi ? 'contract' : 'schema';
    let value: ContractValue | undefined = document;
    for (let index = 0; index <= tokens.length; index++) {
      const current = object(value);
      if (mode === 'schema') {
        const limitation = schemaLimitation(current);
        if (limitation) return limitation;
      }
      if (index === tokens.length) break;
      const key = tokens[index];
      if (mode === 'map' || mode === 'array') mode = 'schema';
      else if (mode === 'schema') {
        if (schemaMaps.includes(key)) mode = 'map';
        else if (schemaArrays.includes(key) || (key === 'items' && Array.isArray(current.items)))
          mode = 'array';
        else if (
          !schemaSingles.includes(key) &&
          !(key === 'schema' && typeof current.schemaFormat === 'string')
        )
          mode = 'contract';
      } else if (key === 'schemas' && tokens[index - 1] === 'components') mode = 'map';
      else if (key === 'schema' || (profile.eventSchemas && ['payload', 'headers'].includes(key)))
        mode = 'schema';
      value = readPointer(value, [key]) as ContractValue | undefined;
    }
    return undefined;
  }

  async function inspectSchema(
    value: ContractValue | undefined,
    base: string,
    depth: number,
    links: Set<string>,
    location: string[],
    nesting: number,
  ): Promise<void> {
    ensureCurrent();
    if (nesting > 128) {
      diagnose('Inspection nesting limit reached; authored content is retained');
      return;
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return;
    const limitation = schemaLimitation(value);
    if (limitation) {
      diagnose(limitation);
      return;
    }
    // AsyncAPI Multi Format Schema Objects contain a schema in a supported declared format.
    if (typeof value.schemaFormat === 'string') {
      await inspectSchema(value.schema, base, depth, links, [...location, 'schema'], nesting + 1);
      return;
    }
    const ref = string(value.$ref);
    if (ref) {
      const record: InspectedSchemaReference = {
        occurrence: encodePointer(location),
        authoredReference: ref,
        declaringURI: base,
        status: 'unresolved',
      };
      schemaReferences.push(record);
      try {
        const target = await referenceTarget(ref, base, depth, links, true);
        Object.assign(record, {
          targetURI: target.base,
          targetPointer: target.pointer,
          revision: target.revision,
          declaration: target.value,
          status: 'located',
        });
        await inspectSchema(
          target.value,
          target.base,
          target.depth,
          target.links,
          decodePointer(target.pointer),
          nesting + 1,
        );
      } catch (error) {
        ensureCurrent();
        record.diagnostic = error instanceof Error ? error.message : String(error);
        record.status = /Recursive/.test(record.diagnostic)
          ? 'recursive'
          : /Unsupported|Invalid/.test(record.diagnostic)
            ? 'unsupported'
            : 'unresolved';
        diagnose(`${record.diagnostic} (${ref})`);
      }
    }
    for (const key of schemaMaps) {
      for (const [name, child] of Object.entries(object(value[key])))
        await inspectSchema(child, base, depth, links, [...location, key, name], nesting + 1);
    }
    for (const key of schemaArrays) {
      const children = value[key];
      if (Array.isArray(children))
        for (let i = 0; i < children.length; i++)
          await inspectSchema(
            children[i],
            base,
            depth,
            links,
            [...location, key, String(i)],
            nesting + 1,
          );
    }
    for (const key of schemaSingles) {
      const child = value[key];
      if (Array.isArray(child) && key === 'items') {
        for (let i = 0; i < child.length; i++)
          await inspectSchema(
            child[i],
            base,
            depth,
            links,
            [...location, key, String(i)],
            nesting + 1,
          );
      } else await inspectSchema(child, base, depth, links, [...location, key], nesting + 1);
    }
  }

  async function follow(
    value: ContractValue | undefined,
    base = uri,
    depth = 0,
    links = new Set<string>(),
    pointer?: string,
    revision = profile.revision,
  ): Promise<{
    value: ContractValue | undefined;
    base: string;
    depth: number;
    links: Set<string>;
    pointer?: string;
    revision?: string;
    status: 'located' | 'unresolved';
  }> {
    const ref = string(object(value).$ref);
    if (!ref)
      return {
        value,
        base,
        depth,
        links,
        pointer,
        revision,
        status: value === undefined ? 'unresolved' : 'located',
      };
    try {
      const target = await referenceTarget(ref, base, depth, links);
      return follow(
        target.value,
        target.base,
        target.depth,
        target.links,
        target.pointer,
        target.revision,
      );
    } catch (error) {
      ensureCurrent();
      diagnose(`${error instanceof Error ? error.message : String(error)} (${ref})`);
      return { value, base, depth, links, pointer, revision, status: 'unresolved' };
    }
  }

  async function project(
    value: ContractValue | undefined,
    base = uri,
    depth = 0,
    links = new Set<string>(),
    nesting = 0,
    map = false,
    location: string[] = [],
  ): Promise<ContractValue | undefined> {
    ensureCurrent();
    if (nesting > 128) {
      diagnose('Inspection nesting limit reached; authored content is retained');
      return value;
    }
    if (Array.isArray(value))
      return Promise.all(
        value.map((item, index) =>
          project(item, base, depth, links, nesting + 1, false, [...location, String(index)]).then(
            (v) => v ?? null,
          ),
        ),
      );
    if (value === null || typeof value !== 'object') return value;
    const ref = map ? undefined : string(value.$ref);
    if (ref) {
      try {
        const target = await referenceTarget(ref, base, depth, links);
        const projected = await project(
          target.value,
          target.base,
          target.depth,
          target.links,
          nesting + 1,
          false,
          decodePointer(target.pointer),
        );
        // OpenAPI 3.1 Reference Objects permit summary/description overrides, not schema merging.
        if (!profile.openapi31) return projected;
        return {
          ...object(projected),
          ...(typeof value.summary === 'string' ? { summary: value.summary } : {}),
          ...(typeof value.description === 'string' ? { description: value.description } : {}),
        };
      } catch (error) {
        ensureCurrent();
        diagnose(
          `Reference retained: ${ref} (${error instanceof Error ? error.message : String(error)})`,
        );
        return value;
      }
    }
    const result: ContractObject = {};
    for (const [key, item] of Object.entries(value)) {
      const childLocation = [...location, key];
      if (
        !map &&
        (key === 'schema' || (profile.eventSchemas && ['payload', 'headers'].includes(key)))
      ) {
        if (!unsupportedDefaultDialect)
          await inspectSchema(item, base, depth, links, childLocation, nesting + 1);
        result[key] = item;
      } else
        result[key] =
          !map && (literalKeys.has(key) || key.startsWith('x-'))
            ? item
            : ((await project(
                item,
                base,
                depth,
                links,
                nesting + 1,
                !map && mapKeys.has(key),
                childLocation,
              )) ?? null);
    }
    return result;
  }
  return { project, follow, schemaReferences };
}

export function indexOperations(
  operations: import('./types').ContractOperation[],
): Map<string, import('./types').ContractOperation> {
  const counts = new Map<string, number>();
  operations.forEach((op) => {
    if (op.operationId) counts.set(op.operationId, (counts.get(op.operationId) ?? 0) + 1);
  });
  const result = new Map<string, import('./types').ContractOperation>();
  for (const op of operations) {
    const preferred =
      op.operationId && counts.get(op.operationId) === 1 ? op.operationId : op.pointer!;
    let key = preferred;
    let suffix = 0;
    while (result.has(key)) key = `${preferred}::${++suffix}`;
    result.set(key, op);
  }
  return result;
}
