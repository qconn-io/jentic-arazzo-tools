import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';
import {
  assertRequiredResults,
  assertFaultDetected,
  faultCases,
  requiredInventoryTitles,
  reportSpecs,
  requiredUXTitles,
  withRecordedRun,
  assertRepresentationCaptures,
} from './production-results.mjs';
import {
  root,
  output,
  hashes,
  currentIdentity,
  verifyIdentity,
  fixtureHash,
} from './production-artifacts.mjs';

async function run(command, args, env = {}, allowFailure = false) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('error', reject);
    child.on('exit', (code, signal) =>
      code === 0 || allowFailure
        ? accept(code)
        : reject(new Error(`${command} ${args.join(' ')} failed (${signal ?? code})`)),
    );
  });
}
async function trackedDiffSha256() {
  const hash = createHash('sha256');
  await new Promise((accept, reject) => {
    const child = spawn('git', ['diff', 'HEAD', '--binary'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let error = '';
    child.stdout.on('data', (chunk) => hash.update(chunk));
    child.stderr.on('data', (chunk) => {
      error = (error + chunk).slice(0, 4096);
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? accept() : reject(new Error(`Candidate diff identity failed: ${error}`)),
    );
  });
  return hash.digest('hex');
}
const negative = process.argv.includes('--negative');
await withRecordedRun(resolve(output, negative ? 'negative.json' : 'coverage.json'), async () => {
  let summary = {};
  if (!negative)
    await writeFile(
      resolve(output, 'negative.json'),
      JSON.stringify({
        state: 'pending',
        reason: 'A new positive candidate must be checked before negative controls',
      }),
    );
  // obtain a fresh local port; Playwright also refuses any intervening listener.
  const port = await new Promise((accept, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const value = server.address().port;
      server.close(() => accept(value));
    });
  });
  if (!negative) {
    await run('npm', [
      'test',
      '--',
      'test/workflow-ux-inventory.test.ts',
      'test/production-input-identity.test.ts',
      'test/production-coverage.test.ts',
    ]);
    const inputs = await currentIdentity();
    for (const dependency of ['@jentic/arazzo-parser', '@jentic/arazzo-resolver']) {
      await run('npm', ['run', 'build:es', '-w', dependency]);
      await run('npm', ['run', 'typescript:declaration', '-w', dependency]);
    }
    await run('npm', ['run', 'build']);
    await run('npm', ['run', 'test:package:built']);
    await mkdir(output, { recursive: true });
    // use the durable typed regression fixtures without a private source import in the consumer.
    const code = ts.transpileModule(
      await readFile(resolve(root, 'test/fixtures/upstream-readiness.ts'), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      },
    ).outputText;
    const fixtures = await import(
      `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
    );
    const { parseArazzo, defaultParseArazzoOptions } = await import('@jentic/arazzo-parser');
    const digitalProduct = await parseArazzo(
      await readFile(resolve(root, 'public/examples/digital-product/arazzo.yaml'), 'utf8'),
      {
        resolve: {
          resolvers: defaultParseArazzoOptions.resolve.resolvers.filter(
            (resolver) => resolver.name === 'memory',
          ),
        },
        parse: { parserOpts: { strict: false } },
      },
    );
    await writeFile(
      resolve(output, 'readiness.json'),
      JSON.stringify({
        document: fixtures.consumerWorkflow(),
        digitalProduct: digitalProduct.api.toValue(),
        representatives: Object.fromEntries(
          await Promise.all(
            ['asana', 'xero', 'stripe'].map(async (name) => [
              name,
              JSON.parse(
                await readFile(resolve(root, `test/fixtures/jentic/${name}.json`), 'utf8'),
              ),
            ]),
          ),
        ),
        profile: fixtures.entryActorProfile(),
        catalog: fixtures.consumerCatalog(),
        baseline: fixtures.defaultActionReview('old', 1),
        candidate: fixtures.defaultActionReview('new', 3),
      }),
    );
    await writeFile(
      resolve(output, 'identity.json'),
      JSON.stringify(
        {
          builtAt: new Date().toISOString(),
          candidate: {
            head: execFileSync('git', ['rev-parse', 'HEAD'], {
              cwd: root,
              encoding: 'utf8',
            }).trim(),
            base: execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], {
              cwd: root,
              encoding: 'utf8',
            }).trim(),
            trackedDiffSha256: await trackedDiffSha256(),
          },
          fixtureSha256: await fixtureHash(),
          inputs,
          artifacts: {
            ...(await hashes(resolve(root, 'build'))),
            ...(await hashes(resolve(root, 'test-output/package-consumer/app'))),
          },
          package: JSON.parse(
            await readFile(resolve(root, 'test-output/package-consumer/metadata.json'), 'utf8'),
          ),
        },
        null,
        2,
      ),
    );
  }
  await verifyIdentity();
  const inventory = JSON.parse(
    await readFile(resolve(root, 'test/fixtures/workflow-ux-acceptance.json'), 'utf8'),
  );
  const args = ['playwright', 'test', '--config', 'playwright.config.ts'];
  if (!negative) {
    await run('npx', args, { ARAZZO_BROWSER_PORT: String(port) });
    const report = JSON.parse(await readFile(resolve(output, 'positive.json'), 'utf8'));
    assertRequiredResults(report, [...requiredInventoryTitles(inventory), ...requiredUXTitles]);
    const specs = reportSpecs(report);
    assertRepresentationCaptures(report, inventory);
    summary = {
      documents: 10,
      workflows: 46,
      projects: ['desktop', 'mobile'],
      rootStatesPerProject: 70,
      tests: specs.length,
    };
  } else {
    const coverage = JSON.parse(await readFile(resolve(output, 'coverage.json'), 'utf8'));
    const identitySha256 = createHash('sha256')
      .update(await readFile(resolve(output, 'identity.json')))
      .digest('hex');
    if (coverage.state !== 'passed' || coverage.identitySha256 !== identitySha256)
      throw new Error('Run successful current production coverage before negative controls');
    const results = [];
    for (const fault of faultCases) {
      const directory = resolve(output, 'negative', fault.name);
      await mkdir(directory, { recursive: true });
      const environment = {
        ARAZZO_BROWSER_PORT: String(port),
        ARAZZO_BROWSER_RESULTS: resolve(directory, 'results'),
        ARAZZO_BROWSER_HTML: resolve(directory, 'report'),
      };
      await run('npx', [...args, '--grep', fault.title], {
        ...environment,
        ARAZZO_BROWSER_REPORT: resolve(directory, 'control.json'),
        ARAZZO_BROWSER_RESULTS: resolve(directory, 'control-results'),
        ARAZZO_BROWSER_HTML: resolve(directory, 'control-report'),
      });
      assertRequiredResults(
        JSON.parse(await readFile(resolve(directory, 'control.json'), 'utf8')),
        [fault.title],
      );
      const code = await run(
        'npx',
        [...args, '--grep', fault.title],
        {
          ...environment,
          ARAZZO_BROWSER_REPORT: resolve(directory, 'fault.json'),
          ARAZZO_BROWSER_RESULTS: resolve(directory, 'fault-results'),
          ARAZZO_BROWSER_HTML: resolve(directory, 'fault-report'),
          ARAZZO_UX_FAULT: fault.name,
        },
        true,
      );
      if (code === 0) throw new Error(`Negative control ${fault.name} was not detected`);
      assertFaultDetected(
        JSON.parse(await readFile(resolve(directory, 'fault.json'), 'utf8')),
        fault,
      );
      results.push({ ...fault, control: 'passed', fault: 'detected' });
      await writeFile(
        resolve(output, 'negative-progress.json'),
        JSON.stringify({ verifiedAt: new Date().toISOString(), results }, null, 2),
      );
    }
    summary = { results };
    console.log(
      `PASS all ${results.length} named UX negative controls and their normal controls at both widths`,
    );
  }

  const current = await verifyIdentity();
  return {
    ...summary,
    candidate: current.candidate,
    identitySha256: createHash('sha256')
      .update(await readFile(resolve(output, 'identity.json')))
      .digest('hex'),
    inputsSha256: createHash('sha256').update(JSON.stringify(current.inputs)).digest('hex'),
  };
});
