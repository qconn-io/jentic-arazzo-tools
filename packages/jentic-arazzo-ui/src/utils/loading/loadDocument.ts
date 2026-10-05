import { parseArazzo } from '@jentic/arazzo-parser';
import { dereferenceArazzoElement } from '@jentic/arazzo-resolver';
import { toValue } from '@speclynx/apidom-core';
import {
  cloneDeep,
  ObjectElement,
  isObjectElement,
  type Element,
  type ParseResultElement,
} from '@speclynx/apidom-datamodel';
import { traverse, type Path } from '@speclynx/apidom-traverse';

import type { ArazzoDocument } from '../../types/arazzo';
import { parseReusableReference, selectProfile } from '../inspection';
import type { DocumentSnapshot, InspectionDiagnostic } from '../inspection/types';
import { reusableOccurrenceFields } from '../inspection/reusable';

interface LoadOptions {
  baseURI?: string;
}
interface LoadedDocument {
  document: ArazzoDocument;
  snapshot: DocumentSnapshot;
  diagnostics: InspectionDiagnostic[];
}

function validateIdentities(document: ArazzoDocument): void {
  if (
    !Array.isArray(document.workflows) ||
    !Array.isArray(document.sourceDescriptions) ||
    !document.info ||
    typeof document.info !== 'object'
  ) {
    throw new Error('Parsing: unusable Arazzo document root');
  }
  const workflows = new Set<string>();
  for (const workflow of document.workflows) {
    if (
      typeof workflow.workflowId !== 'string' ||
      !workflow.workflowId ||
      workflows.has(workflow.workflowId)
    ) {
      throw new Error('Parsing: missing or duplicate workflow ID');
    }
    workflows.add(workflow.workflowId);
    if (!Array.isArray(workflow.steps)) throw new Error('Parsing: workflow steps must be an array');
    const steps = new Set<string>();
    for (const step of workflow.steps) {
      if (typeof step.stepId !== 'string' || !step.stepId || steps.has(step.stepId))
        throw new Error('Parsing: missing or duplicate scoped step ID');
      steps.add(step.stepId);
    }
  }
}

function hasCustomDialect(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasCustomDialect);
  const record = value as unknown as Record<string, unknown>;
  if (
    typeof record.$schema === 'string' &&
    !/^https?:\/\/json-schema.org\/draft\/(2020-12|2019-09)\/schema#?$/.test(record.$schema) &&
    !/^https?:\/\/json-schema.org\/draft-0[467]\/schema#?$/.test(record.$schema)
  )
    return true;
  return Object.entries(record).some(
    ([key, child]) =>
      !key.startsWith('x-') &&
      !['example', 'examples', 'default', 'const', 'enum'].includes(key) &&
      hasCustomDialect(child),
  );
}

function transformApi(root: ParseResultElement, visitor: object): ParseResultElement {
  const index = root.map((element) => element === root.api).indexOf(true);
  const transformed = traverse(root.api!, visitor);
  root.set(index, transformed);
  return root;
}

