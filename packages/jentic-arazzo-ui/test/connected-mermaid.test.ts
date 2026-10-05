// @vitest-environment jsdom
import { expect, test } from 'vitest';
import mermaid from 'mermaid';
import { generateMermaidSequence } from '../src/utils/documentation/mermaidGenerator';
import { generateMermaidFlowchart } from '../src/utils/documentation/mermaidFlowchartGenerator';
import { generateDocumentation } from '../src/utils/documentation/docGenerator';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { nestedCalls, recursiveCalls, difficultCalls } from './fixtures/connected';
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });

test('static sequences parse and show direct callee operations, distinct repeated groups and structural continuations', async () => {
  for (const doc of [nestedCalls, recursiveCalls, difficultCalls]) {
    const sequence = generateMermaidSequence(doc.workflows[0], doc);
    await expect(mermaid.parse(sequence)).resolves.toBeTruthy();
    expect(sequence).toContain('Schematic authored interactions');
    expect(sequence).not.toContain('participant Client');
    expect(sequence).not.toContain('unused');
  }
  const sequence = generateMermaidSequence(nestedCalls.workflows[0], nestedCalls);
  expect(sequence.match(/charge/g)).toHaveLength(2);
  expect(sequence.match(/rect rgb/g)).toHaveLength(2);
  expect(sequence).toContain('Structural continuation');
  expect(sequence).not.toContain('Response');
  expect(sequence).not.toContain('$inputs.amount');
});

test('flowchart default labels are concise and full metadata remains in associated documentation', async () => {
  const doc = difficultCalls;
  const model = buildViewerModel(inspect(createSnapshot(doc)));
  const chart = generateMermaidFlowchart(doc.workflows[0], model);
  expect(chart).not.toContain('enabled');
  expect(chart).not.toContain('$statusCode');
  expect(chart).toContain('1 parameters');
  expect(chart).toContain('goto');
  expect(chart).toContain('retry source step');
  const docs = generateDocumentation(doc, { model }).markdown;
  expect(docs).toContain('$statusCode');
  expect(docs).toContain('enabled');
  await expect(mermaid.parse(chart)).resolves.toBeTruthy();
});
