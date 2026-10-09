import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const output = resolve(root, 'test-output/browser');
export async function fixtureHash() {
  return createHash('sha256')
    .update(await readFile(resolve(output, 'readiness.json')))
    .digest('hex');
}
export async function hashes(directory, authoredOnly = false) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) Object.assign(result, await hashes(path, authoredOnly));
    else if (!authoredOnly || !/\.(?:mjs|cjs|map)$/.test(entry.name))
      result[relative(root, path)] = createHash('sha256')
        .update(await readFile(path))
        .digest('hex');
  }
  return result;
}
export async function currentIdentity() {
  const source = await hashes(resolve(root, 'src'));
  const fixtures = await hashes(resolve(root, 'public/examples'));
  const tests = await hashes(resolve(root, 'test/fixtures'));
  const app = await hashes(resolve(root, 'test/package'));
  const buildInputs = {};
  for (const path of [
    '../../package.json',
    '../../package-lock.json',
    '../../babel.config.cjs',
    '../../tsconfig.json',
    'package.json',
    'tsconfig.json',
    'tsconfig.declaration.json',
    'playwright.production.config.ts',
    'test/e2e/production.spec.ts',
    '../jentic-arazzo-parser/package.json',
    '../jentic-arazzo-resolver/package.json',
  ])
    buildInputs[path] = createHash('sha256')
      .update(await readFile(resolve(root, path)))
      .digest('hex');
  const configuration = await hashes(resolve(root, 'config'));
  const scripts = await hashes(resolve(root, 'scripts'));
  const parser = await hashes(resolve(root, '../jentic-arazzo-parser/src'), true);
  const resolver = await hashes(resolve(root, '../jentic-arazzo-resolver/src'), true);
  return {
    source,
    fixtures,
    tests,
    app,
    buildInputs,
    configuration,
    scripts,
    parser,
    resolver,
    node: process.version,
  };
}
export async function verifyIdentity() {
  const identity = JSON.parse(await readFile(resolve(output, 'identity.json'), 'utf8'));
  if (JSON.stringify(identity.inputs) !== JSON.stringify(await currentIdentity()))
    throw new Error(
      'Production browser inputs changed after the sequential build; rerun test:browser',
    );
  const artifacts = {
    ...(await hashes(resolve(root, 'build'))),
    ...(await hashes(resolve(root, 'test-output/package-consumer/app'))),
  };
  if (JSON.stringify(identity.artifacts) !== JSON.stringify(artifacts))
    throw new Error('Production browser artifacts changed after the sequential build');
  if (identity.fixtureSha256 !== (await fixtureHash()))
    throw new Error('Generated production fixture changed after the sequential build');
  return identity;
}
