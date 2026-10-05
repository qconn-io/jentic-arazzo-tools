import type {
  WorkflowLocation,
  WorkflowLocationAdapter,
  WorkflowLocationDecodeResult,
  WorkflowLocationJSON,
} from '../../types/location';
const LIMIT = 16 * 1024;
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string' && v.length > 0;
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).every((k) => allowed.includes(k));
const site = (v: unknown) =>
  object(v) && keys(v, ['workflowId', 'stepId']) && text(v.workflowId) && text(v.stepId);
function json(v: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every((x) => json(x, depth + 1));
  return (
    object(v) &&
    Object.getPrototypeOf(v) === Object.prototype &&
    Object.entries(v).every(
      ([key, value]) =>
        !['__proto__', 'constructor', 'prototype'].includes(key) && json(value, depth + 1),
    )
  );
}
function valid(v: unknown): v is WorkflowLocation {
  if (
    !object(v) ||
    !keys(v, [
      'version',
      'document',
      'revision',
      'digest',
      'root',
      'view',
      'subview',
      'selection',
      'extensions',
    ])
  )
    return false;
  if (
    v.version !== 1 ||
    !text(v.document) ||
    !(v.root === null || text(v.root)) ||
    !['docs', 'diagram', 'split'].includes(String(v.view)) ||
    !['docs', 'sequence', 'flowchart'].includes(String(v.subview)) ||
    (v.revision !== undefined && !text(v.revision)) ||
    (v.digest !== undefined &&
      (typeof v.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(v.digest)))
  )
    return false;
  if (v.selection !== undefined) {
    const s = v.selection;
    if (
      v.root === null ||
      !object(s) ||
      !keys(s, ['kind', 'workflowId', 'stepId', 'occurrence', 'action']) ||
      !text(s.workflowId) ||
      !text(s.stepId)
    )
      return false;
    if (
      s.occurrence !== undefined &&
      (!Array.isArray(s.occurrence) || s.occurrence.length > 32 || !s.occurrence.every(site))
    )
      return false;
    if (s.kind === 'action') {
      const a = s.action;
      if (
        !object(a) ||
        !keys(a, ['document', 'pointer', 'usePointer', 'channel', 'index', 'name']) ||
        !text(a.document) ||
        typeof a.usePointer !== 'string' ||
        !/^\/(?:[^~]|~[01])*$/.test(a.usePointer) ||
        typeof a.pointer !== 'string' ||
        !/^\/(?:[^~]|~[01])*$/.test(a.pointer) ||
        !['onSuccess', 'onFailure'].includes(String(a.channel)) ||
        typeof a.index !== 'number' ||
        !Number.isSafeInteger(a.index) ||
        a.index < 0 ||
        (a.name !== undefined && !text(a.name))
      )
        return false;
    } else if (s.kind !== 'step' || s.action !== undefined) return false;
  }
  return (
    v.extensions === undefined ||
    (object(v.extensions) &&
      Object.entries(v.extensions).every(
        ([namespace, value]) =>
          /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(namespace) && json(value),
      ))
  );
}
/** Validate and encode one bounded location query value. @public */
export function encodeLocation(location: WorkflowLocation): string {
  if (!valid(location))
    throw new Error('Invalid workflow location (version, fields or address limits).');
  const encoded = JSON.stringify(canonical(location));
  if (new TextEncoder().encode(encoded).length > LIMIT)
    throw new Error('Workflow location exceeds the 16 KiB limit.');
  return encoded;
}
/** Decode untrusted query data, returning a visible error instead of throwing. @public */
export function decodeLocation(encoded: string): WorkflowLocationDecodeResult {
  if (new TextEncoder().encode(encoded).length > LIMIT)
    return { error: 'Workflow location exceeds the 16 KiB limit.' };
  try {
    const location: unknown = JSON.parse(encoded);
    if (!valid(location))
      return { error: 'Invalid workflow location: unsupported version, fields or address limits.' };
    return { location };
  } catch {
    return { error: 'Invalid workflow location encoding.' };
  }
}
/** Read location independently of existing document query/hash inputs. @public */
export function readLocationURL(url: URL): WorkflowLocationDecodeResult {
  const encoded =
    url.searchParams.get('location') ?? new URLSearchParams(url.hash.slice(1)).get('location');
  return encoded === null ? {} : decodeLocation(encoded);
}
/** Preserve unrelated fields; newly shared URLs omit inline document content. @public */
export function writeLocationURL(source: string | URL, location: WorkflowLocation): URL {
  const url = new URL(source);
  url.searchParams.set('document', location.document);
  url.searchParams.set('location', encodeLocation(location));
  const hash = new URLSearchParams(url.hash.slice(1));
  if (hash.has('document') || hash.has('location')) {
    hash.delete('document');
    hash.delete('location');
    url.hash = hash.toString();
  }
  return url;
}
/** Canonical authored JSON digest. This detects changes; it does not pin remote bytes. @public */
export async function authoredDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
/** Register typed optional state at the host boundary without exposing private models. @public */
export function createLocationAdapter<T extends WorkflowLocationJSON>(
  namespace: string,
  validate: (value: unknown) => value is T,
  restore: (value: T) => void,
): WorkflowLocationAdapter {
  if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(namespace))
    throw new Error('Invalid location namespace.');
  return {
    namespace,
    restore(value) {
      if (!validate(value)) return false;
      restore(value);
      return true;
    },
  };
}
