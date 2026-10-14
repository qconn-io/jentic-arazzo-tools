export function reportSpecs(report) {
  const visit = (suite) => [...(suite.specs ?? []), ...(suite.suites ?? []).flatMap(visit)];
  return (report.suites ?? []).flatMap(visit);
}
export function assertRequiredResults(report, titles, projects = ['desktop', 'mobile']) {
  if (report.errors?.length)
    throw new Error('Required production coverage incomplete: runner errors');
  const specs = reportSpecs(report);
  for (const title of titles)
    for (const project of projects) {
      const tests = specs
        .filter((spec) => spec.title === title)
        .flatMap((spec) => spec.tests)
        .filter((test) => test.projectName === project);
      if (
        tests.length !== 1 ||
        tests[0].results.length !== 1 ||
        tests[0].results[0].status !== 'passed'
      )
        throw new Error(`Required production coverage incomplete: ${project}: ${title}`);
    }
  if (
    specs.some((spec) =>
      spec.tests.some((test) => test.results.length !== 1 || test.results[0].status !== 'passed'),
    )
  )
    throw new Error('Required production coverage incomplete: a test was skipped or failed');
}
export function requiredInventoryTitles(inventory) {
  return inventory.documents.flatMap((entry) => [
    `UX root reading matrix ${entry.path}`,
    ...entry.workflows.map(
      (workflow) => `UX workflow sequence ${entry.path} ${workflow.workflowId}`,
    ),
  ]);
}
export function assertRepresentationCaptures(report, inventory) {
  const specs = reportSpecs(report);
  const names = [
    'diagram-root',
    'docs-docs-root',
    'docs-sequence-root',
    'docs-flowchart-root',
    'split-docs-root',
    'split-sequence-root',
    'split-flowchart-root',
  ];
  for (const entry of inventory.documents)
    for (const [project, width] of [
      ['desktop', 1440],
      ['mobile', 480],
    ]) {
      const tests = specs
        .filter((spec) => spec.title === `UX root reading matrix ${entry.path}`)
        .flatMap((spec) => spec.tests)
        .filter((test) => test.projectName === project);
      const attachments = tests.length === 1 ? tests[0].results[0].attachments : [];
      for (const name of names) {
        const image = attachments.find(
          (attachment) => attachment.name === name && attachment.contentType === 'image/png',
        );
        const bytes = Buffer.from(image?.body ?? '', 'base64');
        if (
          bytes.length < 24 ||
          bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
          bytes.toString('ascii', 12, 16) !== 'IHDR' ||
          bytes.readUInt32BE(16) !== width ||
          bytes.readUInt32BE(20) === 0
        )
          throw new Error(
            `Required production representation capture omitted or invalid: ${project}: ${entry.path}: ${name}`,
          );
      }
    }
}
export const faultCases = [
  {
    name: 'petstore-lanes',
    title: 'UX default bare entry preserves five known Petstore interactions and readable details',
    reason: 'UX Petstore lanes must identify the known petstoreAPI destination',
  },
  {
    name: 'stale-destination',
    title:
      'UX Petstore explicit lookup, duplicate, failure and reload keep inspector and sequence current',
    reason: 'UX stale destination evidence must disappear after reload',
  },
  {
    name: 'silent-render',
    title: 'UX rejected flowchart exposes retry and descriptions without blank success',
    reason: 'UX render rejection must expose localized recovery rather than blank success',
  },
  {
    name: 'missing-discovery',
    title: 'UX first-use guide discovery starts at plain entry and help performs no guide acquisition',
    reason: 'UX first-use discovery must reveal guide purpose without injected setup',
  },
  {
    name: 'legacy-consumer',
    title:
      'UX legacy document query/hash and shared occurrence history preserve exact second-item 2499',
    reason: 'UX legacy hash must restore the authored stress document',
  },
  {
    name: 'lost-identity',
    title: 'UX default bare entry preserves five known Petstore interactions and readable details',
    reason: 'UX direct identity activation must inspect the authored step',
  },
  {
    name: 'lost-sequence-follow',
    title: 'UX following a local call retains sequence and exact caller return',
    reason: 'UX sequence follow must open the accepted callee in sequence',
  },
];
export const requiredUXTitles = [
  'referenced contract constraints stay separate and reload refreshes every dependency',
  'event contract inspection retains receive direction, message alternatives and correlation',
  'standalone catalog shares exact selection and rejects unavailable revisions',
  'API descriptions discovery, delayed recovery and missing lookup preserve reading and focus',
  'API descriptions long source labels wrap and manual bulk loading remains explicit',
  'UX installed embed preserves prerequisite order, geometry modality and raw sizing',
  ...faultCases.map((fault) => fault.title),
  'identified installed ESM plain viewing and provider denial',
  'standalone viewing discloses setup and automatically loads declared API descriptions',
  'repeated calls retain distinct contexts and helpers have Unknown actor',
  'operation panel opens both entry occurrences without another workflow choice',
  'shared defaults show scoped before and after potential impact',
  'scenario focus, dismissal and restored guide context',
  'pinned Jentic Asana, Xero and Stripe remain readable without acquisition',
  'F1 flowchart labels stay readable with contained keyboard scrolling: petstore',
  'F1 flowchart labels stay readable with contained keyboard scrolling: long-label',
  'UX partial and duplicate candidate coverage never promotes an unchecked unique destination',
  ...['empty', 'malformed', 'unavailable', 'mismatched'].map(
    (state) => `UX guide ${state} remains local and normal workflow reading recovers`,
  ),
  'UX installed ESM controlled requests, repeated scopes and obsolete provider/document results',
  ...['svg', 'error'].map(
    (outcome) =>
      `UX obsolete Mermaid ${outcome} after replacement cannot overwrite current reading`,
  ),
  'UX configured and stale Systems context keeps exact return and explanatory limitations',
  'UX recursive, depth and row boundaries explain limits and expose complete authored content',
  'UX restored unavailable guide preserves its exact current workflow occurrence',
];
export function assertFaultDetected(report, fault) {
  if (report.errors?.length)
    throw new Error(`Negative control ${fault.name} failed for runner errors`);
  const specs = reportSpecs(report);
  const tests = specs.flatMap((spec) => spec.tests);
  if (
    tests.length !== 2 ||
    specs.some((spec) => spec.title !== fault.title) ||
    JSON.stringify(tests.map((test) => test.projectName).sort()) !==
      JSON.stringify(['desktop', 'mobile']) ||
    tests.some(
      (test) =>
        test.results.length !== 1 ||
        test.results[0].status !== 'failed' ||
        test.results[0].errors?.length !== 1 ||
        !test.results[0].errors[0].message?.includes(fault.reason),
    )
  )
    throw new Error(`Negative control ${fault.name} missed its named assertion reason`);
}
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function withRecordedRun(path, action) {
  const identity = { runId: randomUUID(), startedAt: new Date().toISOString() };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ ...identity, state: 'running' }, null, 2));
  try {
    const result = await action();
    await writeFile(
      path,
      JSON.stringify(
        { ...identity, ...result, state: 'passed', finishedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
    return result;
  } catch (error) {
    await writeFile(
      path,
      JSON.stringify(
        {
          ...identity,
          state: 'failed',
          finishedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    throw error;
  }
}
