import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import type { JSONSchema } from '../src/types/arazzo';
import { loadDocument } from '../src/utils/loading/loadDocument';

const custom = 'https://example.test/custom-schema';
const reference = { $ref: '#/components/inputs/P' };
function documentWith(schema: Record<string, unknown>, name = 'payload') {
  const inputs: JSONSchema = { $ref: `#/components/inputs/${name}` };
  return {
    arazzo: '1.1.0',
    info: { title: 'dialect capability', version: '1' },
    sourceDescriptions: [],
    components: { inputs: { [name]: schema, P: { type: 'string' } } },
    workflows: [
      {
        workflowId: 'a',
        inputs,
        steps: [{ stepId: 's', operationId: 'op' }],
      },
    ],
  };
}
const options = { baseURI: 'https://example.test/arazzo.json' };

test.each(['payload', 'x-payload', 'default', 'example', 'enum', 'const'])(
  'custom dialect gating does not depend on component name %s',
  async (name) => {
    const authored = documentWith(
      { $schema: custom, type: 'object', properties: { p: reference } },
      name,
    );
    const before = structuredClone(authored);
    const loaded = await loadDocument(authored, options);
    expect(loaded.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'expansion-bypassed' }),
    );
    expect(loaded.document).toEqual(before);
    expect(authored).toEqual(before);
  },
);

test.each(['properties', '$defs', 'definitions', 'patternProperties', 'dependentSchemas'])(
  'named schemas under %s are traversed independently of their names',
  async (keyword) => {
    for (const name of ['x-payload', 'default', 'examples', 'const', 'enum']) {
      const authored = documentWith({
        type: 'object',
        [keyword]: { [name]: { $schema: custom, ...reference } },
      });
      const loaded = await loadDocument(authored, options);
      expect(loaded.diagnostics, `${keyword}.${name}`).toContainEqual(
        expect.objectContaining({ code: 'expansion-bypassed' }),
      );
      expect(loaded.document).toEqual(authored);
    }
  },
);

test.each(['x-payload', 'default', 'example', 'examples', 'const', 'enum', 'unknownKeyword'])(
  'literal and opaque schema payloads under %s do not select a dialect',
  async (keyword) => {
    const literal = { $schema: custom, properties: { p: reference } };
    const authored = documentWith({
      type: 'object',
      properties: { p: reference },
      [keyword]: ['examples', 'enum'].includes(keyword) ? [literal] : literal,
    });
    const loaded = await loadDocument(authored, options);
    expect(loaded.diagnostics.some((item) => item.code === 'expansion-bypassed')).toBe(false);
    expect(loaded.document.workflows[0].inputs).toMatchObject({
      properties: { p: { type: 'string' } },
    });
    expect(loaded.document.components?.inputs?.payload?.[keyword]).toEqual(
      authored.components.inputs.payload[keyword],
    );
  },
);

test.each([
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
  'allOf',
  'anyOf',
  'oneOf',
  'prefixItems',
  'items',
  'tupleItems',
  'dependencies',
])('custom dialect in schema keyword %s preserves inline workflow inputs', async (keyword) => {
  const child = { $schema: custom, ...reference };
  const value = ['allOf', 'anyOf', 'oneOf', 'prefixItems', 'tupleItems'].includes(keyword)
    ? [child]
    : keyword === 'dependencies'
      ? { default: child, x: ['a', 'b'] }
      : child;
  const authored = documentWith({
    type: 'object',
    [keyword === 'tupleItems' ? 'items' : keyword]: value,
  });
  authored.workflows[0].inputs = authored.components.inputs.payload;
  const loaded = await loadDocument(authored, options);
  expect(loaded.diagnostics).toContainEqual(
    expect.objectContaining({ code: 'expansion-bypassed' }),
  );
  expect(loaded.document).toEqual(authored);
});

test('recognized dialects and boolean subschemas permit ordinary reference expansion', async () => {
  const authored = documentWith({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: { p: reference },
    additionalProperties: false,
    allOf: [true],
    dependencies: { p: ['other'] },
  });
  const loaded = await loadDocument(authored, options);
  expect(loaded.diagnostics).toEqual([]);
  expect(loaded.document.workflows[0].inputs).toMatchObject({
    properties: { p: { type: 'string' } },
  });
});

test('repository hygiene excludes tracked test-results and uppercase added line comments', () => {
  const repoRoot = resolve(import.meta.dirname, '../../..');
  const trackedTestResults = execFileSync(
    'git',
    ['ls-files', 'packages/jentic-arazzo-ui/test-results'],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
  expect(trackedTestResults).toBe('');

  const diff = execFileSync(
    'git',
    ['diff', 'main', '--', 'packages/jentic-arazzo-ui/src', 'packages/jentic-arazzo-ui/test'],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
  );
  const uppercaseComments = diff
    .split('\n')
    .filter((line) => !line.startsWith('+++') && /^\+.*(^|[^:])\/\/\s*[A-Z]/.test(line));
  expect(uppercaseComments).toEqual([]);

  const commits = execFileSync(
    'git',
    ['log', 'main..HEAD', '--format=%H%x09%s%x09%(trailers:key=Signed-off-by,valueonly)'],
    { cwd: repoRoot, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean);
  for (const line of commits) {
    const [sha, subject = '', signedOffBy = ''] = line.split('\t');
    expect(subject.length, `${sha}: ${subject}`).toBeLessThanOrEqual(69);
    expect(signedOffBy.trim(), `${sha}: missing Signed-off-by`).not.toBe('');
  }
});
