import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('Petstore identity accepts unchanged bytes and rejects an isolated sample perturbation for its exact reason', async () => {
  const output = await mkdtemp(join(tmpdir(), 'arazzo-petstore-identity-'));
  const sample = join(output, 'petstore.yaml');
  const check = () =>
    spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { verifyPetstoreBaseline } from './scripts/production-artifacts.mjs'; await verifyPetstoreBaseline(process.argv[1]);",
        sample,
      ],
      { encoding: 'utf8' },
    );
  try {
    const bytes = await readFile('public/petstore-order-workflow.arazzo.yaml');
    await writeFile(sample, bytes);
    expect(check().status).toBe(0);
    await writeFile(
      sample,
      Buffer.concat([bytes, Buffer.from('\n# controlled isolated perturbation\n')]),
    );
    const rejected = check();
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain('Petstore baseline identity mismatch');
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('production identity includes default bytes, inventory, help and every maintained acceptance input', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import { currentIdentity } from './scripts/production-artifacts.mjs'; console.log(JSON.stringify(await currentIdentity()));",
    ],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  const input = JSON.parse(result.stdout);
  expect(input.fixtures).toHaveProperty(['public/petstore-order-workflow.arazzo.yaml']);
  expect(input.tests).toHaveProperty(['test/fixtures/workflow-ux-acceptance.json']);
  expect(input.tests).toHaveProperty(['test/fixtures/workflowUxInventory.ts']);
  expect(input.tests).toHaveProperty(['test/e2e/production.spec.ts']);
  expect(input.tests).toHaveProperty(['test/workflow-ux-inventory.test.ts']);
  expect(input.buildInputs).toHaveProperty(['README.md']);
  expect(input.buildInputs).toHaveProperty(['../../.github/workflows/build.yml']);
});
