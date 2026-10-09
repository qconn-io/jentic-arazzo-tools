import * as yamlAdapter from '@speclynx/apidom-parser-adapter-yaml-1-2';

import type { SourceRegistry, SourceValidityToken } from '../source/SourceRegistry';
import type { ContractValue, InspectedSchemaReference } from './types';
import { decodePointer, encodePointer, readPointer, resolvePointer } from './pointer';
import {
  childContractRole,
  contractRoleAt,
  declarationReference,
  enclosingSchemaLimitation,
  schemaLimitation,
  type ContractRole,
} from './structure';

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
      const limitation = enclosingSchemaLimitation(
        acquired.root,
        resolved.tokens,
        profile,
        supportsSchemaFormat,
      );
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

  async function inspectSchema(
    value: ContractValue | undefined,
    base: string,
    depth: number,
    links: Set<string>,
    location: string[],
    nesting: number,
    role: ContractRole = 'schema',
  ): Promise<void> {
    ensureCurrent();
    if (nesting > 128) {
      diagnose('Inspection nesting limit reached; authored content is retained');
      return;
    }
    if (value === null || typeof value !== 'object' || role === 'literal') return;
    if (typeof role === 'object') {
      for (const [key, child] of Object.entries(value))
        await inspectSchema(
          child,
          base,
          depth,
          links,
          [...location, key],
          nesting + 1,
          childContractRole(role, key, value, profile),
        );
      return;
    }
    if (Array.isArray(value)) return;
    const limitation = schemaLimitation(value, supportsSchemaFormat);
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
    for (const [key, child] of Object.entries(value)) {
      const childRole = childContractRole(role, key, value, profile);
      if (childRole !== 'literal')
        await inspectSchema(child, base, depth, links, [...location, key], nesting + 1, childRole);
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

  async function projectRole(
    value: ContractValue | undefined,
    base: string,
    depth: number,
    links: Set<string>,
    nesting: number,
    role: ContractRole,
    location: string[],
  ): Promise<ContractValue | undefined> {
    ensureCurrent();
    if (nesting > 128) {
      diagnose('Inspection nesting limit reached; authored content is retained');
      return value;
    }
    if (role === 'literal') return value;
    if (role === 'schema') {
      if (!unsupportedDefaultDialect)
        await inspectSchema(value, base, depth, links, location, nesting);
      return value;
    }
    if (value === null || typeof value !== 'object') return value;
    const ref = declarationReference(value, role);
    if (ref) {
      try {
        const target = await referenceTarget(ref, base, depth, links);
        const projected = await projectRole(
          target.value,
          target.base,
          target.depth,
          target.links,
          nesting + 1,
          role,
          decodePointer(target.pointer),
        );
        // OpenAPI 3.1 Reference Objects permit summary/description overrides, not schema merging.
        if (!profile.openapi31) return projected;
        return {
          ...object(projected),
          ...(typeof object(value).summary === 'string' ? { summary: object(value).summary } : {}),
          ...(typeof object(value).description === 'string'
            ? { description: object(value).description }
            : {}),
        };
      } catch (error) {
        ensureCurrent();
        diagnose(
          `Reference retained: ${ref} (${error instanceof Error ? error.message : String(error)})`,
        );
        return value;
      }
    }
    if (Array.isArray(value))
      return Promise.all(
        value.map((item, index) =>
          projectRole(
            item,
            base,
            depth,
            links,
            nesting + 1,
            childContractRole(role, String(index), value, profile),
            [...location, String(index)],
          ).then((v) => v ?? null),
        ),
      );
    const result: ContractObject = {};
    for (const [key, item] of Object.entries(value))
      result[key] =
        (await projectRole(
          item,
          base,
          depth,
          links,
          nesting + 1,
          childContractRole(role, key, value, profile),
          [...location, key],
        )) ?? null;
    return result;
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
    let role = contractRoleAt(root, location, profile);
    // adapters also project operation/path-parameter fragments from external path-item documents.
    const last = location[location.length - 1];
    if (
      ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(last) ||
      location[location.length - 2] === 'operations'
    )
      role = 'operation';
    else if (last === 'parameters') role = { array: 'parameter' };
    if (map && typeof role !== 'object') role = { map: role };
    return projectRole(value, base, depth, links, nesting, role, location);
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
