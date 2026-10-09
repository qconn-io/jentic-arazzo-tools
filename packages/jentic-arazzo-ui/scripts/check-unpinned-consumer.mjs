import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { chromium } from '@playwright/test';
import ts from 'typescript';
import { consumerBuild, outputRoot, run, sha256, uiRoot } from './package-consumer-lib.mjs';

// use accepted tarballs; never rebuild or modify the controlled consumer.
const alignYaml = process.argv.includes('--align-yaml');
const yamlInput = process.argv.includes('--yaml-input');
const directory = join(
  uiRoot,
  `test-output/package-consumer-unpinned${alignYaml ? '-aligned-yaml' : ''}${yamlInput ? '-yaml-input' : ''}`,
);
await mkdir(directory, { recursive: true });
const metadata = JSON.parse(await readFile(join(outputRoot, 'metadata.json'), 'utf8'));
const dependencies = { ...metadata.versions };
const packs = [];
for (const pack of metadata.packs) {
  const filename = basename(pack.path);
  const copied = join(directory, filename);
  await copyFile(pack.path, copied);
  const name = filename.includes('parser')
    ? '@jentic/arazzo-parser'
    : filename.includes('resolver')
      ? '@jentic/arazzo-resolver'
      : '@jentic/arazzo-ui';
  dependencies[name] = `file:./${filename}`;
  packs.push({ name, path: copied, sha256: sha256(await readFile(copied)) });
}
await writeFile(
  join(directory, 'package.json'),
  JSON.stringify(
    {
      private: true,
      type: 'module',
      dependencies,
      ...(alignYaml ? { overrides: { '@speclynx/apidom-parser-adapter-yaml-1-2': '5.2.6' } } : {}),
    },
    null,
    2,
  ),
);
// fresh resolution matters: incremental installation can hoist the exact YAML model
// differently and conceal the failure of the advertised dependency ranges.
await rm(join(directory, 'node_modules'), { recursive: true, force: true });
await rm(join(directory, 'package-lock.json'), { force: true });
run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], directory);
const fixtureCode = ts.transpileModule(
  await readFile(join(uiRoot, 'test/fixtures/upstream-readiness.ts'), 'utf8'),
  {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  },
).outputText;
const fixtures = await import(
  `data:text/javascript;base64,${Buffer.from(fixtureCode).toString('base64')}`
);
const manifest = fixtures.consumerCatalog();
if (yamlInput)
  manifest.documents[0].content = `---\n${JSON.stringify(manifest.documents[0].content, null, 2)}`;
await consumerBuild(
  directory,
  'probe-app',
  `import React from 'react'; import {createRoot} from 'react-dom/client'; import {ArazzoCatalog} from '@jentic/arazzo-ui/catalog'; import '@jentic/arazzo-ui/styles.css'; window.coverage=[]; createRoot(document.getElementById('root')).render(React.createElement(ArazzoCatalog,{manifest:${JSON.stringify(manifest)},onCoverageChange:coverage=>{window.coverage=coverage;}}));`,
);
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file = join(directory, 'probe-app', path.slice(1) || 'index.html');
    response.writeHead(200, {
      'Content-Type': `${extname(file) === '.js' ? 'text/javascript' : extname(file) === '.css' ? 'text/css' : 'text/html'}; charset=utf-8`,
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((accept) => server.listen(0, '127.0.0.1', accept));
const browser = await chromium.launch({ headless: true });
const exceptions = [];
let evidence;
try {
  const page = await browser.newPage();
  const session = await page.context().newCDPSession(page);
  await session.send('Debugger.enable');
  await session.send('Debugger.setPauseOnExceptions', { state: 'all' });
  async function describe(value, depth = 0) {
    if (!value?.objectId || depth > 6) return value?.value ?? value?.description;
    const properties = (
      await session.send('Runtime.getProperties', { objectId: value.objectId, ownProperties: true })
    ).result;
    const result = { description: value.description };
    for (const property of properties)
      if (['message', 'name', 'stack', 'cause', 'errors', '0', '1', '2'].includes(property.name))
        result[property.name] = await describe(property.value, depth + 1);
    return result;
  }
  session.on('Debugger.paused', async (event) => {
    try {
      if (event.data) exceptions.push(await describe(event.data));
    } finally {
      await session.send('Debugger.resume');
    }
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('heading', { name: 'Workflow capability catalog' }).waitFor();
  let projectionError;
  try {
    await page.waitForFunction(
      (keys) =>
        keys.every((key) =>
          window.coverage?.some((item) => item.key === key && item.state !== 'pending'),
        ) && window.coverage.every((item) => item.state !== 'pending'),
      manifest.documents.map((document) => JSON.stringify([document.id, document.revision])),
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: 'helper — flow / old', exact: true }).click();
    await page.getByRole('button', { name: 'Consumers of capture', exact: true }).click();
    await page
      .getByRole('region', { name: 'Operation consumers' })
      .getByText(/1 direct authored step uses/)
      .waitFor();
  } catch (error) {
    projectionError = String(error);
  }
  evidence = {
    capturedAt: new Date().toISOString(),
    projectionError,
    packs,
    lock: JSON.parse(await readFile(join(directory, 'package-lock.json'), 'utf8')),
    coverage: await page.evaluate(() => window.coverage),
    body: await page.locator('body').innerText(),
    exceptions,
  };
} finally {
  await browser.close();
  await new Promise((accept) => server.close(accept));
}
const path = join(directory, `evidence-${Date.now()}.json`);
await writeFile(path, JSON.stringify(evidence, null, 2));
const failures = evidence.coverage.filter(
  (item) => item.state === 'failed' || item.state === 'unsupported',
);
console.log(
  JSON.stringify(
    { path, coverage: evidence.coverage, caughtExceptions: evidence.exceptions.length },
    null,
    2,
  ),
);
if (evidence.projectionError || failures.length)
  throw new Error(
    `Unconstrained installed-package readiness failed; preserved evidence at ${path}`,
  );
console.log('PASS unconstrained advertised-range packed consumer');
