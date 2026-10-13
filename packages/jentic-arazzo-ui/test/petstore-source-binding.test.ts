import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { buildSequence } from '../src/utils/sequence/sequenceModel';
import { SourceRegistry } from '../src/utils/source/SourceRegistry';
import { generateMermaidSequence } from '../src/utils/documentation/mermaidGenerator';
import { generateDocumentation } from '../src/utils/documentation/docGenerator';

test('unchanged Petstore binds all five operations to its sole API without acquisition', async () => {
  const bytes = await readFile(
    new URL('../public/petstore-order-workflow.arazzo.yaml', import.meta.url),
  );
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(
    '8bd096d24c2cabd7536dc2feb9cb8b9157ffebbadf931bcc26230de4b1989569',
  );
  const registry = new SourceRegistry();
  const load = vi.fn(async () => {
    throw new Error('No secondary acquisition authorized');
  });
  registry.setProvider({ load });
  const loaded = await loadDocument(bytes.toString(), {
    contentOnly: true,
    secondaryRegistry: registry,
  });
  const model = buildViewerModel(inspect(loaded.snapshot));
  const workflow = model.workflows[0];
  const scene = buildSequence(model, workflow.workflowId);
  expect(scene.rows.filter((row) => row.kind === 'operation')).toHaveLength(5);
  expect(scene.participants.map((p) => [p.kind, p.name])).toEqual([
    ['workflow', workflow.workflowId],
    ['source', 'petstoreAPI'],
  ]);
  expect(workflow.steps.every((step) => step.sourceBinding.sourceName === 'petstoreAPI')).toBe(
    true,
  );
  expect(workflow.steps.every((step) => step.sourceBinding.verification === 'unverified')).toBe(
    true,
  );
  expect(workflow.steps.map((step) => step.sourceBinding.locators.operationId)).toEqual(
    loaded.document.workflows[0].steps.map((step) => step.operationId),
  );
  const mermaid = generateMermaidSequence(loaded.document.workflows[0], loaded.document, model);
  expect(mermaid).toContain('petstoreAPI');
  expect(mermaid).not.toContain('Unknown destination');
  expect(mermaid).not.toContain('Response');
  const docs = generateDocumentation(loaded.document, { model });
  expect(docs.markdown).toContain('petstoreAPI');
  expect(docs.workflows[0].steps.map((step) => step.sourceBinding?.sourceName)).toEqual(
    Array(5).fill('petstoreAPI'),
  );
  expect(
    docs.workflows[0].steps.every((step) => step.sourceBinding?.verification === 'unverified'),
  ).toBe(true);
  expect(mermaid).toContain('authored-only source bindings, operations not checked');
  expect(load).not.toHaveBeenCalled();
});
