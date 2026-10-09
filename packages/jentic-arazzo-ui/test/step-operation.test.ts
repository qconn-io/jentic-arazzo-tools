import { expect, test } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { SourceRegistry } from '../src/utils/source/SourceRegistry';
import { projectOpenAPI } from '../src/utils/contract/OpenAPIAdapter';
import { resolveStepOperation } from '../src/utils/contract/stepOperation';
import { lookupSystemOperation } from '../src/utils/systems/contracts';
import type { OperationSourceCandidate } from '../src/utils/contract/OperationStatusResolver';

const sources = [
  { name: 'a', type: 'openapi', url: 'https://example.test/api' },
  { name: 'b', type: 'openapi', url: 'https://example.test/api' },
];
const modelFor = (locator: Record<string, unknown>, declarations = sources) =>
  buildViewerModel(
    inspect(
      createSnapshot({
        arazzo: '1.1.0',
        info: { title: 'Lookup', version: '1' },
        sourceDescriptions: declarations,
        workflows: [{ workflowId: 'root', steps: [{ stepId: 'run', ...locator }] }],
      }),
    ),
  );
async function candidate(id = 'run', revision = 'r1'): Promise<OperationSourceCandidate> {
  return {
    state: 'success',
    facts: await projectOpenAPI(
      {
        openapi: '3.1.0',
        paths: {
          '/run': { get: { operationId: id, responses: {} } },
        },
      },
      'https://example.test/api',
      new SourceRegistry(),
      revision,
    ),
  };
}

test('complete unique lookup retains authored source-name and revision rather than URI alias identity', async () => {
  const model = modelFor({ operationId: 'run' });
  const step = model.workflows[0].steps[0];
  const loaded = { a: await candidate('other'), b: await candidate('run', 'r2') };
  const result = resolveStepOperation(model, step, loaded);
  expect(result).toMatchObject({ status: 'located', sourceName: 'b', basis: 'contract-lookup' });
  expect(result.candidates?.[0].revision).toBe('r2');
  expect(lookupSystemOperation(model, step, loaded)).toMatchObject(result);
  expect(step.sourceBinding.status).toBe('ambiguous');
  expect(step.diagnostics.some((d) => d.code === 'ambiguous-source')).toBe(true);
});

test('partial, failed, unsupported and duplicate candidate scopes never establish a destination', async () => {
  const model = modelFor({ operationId: 'run' });
  const step = model.workflows[0].steps[0];
  const a = await candidate();
  for (const [b, status] of [
    [{ state: 'idle' }, 'not-loaded'],
    [{ state: 'loading' }, 'loading'],
    [{ state: 'error', error: new Error('Denied') }, 'failed'],
    [
      {
        state: 'success',
        facts: { ...a.facts!, dialect: 'unsupported', unsupportedDiagnostics: ['Unsupported'] },
      },
      'unsupported',
    ],
    [await candidate(), 'ambiguous'],
  ] as [OperationSourceCandidate, string][]) {
    const result = resolveStepOperation(model, step, { a, b });
    expect(result.status).toBe(status);
    expect(result.sourceName).toBeUndefined();
  }
});

test('qualified dotted IDs and pointers select the declared alias even when its operation is missing', async () => {
  for (const locator of [
    { operationId: '$sourceDescriptions.b.run' },
    { operationPath: '{$sourceDescriptions.b.url}#/paths/~1run/get' },
  ]) {
    const model = modelFor(locator);
    const step = model.workflows[0].steps[0];
    const result = resolveStepOperation(model, step, { b: await candidate() });
    expect(result).toMatchObject({ status: 'located', sourceName: 'b', basis: 'explicit-locator' });
    const missing = resolveStepOperation(model, step, {
      b: { state: 'success', facts: { ...(await candidate()).facts!, operations: new Map() } },
    });
    expect(missing).toMatchObject({ status: 'missing', sourceName: 'b' });
    expect(step.sourceBinding.verification).toBe('unverified');
  }
});

test('unknown non-Arazzo declarations participate in coverage and unsupported old async cannot establish binding', async () => {
  const model = modelFor({ operationId: 'run' }, [sources[0], { ...sources[1], type: 'future' }]);
  expect(
    resolveStepOperation(model, model.workflows[0].steps[0], { a: await candidate() }).status,
  ).toBe('not-loaded');
  expect(
    resolveStepOperation(model, model.workflows[0].steps[0], {
      a: await candidate(),
      b: await candidate('other'),
    }).status,
  ).toBe('unsupported');
});

test('unknown selected-1.1 async intent cannot establish authored or loaded destinations', async () => {
  const model = modelFor({ operationId: 'run', action: 'dance' }, [sources[0]]);
  const step = model.workflows[0].steps[0];
  expect(step.diagnostics.some((d) => d.code === 'unsupported-async-intent')).toBe(true);
  expect(step.sourceBinding.sourceName).toBeUndefined();
  expect(resolveStepOperation(model, step, { a: await candidate() })).toMatchObject({
    status: 'unsupported',
  });
  expect(resolveStepOperation(model, step, { a: await candidate() }).sourceName).toBeUndefined();
});
