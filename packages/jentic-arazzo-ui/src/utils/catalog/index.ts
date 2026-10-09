import type {
  WorkflowCatalogIdentity,
  WorkflowCatalogMetadata,
  WorkflowCatalogCoverage,
} from '../../types/catalog';
import type { WorkflowLocation } from '../../types/location';
import type { WorkflowFact, ClassifiedTarget, PrerequisiteFact } from '../inspection';
import type { ContractOperation } from '../contract/types';
import {
  resolveScopedOperation,
  type OperationLookupStatus,
  type OperationLocators,
} from '../contract/OperationStatusResolver';
import { encodePointer as encodeTokens } from '../contract/pointer';
import { catalogKey, CATALOG_NAMESPACE } from './manifest';
import type { CatalogLoadResult, CatalogLoadedDocument } from './load';
import { effectiveUseLocation, type EffectiveActionUse } from '../model/effectiveUses';

const encodePointer = (path: (string | number)[]) => encodeTokens(path.map(String));

export interface CatalogEntry extends WorkflowCatalogIdentity {
  key: string;
  metadata?: WorkflowCatalogMetadata;
  document: CatalogLoadedDocument;
  workflow: WorkflowFact;
  location: WorkflowLocation;
}
export type CatalogRelationshipKind = 'call' | 'prerequisite' | 'goto' | 'retry' | 'descriptive';
export interface CatalogRelationship {
  id: string;
  kind: CatalogRelationshipKind;
  from: WorkflowCatalogIdentity;
  to?: WorkflowCatalogIdentity;
  targetStepId?: string;
  reference: string;
  status: 'located' | 'unresolved';
  location: WorkflowLocation;
  pointer: string;
  declarationPointer?: string;
  description?: string;
}
export interface CatalogAPIUsage {
  id: string;
  from: WorkflowCatalogIdentity;
  stepId: string;
  location: WorkflowLocation;
  authored: OperationLocators;
  status: OperationLookupStatus;
  operationKey?: string;
  operation?: ContractOperation;
  uri?: string;
  revision?: string;
  diagnostics: string[];
}
export interface CatalogIndex {
  entries: CatalogEntry[];
  byKey: Map<string, CatalogEntry>;
  relationships: CatalogRelationship[];
  apiUsages: CatalogAPIUsage[];
  coverage: readonly WorkflowCatalogCoverage[];
  complete: boolean;
  coverageMessage: string;
}
export function buildCatalogIndex(loaded: CatalogLoadResult): CatalogIndex {
  const entries: CatalogEntry[] = [];
  // Dynamic contract sources can carry explicitly declared external workflow facts.
  const documents = new Map<string, CatalogLoadedDocument>();
  const include = (doc: CatalogLoadedDocument) => {
    const key = JSON.stringify([doc.definition.id, doc.definition.revision]);
    if (documents.has(key)) return;
    documents.set(key, doc);
    for (const source of doc.sources.values()) if (!(source instanceof Error)) include(source);
  };
  loaded.documents.forEach(include);
  for (const doc of documents.values())
    for (const workflow of doc.inspection?.workflows ?? []) {
      const identity = {
        documentId: doc.definition.id,
        revision: doc.definition.revision,
        workflowId: workflow.workflowId,
      };
      const location: WorkflowLocation = {
        version: 1,
        document: doc.uri,
        revision: identity.revision,
        digest: doc.digest,
        root: identity.workflowId,
        view: 'docs',
        subview: 'docs',
        extensions: {
          [CATALOG_NAMESPACE]: {
            catalogId: loaded.manifest.id,
            catalogRevision: loaded.manifest.revision,
            documentId: identity.documentId,
            revision: identity.revision,
          },
        },
      };
      entries.push({
        ...identity,
        key: catalogKey(identity),
        document: doc,
        workflow,
        location,
        metadata: doc.definition.workflows?.find((m) => m.workflowId === workflow.workflowId),
      });
    }
  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  const relationships: CatalogRelationship[] = [],
    apiUsages: CatalogAPIUsage[] = [];
  const destination = (entry: CatalogEntry, target: ClassifiedTarget) => {
    const external = target.kind.startsWith('external');
    const source = external ? entry.document.sources.get(target.sourceName ?? '') : entry.document;
    if (
      !source ||
      source instanceof Error ||
      !target.workflowId ||
      (!external && !target.navigable)
    )
      return undefined;
    const identity = {
      documentId: source.definition.id,
      revision: source.definition.revision,
      workflowId: target.workflowId,
    };
    const found = byKey.get(catalogKey(identity));
    if (!found || (target.stepId && !found.workflow.steps.some((s) => s.stepId === target.stepId)))
      return undefined;
    return identity;
  };
  for (const entry of entries) {
    const relationship = (
      kind: CatalogRelationshipKind,
      target: ClassifiedTarget,
      fact: { path: (string | number)[]; declarationPath?: (string | number)[]; stepId?: string },
      use?: EffectiveActionUse,
    ) => {
      const pointer = encodePointer(fact.path);
      let location: WorkflowLocation = { ...entry.location };
      if (fact.stepId)
        location.selection = { kind: 'step', workflowId: entry.workflowId, stepId: fact.stepId };
      if (use) location = effectiveUseLocation(entry.location, use);
      const to = destination(entry, target);
      relationships.push({
        id: `${entry.key}:${pointer}${use ? `:${JSON.stringify(use.stepId)}` : ''}`,
        kind,
        from: entry,
        to,
        targetStepId: target.stepId,
        reference: target.reference,
        status: to ? 'located' : 'unresolved',
        location,
        pointer,
        declarationPointer:
          use?.declarationPointer ??
          (fact.declarationPath ? encodePointer(fact.declarationPath) : undefined),
      });
    };
    const prerequisites = (facts: PrerequisiteFact[]) =>
      facts.forEach((fact) => relationship('prerequisite', fact.target, fact));
    const actions = (uses: EffectiveActionUse[]) =>
      uses.forEach((use) => {
        const fact = use.action;
        if (fact.target && (fact.value.type === 'goto' || fact.value.type === 'retry'))
          relationship(fact.value.type, fact.target, { ...fact, stepId: use.stepId }, use);
      });
    prerequisites(entry.workflow.prerequisites);
    actions(
      (entry.document.effectiveUses ?? []).filter((use) => use.workflowId === entry.workflowId),
    );
    for (const step of entry.workflow.steps) {
      if (step.callTarget) relationship('call', step.callTarget, step);
      prerequisites(step.prerequisites);
      const binding = step.sourceBinding;
      if (step.value.workflowId !== undefined || !Object.keys(binding.locators).length) continue;
      const locators: OperationLocators = { ...binding.locators };
      if (binding.sourceName)
        for (const key of Object.keys(locators) as (keyof OperationLocators)[]) {
          const value = locators[key];
          if (typeof value !== 'string') continue;
          const prefix = `$sourceDescriptions.${binding.sourceName}.`,
            urlPrefix = `{$sourceDescriptions.${binding.sourceName}.url}`;
          locators[key] = value.startsWith(prefix)
            ? value.slice(prefix.length)
            : value.startsWith(urlPrefix)
              ? `${(entry.document.sources.get(binding.sourceName) as CatalogLoadedDocument | undefined)?.uri ?? ''}${value.slice(urlPrefix.length)}`
              : value;
        }
      const candidates = binding.candidates.map((name) => {
        const source = entry.document.sources.get(name);
        return source && !(source instanceof Error) && source.contracts
          ? { state: 'success' as const, facts: source.contracts }
          : {
              state: 'error' as const,
              error: source instanceof Error ? source : new Error('Source facts unavailable'),
            };
      });
      const result = resolveScopedOperation(locators, candidates);
      const exact = result.status === 'located' ? result.candidates?.[0] : undefined;
      const location: WorkflowLocation = {
        ...entry.location,
        selection: { kind: 'step', workflowId: entry.workflowId, stepId: step.stepId },
      };
      apiUsages.push({
        id: `${entry.key}:${encodePointer(step.path)}`,
        from: entry,
        stepId: step.stepId,
        location,
        authored: { ...binding.locators },
        status: result.status,
        operation: exact?.operation,
        operationKey: exact
          ? JSON.stringify([
              exact.uri,
              exact.revision ?? null,
              exact.operation.pointer ?? exact.operation.channelPointer,
            ])
          : undefined,
        uri: exact?.uri,
        revision: exact?.revision,
        diagnostics: result.diagnostics ?? [],
      });
    }
  }
  for (const association of loaded.manifest.associations ?? []) {
    const entry = byKey.get(catalogKey(association.from));
    if (!entry) continue;
    const to = byKey.has(catalogKey(association.to)) ? association.to : undefined;
    relationships.push({
      id: `association:${association.id}`,
      kind: 'descriptive',
      from: association.from,
      to,
      reference: association.id,
      description: association.description,
      status: to ? 'located' : 'unresolved',
      pointer: `manifest association ${association.id}`,
      location: association.stepId
        ? {
            ...entry.location,
            selection: { kind: 'step', workflowId: entry.workflowId, stepId: association.stepId },
          }
        : entry.location,
    });
  }
  const complete =
    loaded.coverage.every((c) => c.state === 'loaded') &&
    [...documents.values()].every((doc) =>
      (doc.effectiveUses ?? []).every((use) => use.action.status === 'resolved'),
    ) &&
    relationships.every((r) => r.status === 'located') &&
    apiUsages.every((u) => u.status === 'located');
  return {
    entries,
    byKey,
    relationships,
    apiUsages,
    coverage: loaded.coverage,
    complete,
    coverageMessage: complete
      ? 'Complete indexing of the supplied catalog scope only.'
      : 'Partial coverage of the supplied catalog scope. Unknown or omitted consumers may exist.',
  };
}
export interface CatalogFilter {
  search?: string;
  product?: string;
  capability?: string;
  owner?: string;
  lifecycle?: string;
  api?: string;
  role?: string;
}
export function filterCatalogEntries(index: CatalogIndex, filter: CatalogFilter): CatalogEntry[] {
  return index.entries.filter((entry) => {
    const m = entry.metadata;
    const apis = index.apiUsages
      .filter((u) => catalogKey(u.from) === entry.key)
      .flatMap((u) => [
        u.operationKey,
        u.operation?.operationId,
        u.operation?.path,
        ...Object.values(u.authored),
      ])
      .filter((v): v is string => typeof v === 'string');
    const data = [
      entry.documentId,
      entry.revision,
      entry.workflowId,
      m?.title,
      m?.description,
      m?.owner ?? 'unknown',
      m?.lifecycle,
      m?.product,
      ...(m?.capabilities ?? []),
      ...(m?.tags ?? []),
      ...(m?.api ?? []),
      ...apis,
    ]
      .join(' ')
      .toLowerCase();
    return (
      (!filter.search || data.includes(filter.search.toLowerCase())) &&
      (!filter.product || m?.product === filter.product) &&
      (!filter.capability || m?.capabilities?.includes(filter.capability)) &&
      (!filter.owner || (m?.owner ?? 'unknown') === filter.owner) &&
      (!filter.lifecycle || (m?.lifecycle ?? 'unknown') === filter.lifecycle) &&
      (!filter.role || (m?.role ?? 'unknown') === filter.role) &&
      (!filter.api ||
        [...apis, ...(m?.api ?? [])].some((v) =>
          v.toLowerCase().includes(filter.api!.toLowerCase()),
        ))
    );
  });
}
export function catalogReachability(
  index: CatalogIndex,
  target: WorkflowCatalogIdentity,
  options: {
    kinds?: CatalogRelationshipKind[];
    maxPaths?: number;
    maxDepth?: number;
    maxVisits?: number;
    stepId?: string;
  } = {},
) {
  const kinds = options.kinds ?? ['call'];
  const maxPaths = Math.min(options.maxPaths ?? 100, 100),
    maxDepth = Math.min(options.maxDepth ?? 32, 32);
  const maxVisits = Math.min(options.maxVisits ?? 10000, 10000);
  if ([maxPaths, maxDepth, maxVisits].some((n) => !Number.isSafeInteger(n) || n < 1))
    throw new Error('Invalid catalog reachability bounds');
  const paths: { entry: CatalogEntry; relationships: CatalogRelationship[] }[] = [];
  const cycles: string[][] = [];
  const found = new Map<string, CatalogEntry>();
  let bounded = false,
    visits = 0;
  const incoming = new Map<string, CatalogRelationship[]>();
  for (const relationship of index.relationships)
    if (relationship.to && kinds.includes(relationship.kind)) {
      const key = catalogKey(relationship.to),
        list = incoming.get(key) ?? [];
      list.push(relationship);
      incoming.set(key, list);
    }
  const visit = (
    identity: WorkflowCatalogIdentity,
    path: CatalogRelationship[],
    seen: string[],
    stepId?: string,
  ) => {
    if (visits >= maxVisits || paths.length >= maxPaths || path.length > maxDepth) {
      bounded = true;
      return;
    }
    visits++;
    const key = catalogKey(identity);
    if (seen.includes(key)) {
      cycles.push([...seen, key]);
      return;
    }
    const entry = index.byKey.get(key);
    if (entry?.metadata?.role === 'entry') {
      found.set(key, entry);
      paths.push({ entry, relationships: [...path].reverse() });
    }
    for (const relation of incoming.get(key) ?? []) {
      if (stepId && relation.targetStepId && relation.targetStepId !== stepId) continue;
      if (visits >= maxVisits || paths.length >= maxPaths) {
        bounded = true;
        break;
      }
      visit(
        relation.from,
        [...path, relation],
        [...seen, key],
        relation.location.selection?.stepId,
      );
    }
  };
  visit(target, [], [], options.stepId);
  return { entries: [...found.values()], paths, cycles, bounded, visits };
}

