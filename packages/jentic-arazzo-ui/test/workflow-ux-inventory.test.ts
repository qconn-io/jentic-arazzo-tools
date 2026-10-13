import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { readInventory, validateInventory } from './fixtures/workflowUxInventory';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { buildSequence } from '../src/utils/sequence/sequenceModel';

async function discover(path = 'public'): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const name = `${path}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await discover(name)));
    else if (/\.(?:ya?ml|json)$/.test(name)) {
      const bytes = await readFile(name, 'utf8');
      if (
        name.endsWith('.json')
          ? Object.hasOwn(JSON.parse(bytes), 'arazzo')
          : /^arazzo\s*:/m.test(bytes)
      )
        found.push(name);
    }
  }
  return found;
}
test('inventory rejects omitted/new unclassified examples, missing expectations and coverage drift', async () => {
  const inventory = readInventory();
  const paths = await discover();
  expect(() => validateInventory(inventory, paths)).not.toThrow();
  expect(() => validateInventory(inventory, [...paths, 'public/new-example.yaml'])).toThrow(
    'Unclassified',
  );
  const omitted = structuredClone(inventory);
  omitted.documents.pop();
  expect(() => validateInventory(omitted, paths)).toThrow('ten baseline');
  const missing = structuredClone(inventory);
  missing.documents[0].workflows[0].steps[0].locator = '';
  expect(() => validateInventory(missing, paths)).toThrow('Missing semantic');
  const drift = structuredClone(inventory);
  drift.documents[0].workflows.pop();
  expect(() => validateInventory(drift, paths)).toThrow('coverage drift');
  const representation = structuredClone(inventory);
  representation.documents[0].representations.pop();
  expect(() => validateInventory(representation, paths)).toThrow('representation');
});

test('all 46 independently classified workflows match actual authored identities and sequence semantics', async () => {
  for (const entry of readInventory().documents) {
    const bytes = await readFile(entry.path);
    expect(createHash('sha256').update(bytes).digest('hex'), entry.path).toBe(entry.sha256);
    const loaded = await loadDocument(bytes.toString(), { contentOnly: true });
    expect(loaded.document.arazzo).toBe(entry.version);
    const model = buildViewerModel(inspect(loaded.snapshot));
    expect(model.workflows.map((workflow) => workflow.workflowId)).toEqual(
      entry.workflows.map((workflow) => workflow.workflowId),
    );
    for (const expected of entry.workflows) {
      const workflow = model.workflowsById.get(expected.workflowId)!;
      expect(
        workflow.steps.map((step) => step.stepId),
        expected.workflowId,
      ).toEqual(expected.steps.map((step) => step.stepId));
      const scene = buildSequence(model, expected.workflowId);
      for (const [index, want] of expected.steps.entries()) {
        const step = workflow.steps[index];
        expect(step.callTarget ? 'call' : 'operation', want.stepId).toBe(want.kind);
        expect(
          step.sourceBinding.locators.operationId ?? step.sourceBinding.locators.workflowId,
          want.stepId,
        ).toBe(want.locator);
        expect(step.sourceBinding.sourceName ?? null, want.stepId).toBe(want.source);
        if (want.targetKind) expect(step.callTarget?.kind, want.stepId).toBe(want.targetKind);
        for (const [name, value] of Object.entries(want.parameters ?? {}))
          expect(
            step.parameters.find((parameter) => parameter.value.name === name)?.value.value,
          ).toEqual(value);
        if (want.action) expect(step.sourceBinding.intent).toBe(want.action);
        expect(step.prerequisites.map((entry) => entry.target.reference)).toEqual(
          want.prerequisites,
        );
        expect(
          ['onSuccess', 'onFailure'].flatMap((channel) =>
            step.effectiveActions[channel as 'onSuccess' | 'onFailure'].map((action) => ({
              channel,
              name: action.value.name,
              type: action.value.type,
              ...(action.target ? { target: action.target.reference } : {}),
            })),
          ),
        ).toEqual(
          want.actions.map((action) => ({
            channel: action.channel,
            name: action.name,
            type: action.type,
            ...(action.target ? { target: action.target } : {}),
          })),
        );
      }
      expect(workflow.prerequisites.map((prerequisite) => prerequisite.target.reference)).toEqual(
        expected.prerequisites,
      );
      for (const kind of expected.relationships)
        expect(
          scene.rows.some((row) => row.kind === kind),
          `${expected.workflowId}: ${kind}`,
        ).toBe(true);
      expect(
        scene.participants
          .filter((participant) => participant.kind === 'source')
          .map((participant) => participant.name)
          .sort(),
        expected.workflowId,
      ).toEqual([...expected.sources].sort());
      if (expected.limits.includes('rows'))
        expect(scene).toMatchObject({
          bounded: true,
          rows: expect.arrayContaining([expect.objectContaining({ reason: 'rows' })]),
        });
    }
  }
});
