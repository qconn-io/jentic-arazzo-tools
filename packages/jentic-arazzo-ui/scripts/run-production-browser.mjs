import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';
import {
  root,
  output,
  hashes,
  currentIdentity,
  verifyIdentity,
  fixtureHash,
} from './production-artifacts.mjs';

async function run(command, args, env = {}) {
  await new Promise((accept, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('error', reject);
    child.on('exit', (code, signal) =>
      code === 0
        ? accept()
        : reject(new Error(`${command} ${args.join(' ')} failed (${signal ?? code})`)),
    );
  });
}
// obtain a fresh local port; Playwright also refuses any intervening listener.
const port = await new Promise((accept, reject) => {
  const server = createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const value = server.address().port;
    server.close(() => accept(value));
  });
});
const negative = process.argv.includes('--negative');
if (!negative) {
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
  await writeFile(
    resolve(output, 'readiness.json'),
    JSON.stringify({
      document: fixtures.consumerWorkflow(),
      representatives: Object.fromEntries(
        await Promise.all(
          ['asana', 'xero', 'stripe'].map(async (name) => [
            name,
            JSON.parse(await readFile(resolve(root, `test/fixtures/jentic/${name}.json`), 'utf8')),
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
await run(
  'npx',
  [
    'playwright',
    'test',
    '--config',
    'playwright.production.config.ts',
    ...(negative ? ['--grep', 'identified'] : []),
  ],
  {
    ARAZZO_BROWSER_PORT: String(port),
    ...(negative ? { ARAZZO_BROWSER_BREAK_FIXTURE: '1' } : {}),
  },
);
