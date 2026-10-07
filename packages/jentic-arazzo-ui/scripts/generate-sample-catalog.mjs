import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import * as yaml from '@speclynx/apidom-parser-adapter-yaml-1-2';

// supplied editorial roles, not roles inferred by the viewer.
const samples = [
  ['purchase', 'digital-product/arazzo.yaml', ['client-journey', 'fulfil-purchase']],
  [
    'http-commerce',
    'digital-product-stress/arazzo.yaml',
    ['full-stress-journey', 'batch-fulfilment', 'resume-existing-purchase'],
  ],
  [
    'event-commerce',
    'digital-product-stress/event-based.arazzo.yaml',
    ['event-driven-purchase', 'purchase-event-worker', 'activation-audit-worker'],
  ],
  ...['depth-limit', 'metadata-heavy', 'recursion', 'row-limit'].map((v) => [
    v,
    `digital-product-stress/boundaries/${v}.arazzo.yaml`,
    [],
  ]),
  ...['prerequisite-cycle', 'unavailable-targets'].map((v) => [
    v,
    `digital-product-stress/diagnostics/${v}.arazzo.yaml`,
    [],
  ]),
];
const root = resolve('public/examples');
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
const parse = async (path) => (await yaml.parse(await readFile(path, 'utf8'))).result.toValue();
const digest = (v) =>
  `sha256:${createHash('sha256')
    .update(JSON.stringify(canonical(v)))
    .digest('hex')}`;
const documents = [],
  sourceFiles = new Map();
for (const [id, uri, entries] of samples) {
  const path = resolve(root, uri),
    parsed = await parse(path);
  const diagnostic = uri.includes('/boundaries/') || uri.includes('/diagnostics/');
  documents.push({
    id,
    revision: 'sample-2026-10-07',
    uri: `./${uri}`,
    kind: 'arazzo',
    expectedDigest: digest(parsed),
    workflows: parsed.workflows.map((w) => ({
      workflowId: w.workflowId,
      role: diagnostic ? 'diagnostic' : entries.includes(w.workflowId) ? 'entry' : 'helper',
      product: 'digital-product',
      capabilities: [
        diagnostic
          ? 'inspection-diagnostics'
          : id === 'event-commerce'
            ? 'event-purchase'
            : 'purchase',
      ],
      lifecycle: diagnostic ? 'intentional-diagnostic' : 'reference-example',
      tags: diagnostic
        ? ['intentional-diagnostic', 'inspection-only']
        : ['reference-example', 'inspection-only'],
      systems: ['Coordinator'],
      ...(diagnostic
        ? {
            description:
              'Intentional inspection/boundary example; authored warnings and limits are part of its purpose.',
          }
        : {}),
    })),
  });
  for (const source of parsed.sourceDescriptions)
    if (source.type === 'openapi' || source.type === 'asyncapi')
      sourceFiles.set(resolve(dirname(path), source.url), source.type);
}
for (const [path, kind] of sourceFiles) {
  const uri = relative(root, path);
  documents.push({
    id: `contract:${uri}`,
    revision: 'sample-2026-10-07',
    uri: `./${uri}`,
    kind,
    expectedDigest: digest(await parse(path)),
  });
}
const manifest = {
  version: 1,
  id: 'digital-product-reference',
  revision: 'sample-2026-10-07',
  products: [{ id: 'digital-product', name: 'Digital product reference examples' }],
  capabilities: [
    { id: 'purchase', name: 'Purchase' },
    { id: 'event-purchase', name: 'Event purchase' },
    { id: 'inspection-diagnostics', name: 'Inspection diagnostics and boundaries' },
  ],
  owners: [],
  documents,
};
await writeFile(resolve(root, 'catalog.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Wrote ${samples.length} Arazzo revisions and ${sourceFiles.size} contract revisions; organizational ownership remains unknown.`,
);
