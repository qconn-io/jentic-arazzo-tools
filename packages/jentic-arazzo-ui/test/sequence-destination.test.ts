import { expect, test } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { buildSequence, destinationKey } from '../src/utils/sequence/sequenceModel';
import type { OperationSourceCandidate } from '../src/utils/contract/OperationStatusResolver';
import { resolveStepOperation } from '../src/utils/contract/stepOperation';
import { SourceRegistry } from '../src/utils/source/SourceRegistry';
import { projectOpenAPI } from '../src/utils/contract/OpenAPIAdapter';

const input = {
  arazzo: '1.1.0',
  info: { title: 'Sequence', version: '1' },
  sourceDescriptions: ['a', 'b'].map((name) => ({
    name,
    type: 'openapi',
    url: `https://example.test/${name}`,
  })),
  workflows: [{ workflowId: 'root', steps: [{ stepId: 'run', operationId: 'run' }] }],
};
const model = buildViewerModel(inspect(createSnapshot(input)));
const step = model.workflows[0].steps[0];
async function loaded(name: string, id: string) {
  return {
    state: 'success' as const,
    facts: await projectOpenAPI(
      {
        openapi: '3.1.0',
        paths: {
          '/run': { get: { operationId: id, responses: {} } },
        },
      },
      `https://example.test/${name}`,
      new SourceRegistry(),
    ),
  };
}

test('only complete unique current evidence changes endpoints, leaving authored ambiguity and row identity intact', async () => {
  const a = await loaded('a', 'run');
  const b = await loaded('b', 'other');
  const original = buildSequence(model, 'root');
  const evidence = new Map([
    [destinationKey(model, step), resolveStepOperation(model, step, { a, b })],
  ]);
  const scene = buildSequence(model, 'root', {}, evidence);
  expect(scene.participants.map((p) => p.name)).toEqual(['root', 'a']);
  expect(scene.rows[0].id).toBe(original.rows[0].id);
  expect(scene.rows[0].path).toEqual(original.rows[0].path);
  expect(scene.rows[0].label).toContain('ambiguous');
  expect(scene.rows[0].destinationEvidence?.status).toBe('located');
  expect(step.sourceBinding.sourceName).toBeUndefined();
  const scopes: Record<string, OperationSourceCandidate>[] = [
    { a },
    { a, b: await loaded('b', 'run') },
    { a, b: { state: 'error' } },
  ];
  for (const facts of scopes) {
    evidence.set(destinationKey(model, step), resolveStepOperation(model, step, facts));
    expect(buildSequence(model, 'root', {}, evidence).participants[1].kind).toBe('unknown');
  }
});

test('a known declaration survives missing lookup, and evidence from another document cannot attach', () => {
  const declared = buildViewerModel(
    inspect(createSnapshot({ ...input, sourceDescriptions: [input.sourceDescriptions[0]] })),
  );
  const ds = declared.workflows[0].steps[0];
  const evidence = new Map([
    [
      destinationKey(declared, ds),
      { status: 'missing' as const, sourceName: 'a', basis: 'single-source' as const },
    ],
  ]);
  expect(buildSequence(declared, 'root', {}, evidence).participants[1].name).toBe('a');
  expect(buildSequence(model, 'root', {}, evidence).participants[1].kind).toBe('unknown');
});
