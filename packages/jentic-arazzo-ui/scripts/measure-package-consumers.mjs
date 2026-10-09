import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  consumerBuild,
  minimalSource,
  optionalSource,
  outputRoot,
  pack,
  repoRoot,
  run,
  uiRoot,
  sha256,
} from './package-consumer-lib.mjs';

const baseline = '49dd8ef814637b481c0a1998f586ce2785812f5d';
// current acceptance must already have produced a physically installed package with the exact dependencies.
const metadata = JSON.parse(await readFile(join(outputRoot, 'metadata.json'), 'utf8'));
const directory = await mkdtemp(join(tmpdir(), 'arazzo-pinned-upstream-'));
const checkout = join(directory, 'checkout');
const results = {};
const dependencyGraph = async () => {
  const lock = JSON.parse(await readFile(join(outputRoot, 'package-lock.json'), 'utf8'));
  return Object.fromEntries(
    Object.entries(lock.packages).filter(
      ([name]) => name && name !== 'node_modules/@jentic/arazzo-ui',
    ),
  );
};
const expectedDependencies = await dependencyGraph();
const standaloneSource = minimalSource.replace(
  "{ ArazzoUI } from '@jentic/arazzo-ui'",
  "{ ArazzoUIStandalone as ArazzoUI } from '@jentic/arazzo-ui/standalone'",
);
try {
  run('git', ['worktree', 'add', '--detach', checkout, baseline]);
  // build both sources with the very same locally installed Vite/React/dependency graph.
  run('ln', ['-s', join(repoRoot, 'node_modules'), join(checkout, 'node_modules')]);
  const baselineUI = join(checkout, 'packages/jentic-arazzo-ui');
  const currentManifest = JSON.parse(await readFile(join(uiRoot, 'package.json'), 'utf8'));
  const baselineManifest = JSON.parse(await readFile(join(baselineUI, 'package.json'), 'utf8'));
  baselineManifest.dependencies = currentManifest.dependencies;
  baselineManifest.peerDependencies = currentManifest.peerDependencies;
  await writeFile(join(baselineUI, 'package.json'), JSON.stringify(baselineManifest, null, 2));
  // run the same build config/settings from the current package against the baseline entry.
  const config = await readFile(join(uiRoot, 'config/vite/vite.config.ts'), 'utf8');
  await writeFile(join(baselineUI, 'config/vite/vite.config.ts'), config);
  for (const script of [
    'build:esm:ui',
    'build:umd:ui',
    'build:esm:standalone',
    'build:umd:standalone',
  ])
    run('npm', ['run', script], baselineUI);
  const baselinePack = await pack(baselineUI, join(outputRoot, 'baseline-packs'));
  results.baseline = {
    commit: baseline,
    pack: baselinePack,
    wholeFiles: await wholeFiles(baselineUI),
  };
  // replace only the installed UI package bytes; both measurements keep the same node_modules/lock file.
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', baselinePack.path],
    outputRoot,
  );
  assert.deepEqual(
    await dependencyGraph(),
    expectedDependencies,
    'baseline measurement must use identical installed dependencies',
  );
  results.baseline.minimal = await consumerBuild(outputRoot, 'baseline-minimal', minimalSource);
  results.baseline.standalone = await consumerBuild(
    outputRoot,
    'baseline-standalone',
    standaloneSource,
  );
  // baseline has no catalog/review. Its optional consumer exercises the existing deferred standalone entry.
  const baselineOptional = optionalSource
    .replace(
      "const {ArazzoCatalog, ArazzoWorkflowReview, compareWorkflowRevisions} = await import('@jentic/arazzo-ui/catalog'); window.optional = {ArazzoCatalog,ArazzoWorkflowReview,compareWorkflowRevisions}; return ArazzoCatalog;",
      "const {ArazzoUIStandalone} = await import('@jentic/arazzo-ui/standalone'); window.optional = {ArazzoUIStandalone}; return ArazzoUIStandalone;",
    )
    .replace(
      "{manifest:{version:1,id:'consumer',revision:'r1',documents:[]}}",
      "{document:{arazzo:'1.0.1',info:{title:'Consumer',version:'1'},sourceDescriptions:[],workflows:[]}}",
    );
  results.baseline.optional = await consumerBuild(
    outputRoot,
    'baseline-optional',
    baselineOptional,
  );
  // restore exactly the accepted repaired tarball before measuring it and before browser use.
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', metadata.packs.at(-1).path],
    outputRoot,
  );
  assert.deepEqual(
    await dependencyGraph(),
    expectedDependencies,
    'repaired measurement must use identical installed dependencies',
  );
  results.repaired = {
    head: metadata.head,
    pack: metadata.packs.at(-1),
    wholeFiles: await wholeFiles(uiRoot),
  };
  results.repaired.minimal = await consumerBuild(outputRoot, 'repaired-minimal', minimalSource, {
    assertMinimal: true,
  });
  results.repaired.standalone = await consumerBuild(
    outputRoot,
    'repaired-standalone',
    standaloneSource,
  );
  results.repaired.baselineCompatibleOptional = await consumerBuild(
    outputRoot,
    'repaired-standalone-optional',
    baselineOptional,
  );
  results.repaired.optional = await consumerBuild(outputRoot, 'repaired-optional', optionalSource);
  results.toolchain = {
    node: process.version,
    versions: metadata.versions,
    installedDependencyGraphSHA256: sha256(JSON.stringify(expectedDependencies)),
  };
  results.notes = [
    'Initial/deferred numbers are sums of individually gzipped emitted JS chunks, not whole library files.',
    'CSS is reported separately. Deferred chunks are available on demand; they are not all downloaded by ordinary viewing.',
    'Minimal viewer, direct standalone, and deferred standalone workloads are identical across revisions. Baseline has no catalog/review APIs; repaired catalog/review optional is an additional workload rather than a like-for-like comparison.',
    'Both consumers use the same physically installed dependency graph and build config/minification/React versions. Baseline package dependency declarations are aligned to current solely for this controlled measurement.',
  ];
  await writeFile(join(outputRoot, 'bundle-comparison.json'), JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(results)
          .filter(([name]) => ['baseline', 'repaired'].includes(name))
          .map(([name, result]) => [
            name,
            {
              wholeFiles: result.wholeFiles,
              minimal: {
                initial: result.minimal.initialGzipBytes,
                deferred: result.minimal.deferredGzipBytes,
              },
              standalone: {
                initial: result.standalone.initialGzipBytes,
                deferred: result.standalone.deferredGzipBytes,
              },
              optional: {
                initial: result.optional.initialGzipBytes,
                deferred: result.optional.deferredGzipBytes,
              },
            },
          ]),
      ),
      null,
      2,
    ),
  );
} finally {
  // reinstall current even if a measurement failed; preserve the original branch and checkout.
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', metadata.packs.at(-1).path],
    outputRoot,
  );
  run('git', ['worktree', 'remove', '--force', checkout]);
  await rm(directory, { recursive: true, force: true });
}
async function wholeFiles(root) {
  return Object.fromEntries(
    await Promise.all(
      ['arazzo-ui.mjs', 'arazzo-ui.js', 'arazzo-ui-standalone.mjs', 'arazzo-ui-standalone.js'].map(
        async (name) => {
          const bytes = await readFile(join(root, 'dist', name));
          return [name, { bytes: bytes.length, gzipBytes: gzipSync(bytes).length }];
        },
      ),
    ),
  );
}
