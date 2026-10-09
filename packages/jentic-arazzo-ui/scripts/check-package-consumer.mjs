import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import {
  consumerBuild,
  installedConsumer,
  minimalSource,
  optionalSource,
  outputRoot,
  repoRoot,
  run,
  uiRoot,
} from './package-consumer-lib.mjs';

if (!process.argv.includes('--built')) {
  // only the emitted ESM/declarations of the local runtime dependencies are required by the packed UI.
  for (const dependency of ['@jentic/arazzo-parser', '@jentic/arazzo-resolver']) {
    run('npm', ['run', 'build:es', '-w', dependency]);
    run('npm', ['run', 'typescript:declaration', '-w', dependency]);
  }
  run('npm', ['run', 'build'], uiRoot);
}
run(process.execPath, [join(uiRoot, 'scripts/check-public-declarations.mjs')]);
const installed = await installedConsumer(outputRoot);
assert.equal(
  await realpath(installed.installed),
  installed.installed,
  'installed UI must not be a workspace symlink',
);
const require = createRequire(join(outputRoot, 'package.json'));
const exports = installed.installedManifest.exports;
assert.ok(
  exports['./catalog'].types && exports['./catalog'].import && !exports['./catalog'].require,
);
assert.throws(() => require.resolve('@jentic/arazzo-ui/catalog'), {
  code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});
assert.ok(require.resolve('@jentic/arazzo-ui').endsWith('/dist/arazzo-ui.js'));
assert.ok(
  require.resolve('@jentic/arazzo-ui/standalone').endsWith('/dist/arazzo-ui-standalone.js'),
);
assert.ok((await readFile(require.resolve('@jentic/arazzo-ui/styles.css'))).length > 0);
run(process.execPath, [join(uiRoot, 'scripts/check-public-declarations.mjs'), outputRoot]);
const minimal = await consumerBuild(outputRoot, 'minimal', minimalSource, {
  assertMinimal: !process.argv.includes('--inspect-retention'),
});
const standalone = await consumerBuild(
  outputRoot,
  'standalone',
  minimalSource.replace(
    "{ ArazzoUI } from '@jentic/arazzo-ui'",
    "{ ArazzoUIStandalone as ArazzoUI } from '@jentic/arazzo-ui/standalone'",
  ),
);
const optional = await consumerBuild(outputRoot, 'optional', optionalSource);
for (const symbol of [
  'ArazzoCatalog',
  'ArazzoWorkflowReview',
  'compareWorkflowRevisions',
  'loadCatalog',
])
  assert.ok(
    optional.chunks.some((chunk) => !chunk.initial && chunk.retained.includes(symbol)),
    `${symbol} must survive in the deferred optional consumer`,
  );
assert.ok(
  !minimal.chunks.some(
    (chunk) =>
      chunk.initial &&
      chunk.retained.some((symbol) => ['projectOpenAPI', 'projectAsyncAPI'].includes(symbol)),
  ),
  'format adapters must remain deferred in the minimal viewer',
);
let acceptanceSource = minimalSource;
try {
  acceptanceSource = await readFile(join(uiRoot, 'test/package/acceptance-app.tsx'), 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const app = await consumerBuild(outputRoot, 'app', acceptanceSource);
const browserDirectory = join(outputRoot, 'umd');
await mkdir(browserDirectory, { recursive: true });
const document = {
  arazzo: '1.0.1',
  info: { title: 'Packed UMD consumer', version: '1' },
  sourceDescriptions: [],
  workflows: [{ workflowId: 'flow', steps: [{ stepId: 'read', operationId: 'read' }] }],
};
const browser = await chromium.launch({ headless: true });
try {
  for (const [surface, globalName] of [
    ['arazzo-ui', 'ArazzoUI'],
    ['arazzo-ui-standalone', 'ArazzoUIStandalone'],
  ]) {
    await copyFile(
      join(installed.installed, `dist/${surface}.js`),
      join(browserDirectory, `${surface}.js`),
    );
    await copyFile(
      require.resolve('@jentic/arazzo-ui/styles.css'),
      join(browserDirectory, 'styles.css'),
    );
    await writeFile(
      join(browserDirectory, `${surface}.html`),
      `<!doctype html><meta charset="UTF-8"><link rel="stylesheet" href="styles.css"><div id="root"></div><script src="${surface}.js"></script><script>window.viewer = ${globalName}({dom_id:'#root',document:${JSON.stringify(document)},view:'docs'});</script>`,
    );
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`file://${join(browserDirectory, `${surface}.html`)}`);
    await page.getByText('Packed UMD consumer', { exact: true }).first().waitFor();
    assert.deepEqual(errors, [], `${surface} browser errors`);
    await page.close();
    console.log(`PASS installed ${surface} browser UMD + CSS`);
  }
} finally {
  await browser.close();
}
const metadata = {
  version: 1,
  head: run('git', ['rev-parse', 'HEAD'], repoRoot, true),
  builtAt: new Date().toISOString(),
  ...installed,
  app,
  minimal,
  standalone,
  optional,
};
await writeFile(join(outputRoot, 'metadata.json'), JSON.stringify(metadata, null, 2));
console.log(`PASS packed package acceptance: ${join(outputRoot, 'metadata.json')}`);

// validate advertised ranges separately from the pinned measurement graph.
for (const args of [[], ['--yaml-input']]) {
  run(process.execPath, [join(uiRoot, 'scripts/check-unpinned-consumer.mjs'), ...args]);
}
