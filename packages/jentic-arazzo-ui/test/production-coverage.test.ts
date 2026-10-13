import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const check = (report: object) =>
  spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import { assertRequiredResults } from './scripts/production-results.mjs'; assertRequiredResults(JSON.parse(process.argv[1]), ['required'], ['desktop', 'mobile']);",
      JSON.stringify(report),
    ],
    { encoding: 'utf8' },
  );
const result = (title: string, projectName: string, status = 'passed') => ({
  title,
  tests: [{ projectName, results: [{ status }] }],
});
test('production coverage rejects omitted, skipped or failed required cases instead of accepting a smaller green subset', () => {
  const complete = {
    suites: [{ specs: [result('required', 'desktop'), result('required', 'mobile')] }],
    errors: [],
  };
  expect(check(complete).status).toBe(0);
  for (const status of ['skipped', 'failed', 'interrupted']) {
    const rejected = check({
      suites: [{ specs: [result('required', 'desktop'), result('required', 'mobile', status)] }],
      errors: [],
    });
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain('Required production coverage incomplete');
  }
  expect(
    check({ suites: [{ specs: [result('required', 'desktop')] }], errors: [] }).stderr,
  ).toContain('Required production coverage incomplete');
  expect(check({ ...complete, errors: [{ message: 'Server unavailable' }] }).status).not.toBe(0);
});

test('negative evidence rejects a named assertion mixed with unrelated crashes or wrong project/title coverage', () => {
  const fault = { name: 'fault', title: 'required', reason: 'Named fault assertion' };
  const execute = (report: object) =>
    spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { assertFaultDetected } from './scripts/production-results.mjs'; assertFaultDetected(JSON.parse(process.argv[1]), JSON.parse(process.argv[2]));",
        JSON.stringify(report),
        JSON.stringify(fault),
      ],
      { encoding: 'utf8' },
    );
  const failed = (projectName: string, messages: string[], title = 'required') => ({
    title,
    tests: [
      {
        projectName,
        results: [{ status: 'failed', errors: messages.map((message) => ({ message })) }],
      },
    ],
  });
  expect(
    execute({
      suites: [{ specs: [failed('desktop', [fault.reason]), failed('mobile', [fault.reason])] }],
      errors: [],
    }).status,
  ).toBe(0);
  for (const specs of [
    [
      failed('desktop', [fault.reason, 'Unrelated browser crash']),
      failed('mobile', [fault.reason]),
    ],
    [failed('desktop', [fault.reason]), failed('other-project', [fault.reason])],
    [failed('desktop', [fault.reason], 'wrong case'), failed('mobile', [fault.reason])],
  ])
    expect(execute({ suites: [{ specs }], errors: [] }).status).not.toBe(0);
});

test('a failed current run replaces old passing evidence with a fresh failed identity', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'arazzo-run-state-'));
  const path = join(directory, 'coverage.json');
  try {
    await writeFile(path, JSON.stringify({ runId: 'old', state: 'passed' }));
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { withRecordedRun } from './scripts/production-results.mjs'; await withRecordedRun(process.argv[1], async () => { throw new Error('Current required check failed'); });",
        path,
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).not.toBe(0);
    const record = JSON.parse(await readFile(path, 'utf8'));
    expect(record.state).toBe('failed');
    expect(record.runId).not.toBe('old');
    expect(record.error).toContain('Current required check failed');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('representation capture checks handle separate project specs and reject an omitted mobile frame', () => {
  const names = [
    'diagram-root',
    'docs-docs-root',
    'docs-sequence-root',
    'docs-flowchart-root',
    'split-docs-root',
    'split-sequence-root',
    'split-flowchart-root',
  ];
  const frame = (width: number) => {
    const bytes = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
    bytes.write('IHDR', 12);
    bytes.writeUInt32BE(width, 16);
    bytes.writeUInt32BE(900, 20);
    return bytes.toString('base64');
  };
  const spec = (projectName: string, width: number) => ({
    title: 'UX root reading matrix example',
    tests: [
      {
        projectName,
        results: [
          {
            status: 'passed',
            attachments: names.map((name) => ({
              name,
              contentType: 'image/png',
              body: frame(width),
            })),
          },
        ],
      },
    ],
  });
  const report = { suites: [{ specs: [spec('desktop', 1440), spec('mobile', 480)] }] };
  const execute = () =>
    spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { assertRepresentationCaptures } from './scripts/production-results.mjs'; assertRepresentationCaptures(JSON.parse(process.argv[1]), { documents: [{ path: 'example' }] });",
        JSON.stringify(report),
      ],
      { encoding: 'utf8' },
    );
  expect(execute().status).toBe(0);
  report.suites[0].specs[1].tests[0].results[0].attachments.pop();
  expect(execute().stderr).toContain('Required production representation capture omitted');
});
