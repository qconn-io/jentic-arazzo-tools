import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import provenance from './fixtures/jentic/provenance.json';

for (const fixture of provenance.fixtures) {
  test(`inspects pinned Jentic ${fixture.name} authored workflows without acquisition`, async () => {
    const bytes = await readFile(new URL(`./fixtures/jentic/${fixture.path}`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(fixture.sha256);
    const fetch = vi.spyOn(globalThis, 'fetch');
    try {
      const loaded = await loadDocument(bytes.toString('utf8'), {
        baseURI: fixture.url,
        contentOnly: true,
      });
      const model = buildViewerModel(inspect(loaded.snapshot));
      expect(model.workflows).toHaveLength(fixture.workflows);
      expect(model.workflows.flatMap((workflow) => workflow.steps)).toHaveLength(fixture.steps);
      for (const workflow of model.workflows) {
        expect(workflow.workflowId).toBeTruthy();
        expect(workflow.steps.every((step) => step.stepId && step.value)).toBe(true);
      }
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
}