export async function loadDocument(
  input: ArazzoDocument | Record<string, unknown> | string,
  options: LoadOptions = {},
): Promise<LoadedDocument> {
  const parsed = await parseArazzo(
    typeof input === 'string'
      ? input
      : (structuredClone(input) as unknown as Record<string, unknown>),
  );
  if (!parsed.api || !isObjectElement(parsed.api))
    throw new Error('Parsing: unusable Arazzo document root');
  const authored = cloneDeep(parsed);
  const authoredDocument = toValue(authored.api) as ArazzoDocument;
  if (typeof authoredDocument.arazzo !== 'string')
    throw new Error('Parsing: missing specification version');
  const profile = selectProfile(authoredDocument.arazzo);
  if (profile) validateIdentities(authoredDocument);
  const retrievalURI = parsed.hasMetaProperty('retrievalURI')
    ? (toValue(parsed.meta.get('retrievalURI')!) as string)
    : undefined;
  const baseURI = retrievalURI || options.baseURI;
  const diagnostics: InspectionDiagnostic[] = [];
  const self = (authoredDocument as ArazzoDocument & { $self?: string }).$self;
  let restored = parsed;
  const occurrences = profile?.inventory(authoredDocument) ?? [];
  for (const occurrence of occurrences) {
    if (!parseReusableReference(occurrence.reference))
      throw new Error(`Resolution: malformed reusable reference ${occurrence.reference}`);
  }
  const unsupportedResolution =
    self !== undefined ||
    hasCustomDialect(authoredDocument.workflows?.map((w) => w.inputs)) ||
    hasCustomDialect(authoredDocument.components?.inputs) ||
    !baseURI;
  if (profile && !unsupportedResolution) {
    const missing = new Map<
      string,
      { original: Element; occurrence: (typeof occurrences)[number] }
    >();
    const missingPaths = new Map<string, string>();
    for (const occurrence of occurrences) {
      const match = parseReusableReference(occurrence.reference);
      if (!match)
        throw new Error(`Resolution: malformed reusable reference ${occurrence.reference}`);
      const bucket = authoredDocument.components?.[match.bucket];
      if (!bucket || !Object.prototype.hasOwnProperty.call(bucket, match.key))
        missingPaths.set(JSON.stringify(occurrence.path), crypto.randomUUID());
    }
    restored = transformApi(restored, {
      enter(path: Path<Element>) {
        const token = missingPaths.get(JSON.stringify(path.getPathKeys()));
        if (!token) return;
        const occurrence = occurrences.find(
          (o) => JSON.stringify(o.path) === JSON.stringify(path.getPathKeys()),
        )!;
        missing.set(token, { original: cloneDeep(path.node), occurrence });
        const placeholder = new ObjectElement();
        placeholder.meta.set('viewerRecoveryToken', token);
        path.replaceWith(placeholder);
        path.skip();
      },
    });
    restored = await dereferenceArazzoElement(restored, {
      parse: { parserOpts: { sourceDescriptions: false } },
      resolve: { baseURI },
      dereference: {
        circular: 'error',
        immutable: false,
        strategyOpts: { sourceDescriptions: false },
      },
    });
    restored = transformApi(restored, {
      enter(path: Path<Element>) {
        if (!path.node.hasMetaProperty('viewerRecoveryToken')) return;
        const token = toValue(path.node.meta.get('viewerRecoveryToken')!) as string;
        const entry = missing.get(token);
        if (!entry) return;
        path.replaceWith(cloneDeep(entry.original));
        path.skip();
      },
    });
    // native reusable expansion copies declaration fields; retain opaque use-site data too.
    const uses = new Map(
      occurrences.map((occurrence) => [JSON.stringify(occurrence.path), occurrence]),
    );
    restored = transformApi(restored, {
      enter(path: Path<Element>) {
        const occurrence = uses.get(JSON.stringify(path.getPathKeys()));
        if (!occurrence || !isObjectElement(path.node) || !path.node.hasMetaProperty('ref-fields'))
          return;
        const fields = toValue(path.node.meta.get('ref-fields')!) as { reference?: string };
        if (fields.reference !== occurrence.reference) return;
        let original: unknown = authoredDocument;
        for (const key of occurrence.path) {
          if (!original || typeof original !== 'object') return;
          original = (original as Record<string, unknown>)[key];
        }
        if (!original || typeof original !== 'object') return;
        for (const [key, value] of Object.entries(reusableOccurrenceFields(original))) {
          path.node.set(key, value);
        }
      },
    });
    for (const { occurrence } of missing.values()) {
      diagnostics.push({
        phase: 'resolution',
        category: 'missing-reference',
        severity: 'warning',
        message: `Missing reusable ${occurrence.reference}`,
        ...occurrence.owner,
        path: occurrence.path,
        code: 'missing-reusable',
        declarationPath: occurrence.declarationPath,
      });
    }
  } else if (profile) {
    diagnostics.push({
      phase: 'resolution',
      category: 'unsupported-resolution',
      severity: 'warning',
      message:
        'Reference expansion bypassed: unavailable base URI or unsupported $self/schema dialect semantics. Authored references are preserved.',
      path: [],
      code: 'expansion-bypassed',
    });
  }
  const document = toValue(restored.api) as ArazzoDocument;
  const snapshot: DocumentSnapshot = {
    id: crypto.randomUUID(),
    authored,
    restored,
    authoredDocument: authoredDocument as DocumentSnapshot['authoredDocument'],
    document: document as DocumentSnapshot['document'],
    exactVersion: authoredDocument.arazzo,
    retrievalURI,
    baseURI,
    self,
    diagnostics,
  };
  return { document, snapshot, diagnostics };
}
