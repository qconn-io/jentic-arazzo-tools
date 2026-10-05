import { expect, test } from 'vitest';
import { webcrypto } from 'node:crypto';
import * as codec from '../src/utils/location/codec';
import type { WorkflowLocation } from '../src/types/location';
const location: WorkflowLocation = {
  version: 1,
  document: 'https://example.test/a?x=1&y=two#part',
  root: 'batch/特別',
  view: 'split',
  subview: 'sequence',
  selection: {
    kind: 'step',
    workflowId: 'payment',
    stepId: 'capture?#',
    occurrence: [{ workflowId: 'batch/特別', stepId: 'second-item' }],
  },
  extensions: { 'example.guide': { stage: 2 } },
};
test('the codec round trips authored addresses and unknown extensions while preserving unrelated URL fields', () => {
  expect(codec.encodeLocation).toBeTypeOf('function');
  const url = codec.writeLocationURL('https://viewer.test/path?theme=dark#section=notes', location);
  expect(url.searchParams.get('theme')).toBe('dark');
  expect(url.hash).toBe('#section=notes');
  expect(url.searchParams.get('document')).toBe(location.document);
  expect(codec.readLocationURL(url).location).toEqual(location);
  expect(
    codec.decodeLocation(codec.encodeLocation({ ...location, root: null, selection: undefined }))
      .location?.root,
  ).toBeNull();
});
test('malformed versions, fields, extension values and bounded sizes are rejected', () => {
  expect(codec.decodeLocation).toBeTypeOf('function');
  for (const value of [
    { ...location, version: 2 },
    { ...location, root: null },
    { ...location, credential: 'secret' },
    {
      ...location,
      selection: {
        ...location.selection,
        occurrence: Array(33).fill({ workflowId: 'a', stepId: 'b' }),
      },
    },
    { ...location, extensions: { bad: {} } },
    { ...location, document: 'x'.repeat(17000) },
    { ...location, extensions: { 'example.guide': { expression: () => 1 } } },
  ])
    expect(() => codec.encodeLocation(value as WorkflowLocation)).toThrow();
  expect(codec.decodeLocation('%broken').error).toContain('Invalid');
  expect(codec.decodeLocation('x'.repeat(17000)).error).toContain('limit');
});
test('canonical authored digest ignores key order and changes with authored values', async () => {
  expect(codec.authoredDigest).toBeTypeOf('function');
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  expect(await codec.authoredDigest({ b: 2, a: { x: false } })).toBe(
    await codec.authoredDigest({ a: { x: false }, b: 2 }),
  );
  expect(await codec.authoredDigest({ a: 1 })).not.toBe(await codec.authoredDigest({ a: 2 }));
});
test('typed extension adapters validate before restoring optional state', () => {
  expect(codec.createLocationAdapter).toBeTypeOf('function');
  let restored = 0;
  const adapter = codec.createLocationAdapter(
    'example.guide',
    (value: unknown): value is { stage: number } =>
      !!value && typeof value === 'object' && 'stage' in value && typeof value.stage === 'number',
    (value) => {
      restored = value.stage;
    },
  );
  expect(adapter.restore({ stage: 4 })).toBe(true);
  expect(restored).toBe(4);
  expect(adapter.restore({ stage: 'bad' })).toBe(false);
});
