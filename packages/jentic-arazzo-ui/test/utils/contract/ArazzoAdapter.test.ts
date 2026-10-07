import { describe, it, expect } from 'vitest';
import { projectArazzo } from '../../../src/utils/contract/ArazzoAdapter';
import { SourceRegistry } from '../../../src/utils/source/SourceRegistry';

describe('ArazzoAdapter', () => {
  it('loads supplied Arazzo sources as separate inspected models', async () => {
    const registry = new SourceRegistry();
    const content = `
arazzo: 1.1.0
info:
  title: Commerce
  version: 1.0.0
sourceDescriptions: []
workflows:
  - workflowId: fulfil-item
    steps:
      - stepId: pack
        description: Pack item
    `;
    const model = await projectArazzo(content, 'http://test/commerce.yaml', registry);
    expect(model.document.info.title).toBe('Commerce');
    expect(model.inspection.snapshot.baseURI).toBe('http://test/commerce.yaml');
    expect(model.workflowsById.get('fulfil-item')).toBeDefined();

    // Original external call classification remains unchanged
    const target = model.inspection.classifyTarget('$workflows.fulfil-item', { role: 'call' });
    expect(target.kind).toBe('local-workflow');

    // In a primary document, it would be 'external-workflow' pointing to 'commerce'
    // Let's create a primary document that refers to commerce
    const primaryContent = `
arazzo: 1.1.0
info:
  title: Primary
  version: 1.0.0
sourceDescriptions:
  - name: commerce
    type: arazzo
    url: http://test/commerce.yaml
workflows:
  - workflowId: caller
    steps:
      - stepId: call
        workflowId: $sourceDescriptions.commerce.fulfil-item
    `;
    const primaryModel = await projectArazzo(primaryContent, 'http://test/primary.yaml', registry);
    const callerStep = primaryModel.workflowsById.get('caller')?.steps[0];
    expect(callerStep?.callTarget?.kind).toBe('external-workflow');
    expect(callerStep?.callTarget?.sourceName).toBe('commerce');
  });
});

it('retains acquired workflow retrieval and revision identity', async () => {
  const model = await projectArazzo(
    {
      arazzo: '1.1.0',
      info: { title: 'Commerce', version: '1' },
      sourceDescriptions: [],
      workflows: [{ workflowId: 'fulfil-item', steps: [{ stepId: 'pack' }] }],
    },
    'https://test/commerce',
    new SourceRegistry(),
    'rev-a',
  );
  expect(model.inspection.snapshot.retrievalURI).toBe('https://test/commerce');
  expect(model.documentId).toContain('rev-a');
});
