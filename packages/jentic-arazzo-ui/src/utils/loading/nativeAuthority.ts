import {
  Reference,
  ReferenceSet,
  Resolver,
  type File,
} from '@speclynx/apidom-reference/configuration/empty';
import {
  maybeRefractToJSONSchemaElement,
  resolveSchema$refField,
} from '@speclynx/apidom-reference/dereference/strategies/arazzo-1';
import {
  isParseResultElement,
  type Element,
  type ParseResultElement,
} from '@speclynx/apidom-datamodel';
import { traverse, type Path } from '@speclynx/apidom-traverse';
import { toValue } from '@speclynx/apidom-core';

import type { SourceDocumentContent } from '../../types/source';
import type { SourceRegistry, SourceValidityToken } from '../source/SourceRegistry';

export interface NativeSourceReference {
  declaringURI: string;
  requestedURI: string;
  requestedRevision?: string;
  retrievalURI: string;
  revision?: string;
  depth: number;
}

// Native visitors look up both requested and returned identities. An alias lookup
// returns the canonical reference, so schema children use the returned declaring URI.
class AuthorityReferenceSet extends ReferenceSet {
  readonly acquired = new Map<string, SourceDocumentContent>();
  readonly parents = new Map<string, Set<Reference>>();

  override find(predicate: (value: Reference, index: number, list: Reference[]) => boolean) {
    return super.find((reference, index, list) => {
      if (predicate(reference, index, list)) return true;
      for (const [requestedURI, provided] of this.acquired) {
        if (provided.retrievalURI !== reference.uri || requestedURI === reference.uri) continue;
        const alias = new Reference({
          uri: requestedURI,
          depth: reference.depth,
          value: reference.value,
          refSet: this,
        });
        if (predicate(alias, index, list)) return true;
      }
      return false;
    });
  }

  override add(reference: Reference): this {
    const provided = this.acquired.get(reference.uri);
    const canonical =
      provided && provided.retrievalURI !== reference.uri
        ? new Reference({
            uri: provided.retrievalURI,
            depth: reference.depth,
            value: reference.value,
          })
        : reference;
    // The native visitor keeps its original reference while looking up the
    // canonical one on the next schema visit; both belong to the same supplied set.
    reference.refSet = this;
    if (super.has(canonical.uri)) return this;
    super.add(canonical);
    if (isParseResultElement(canonical.value) && canonical.value.result) {
      const api = canonical.value.result;
      const schemas: Element =
        api.element === 'object' ? maybeRefractToJSONSchemaElement(api) : api;
      const parents = this.parents;
      traverse(schemas, {
        enter(path: Path<Element>) {
          const node = path.node;
          if (node.element !== 'JSONSchema' && node.element !== 'schema') return;
          const value = toValue(node) as Record<string, unknown>;
          if (typeof value.$ref !== 'string') return;
          try {
            const resolved = resolveSchema$refField(
              canonical.uri,
              node as Parameters<typeof resolveSchema$refField>[1],
            );
            if (!resolved) return;
            const uri = new URL(resolved);
            uri.hash = '';
            const owners = parents.get(uri.href) ?? new Set<Reference>();
            owners.add(canonical);
            parents.set(uri.href, owners);
          } catch {
            // Native resolution reports unsupported/malformed schema identity in context.
          }
        },
      });
    }
    return this;
  }
}

export function createNativeAuthority(
  root: ParseResultElement,
  uri: string,
  registry?: SourceRegistry,
  revision?: string,
  suppliedValidity?: SourceValidityToken,
) {
  const validity = suppliedValidity ?? registry?.captureValidity(uri, revision);
  const ensureCurrent = () => {
    if (registry && validity && !registry.isCurrent(validity))
      throw new Error('Obsolete Arazzo projection');
  };
  const refSet = new AuthorityReferenceSet();
  refSet.add(new Reference({ uri, value: root }));
  const references: NativeSourceReference[] = [];
  class RegistryResolver extends Resolver {
    constructor() {
      super({ name: 'viewer-authority' });
    }
    canRead() {
      return true;
    }
    async read(file: File): Promise<Buffer> {
      ensureCurrent();
      const requestedURI = new URL(file.uri, uri).href;
      if (requestedURI === uri) throw new Error('Supplied native root must not be reacquired');
      if (!registry || !validity) throw new Error('Secondary source loading is not enabled');
      const parents = [...(refSet.parents.get(requestedURI) ?? [])];
      if (!parents.length) throw new Error('Unavailable supported declaring schema context');
      const depth = Math.min(...parents.map((parent) => parent.depth + 1));
      registry.registerDependency(validity, requestedURI);
      for (const parent of parents) {
        if (parent.uri !== uri) registry.registerDependency(parent.uri, requestedURI);
      }
      const provided = await registry.acquire(requestedURI, undefined, parents[0].uri, depth);
      ensureCurrent();
      const returned = registry.resolveUri(provided.retrievalURI);
      if (returned.error) throw new Error(returned.error);
      if (returned.resolvedUri === uri)
        throw new Error('Dependency retrieval alias conflicts with supplied root identity');
      const aliases = [...refSet.acquired.values()].filter(
        (value) => value.retrievalURI === returned.resolvedUri,
      );
      if (
        aliases.some(
          (value) =>
            value.revision !== provided.revision ||
            JSON.stringify(value.content) !== JSON.stringify(provided.content),
        )
      )
        throw new Error('Conflicting dependency retrieval revision or content authority');
      const canonical = { ...provided, retrievalURI: returned.resolvedUri };
      refSet.acquired.set(requestedURI, canonical);
      for (const parent of parents)
        references.push({
          declaringURI: parent.uri,
          requestedURI,
          retrievalURI: canonical.retrievalURI,
          revision: canonical.revision,
          depth,
        });
      return new TextEncoder().encode(
        typeof canonical.content === 'string'
          ? canonical.content
          : JSON.stringify(canonical.content),
      ) as unknown as Buffer;
    }
  }
  return { refSet, resolver: new RegistryResolver(), references, ensureCurrent };
}
