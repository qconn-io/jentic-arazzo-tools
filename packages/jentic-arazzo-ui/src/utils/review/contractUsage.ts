import { decodePointer, encodePointer, readPointer, resolvePointer } from '../contract/pointer';
import { object } from '../contract/references';
import {
  childContractRole,
  contractRoleAt,
  declarationReference,
  enclosingSchemaLimitation,
  schemaLimitation,
  supportedSchemaFormat,
  type ContractRole,
} from '../contract/structure';
import type { CatalogAPIUsage } from '../catalog';
import type { WorkflowReviewEvidence } from '../../types/review';
import type { ReviewDocument, ReviewProjection } from './inputs';
const overlap = (a: string[], b: string[]) =>
  a.slice(0, Math.min(a.length, b.length)).every((v, i) => v === b[i]);
// Follow authored declaration references, rather than inferring ownership from an operation URI.
export function contractDeclarationUser(
  p: ReviewProjection,
  usage: CatalogAPIUsage,
  evidence: WorkflowReviewEvidence,
): { used: boolean; bounded: boolean } {
  const source = p.documents.find(
    (d) => d.definition.uri === usage.uri && d.definition.revision === usage.revision,
  );
  if (!source || !usage.operation || usage.status !== 'located')
    return { used: false, bounded: false };
  const changed = decodePointer(evidence.pointer);
  const profile = { eventSchemas: !!source.raw.asyncapi };
  let visits = 0,
    bounded = false;
  const inspect = (
    doc: ReviewDocument,
    value: unknown,
    path: string[],
    depth: number,
    seen: Set<string>,
    role: ContractRole,
  ): boolean => {
    if (++visits > 10000 || depth > 32) {
      bounded = true;
      return false;
    }
    if (
      doc.definition.id === evidence.documentId &&
      doc.definition.revision === evidence.revision &&
      overlap(path, changed)
    )
      return true;
    if (value === null || typeof value !== 'object' || role === 'literal') return false;
    if (
      role === 'schema' &&
      (schemaLimitation(value, profile.eventSchemas ? supportedSchemaFormat : undefined) ||
        enclosingSchemaLimitation(
          doc.raw,
          path,
          profile,
          profile.eventSchemas ? supportedSchemaFormat : undefined,
        ))
    ) {
      bounded = true;
      return false;
    }
    const reference = declarationReference(value, role);
    if (reference) {
      try {
        const ref = resolvePointer(reference, doc.definition.uri);
        const token = JSON.stringify([ref.uri, ref.pointer]);
        if (!seen.has(token)) {
          const targets = p.documents.filter(
            (d) =>
              d.definition.uri === ref.uri &&
              (ref.uri !== doc.definition.uri || d.definition.revision === doc.definition.revision),
          );
          const target = targets.length === 1 ? readPointer(targets[0].raw, ref.tokens) : undefined;
          if (target === undefined) bounded = true;
          else if (
            inspect(targets[0], target, ref.tokens, depth + 1, new Set([...seen, token]), role)
          )
            return true;
        }
      } catch {
        bounded = true;
        /* unresolved references remain part of catalog coverage */
      }
      // reference object bodies are replaced; only schemas retain traversable siblings.
      if (role !== 'schema') return false;
    }
    return Object.entries(value).some(
      ([key, child]) =>
        (key !== '$ref' || typeof role === 'object') &&
        inspect(
          doc,
          child,
          [...path, key],
          depth + 1,
          seen,
          childContractRole(role, key, value, profile),
        ),
    );
  };
  type Seed = { doc: ReviewDocument; value: unknown; path: string[]; role?: ContractRole };
  const seeds: Seed[] = [];
  const follow = (seed: Seed): Seed => {
    const seen = new Set<string>();
    for (let depth = 0; typeof object(seed.value).$ref === 'string'; depth++) {
      if (depth >= 32) {
        bounded = true;
        break;
      }
      try {
        const ref = resolvePointer(String(object(seed.value).$ref), seed.doc.definition.uri);
        const token = JSON.stringify([ref.uri, ref.pointer]);
        if (seen.has(token)) break;
        seen.add(token);
        const targets = p.documents.filter(
          (d) =>
            d.definition.uri === ref.uri &&
            (ref.uri !== seed.doc.definition.uri ||
              d.definition.revision === seed.doc.definition.revision),
        );
        if (targets.length !== 1 || readPointer(targets[0].raw, ref.tokens) === undefined) {
          bounded = true;
          break;
        }
        // Keep each reference's own authored occurrence as evidence without expanding unrelated fields.
        seeds.push({ doc: seed.doc, value: object(seed.value).$ref, path: [...seed.path, '$ref'] });
        seed = {
          doc: targets[0],
          value: readPointer(targets[0].raw, ref.tokens),
          path: ref.tokens,
          role:
            seed.role ??
            contractRoleAt(seed.doc.raw, seed.path, { eventSchemas: !!seed.doc.raw.asyncapi }),
        };
      } catch {
        break;
      }
    }
    return seed;
  };
  const op = usage.operation;
  const opPath = decodePointer(op.pointer ?? op.channelPointer ?? '#');
  if (source.raw.openapi) {
    const path = opPath.slice(0, 2);
    const itemSeed = follow({
      doc: source,
      value: readPointer(source.raw, path),
      path,
      role: 'pathItem',
    });
    const item = object(itemSeed.value);
    const operationSeed = {
      doc: itemSeed.doc,
      value: item[opPath[2]],
      path: [...itemSeed.path, opPath[2]],
      role: 'operation' as const,
    };
    const authored = object(operationSeed.value);
    seeds.push(operationSeed);
    if (Array.isArray(item.parameters)) {
      const own = Array.isArray(authored.parameters)
        ? authored.parameters.map((value, i) =>
            object(
              follow({
                doc: itemSeed.doc,
                value,
                path: [...operationSeed.path, 'parameters', String(i)],
              }).value,
            ),
          )
        : [];
      item.parameters.forEach((parameter, i) => {
        const seed = {
          doc: itemSeed.doc,
          value: parameter,
          path: [...itemSeed.path, 'parameters', String(i)],
          role: 'parameter' as const,
        };
        // Resolve identities for precedence without adding a shadowed declaration as a usage seed.
        const saved = seeds.length;
        const value = object(follow(seed).value);
        seeds.length = saved;
        if (
          !own.some((p) => p.name === value.name && p.in === value.in && value.name !== undefined)
        )
          seeds.push(seed);
      });
    }
    if (authored.servers === undefined)
      seeds.push(
        item.servers !== undefined
          ? {
              doc: itemSeed.doc,
              value: item.servers,
              path: [...itemSeed.path, 'servers'],
              role: { array: 'server' },
            }
          : { doc: source, value: source.raw.servers, path: ['servers'] },
      );
    if (authored.security === undefined)
      seeds.push({ doc: source, value: source.raw.security, path: ['security'] });
    if (Array.isArray(op.security))
      for (const requirement of op.security)
        for (const name of Object.keys(object(requirement)))
          seeds.push({
            doc: source,
            value: readPointer(source.raw, ['components', 'securitySchemes', name]),
            path: ['components', 'securitySchemes', name],
          });
    for (const key of ['info', 'openapi', 'jsonSchemaDialect'])
      if (source.raw[key] !== undefined)
        seeds.push({ doc: source, value: source.raw[key], path: [key] });
  } else {
    seeds.push({ doc: source, value: readPointer(source.raw, opPath), path: opPath });
    for (const key of ['info', 'asyncapi'])
      seeds.push({ doc: source, value: source.raw[key], path: [key] });
  }
  const used = seeds.some((seed) =>
    inspect(
      seed.doc,
      seed.value,
      seed.path,
      0,
      new Set([encodePointer(seed.path)]),
      seed.role ??
        contractRoleAt(seed.doc.raw, seed.path, { eventSchemas: !!seed.doc.raw.asyncapi }),
    ),
  );
  return { used, bounded };
}