export function catalogOperationPaths(
  index: CatalogIndex,
  operationKey: string,
  options: { maxPaths?: number; maxDepth?: number; maxVisits?: number } = {},
) {
  const maxPaths = Math.min(options.maxPaths ?? 100, 100);
  const maxDepth = Math.min(options.maxDepth ?? 32, 32);
  const maxVisits = Math.min(options.maxVisits ?? 10000, 10000);
  if ([maxPaths, maxDepth, maxVisits].some((value) => !Number.isSafeInteger(value) || value < 1))
    throw new Error('Invalid operation path bounds');
  const usages = index.apiUsages.filter(
    (use) => use.status === 'located' && use.operationKey === operationKey,
  );
  const paths: {
    key: string;
    usage: CatalogAPIUsage;
    entry: CatalogEntry;
    relationships: CatalogRelationship[];
    location?: WorkflowLocation;
  }[] = [];
  const cycles: string[][] = [];
  let visits = 0,
    bounded = false;
  for (const usage of usages) {
    if (paths.length >= maxPaths || visits >= maxVisits) {
      bounded = true;
      break;
    }
    const target = index.byKey.get(catalogKey(usage.from));
    if (!target) continue;
    const reach = catalogReachability(index, usage.from, {
      kinds: ['call', 'prerequisite', 'goto', 'retry', 'descriptive'],
      maxPaths: maxPaths - paths.length,
      maxVisits: maxVisits - visits,
      maxDepth,
      stepId: usage.stepId,
    });
    visits += reach.visits;
    bounded ||= reach.bounded;
    cycles.push(...reach.cycles);
    paths.push(
      ...reach.paths.map((path) => ({
        ...path,
        usage,
        key: JSON.stringify([
          operationKey,
          usage.id,
          path.relationships.map((relation) => relation.id),
        ]),
        location: catalogPathLocation(path, target, usage.stepId),
      })),
    );
  }
  return { usages, paths, cycles, visits, bounded, complete: index.complete && !bounded };
}

// occurrence addresses exist only for standard same-document calls; transfers are not nested calls.
export function catalogPathLocation(
  path: { entry: CatalogEntry; relationships: CatalogRelationship[] },
  target: CatalogEntry,
  stepId: string,
): WorkflowLocation | undefined {
  if (!target.workflow.steps.some((step) => step.stepId === stepId)) return undefined;
  if (path.entry.documentId !== target.documentId || path.entry.revision !== target.revision)
    return undefined;
  if (
    path.relationships.some(
      (r) =>
        r.kind !== 'call' ||
        !r.location.selection?.stepId ||
        r.from.documentId !== target.documentId ||
        r.from.revision !== target.revision ||
        r.to?.documentId !== target.documentId ||
        r.to.revision !== target.revision,
    )
  )
    return undefined;
  return {
    ...path.entry.location,
    selection: {
      kind: 'step',
      workflowId: target.workflowId,
      stepId,
      occurrence: path.relationships.map((r) => ({
        workflowId: r.from.workflowId,
        stepId: r.location.selection!.stepId,
      })),
    },
  };
}
