// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import mermaid from 'mermaid';
import type { ArazzoDocument } from '../src/types/arazzo';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { generateDocumentation } from '../src/utils/documentation/docGenerator';
import { generateMermaidFlowchart } from '../src/utils/documentation/mermaidFlowchartGenerator';
import { generateMermaidSequence } from '../src/utils/documentation/mermaidGenerator';
import {
  asynchronous,
  parameterOverrides,
  provenance,
  scopedActions,
  unknownVersion,
  localPrerequisites,
  missingReferencesFirst,
  classifiedTargets,
  sharedFeatures10,
  sharedFeatures11,
  newerFieldsIn10,
} from './fixtures';

const document = (value: unknown) => value as ArazzoDocument;
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });

describe('shared-model documentation', () => {
  test('source links resolve relative to the retrieved workflow rather than the UI page', () => {
    const input = document({
      ...structuredClone(asynchronous),
      sourceDescriptions: [{ name: 'wallet', type: 'openapi', url: '../vendor/wallet.yaml' }],
    });
    const output = generateDocumentation(input, {
      documentURL: 'http://localhost:3000/openapi_samples/workflows/wallet.arazzo.yaml',
    });
    const container = globalThis.document.createElement('div');
    container.innerHTML = output.headerMarkdown;
    expect(container.querySelector('.source-card a')?.getAttribute('href')).toBe(
      'http://localhost:3000/openapi_samples/vendor/wallet.yaml',
    );
    expect(container.querySelector('.source-card a')?.textContent).toBe('../vendor/wallet.yaml');
  });
  test('effective actions apply channel/name/type policy once with original defaults retained', () => {
    const output = generateDocumentation(document(scopedActions));
    const step = output.workflows[0].steps[0];
    expect(step.onSuccess?.map((action) => ('name' in action ? action.name : undefined))).toEqual([
      'same',
      'default-end',
    ]);
    expect(
      step.onFailure?.map((action) => ('name' in action ? [action.name, action.type] : undefined)),
    ).toEqual([
      ['same', 'retry'],
      ['extra', 'goto'],
      ['same', 'goto'],
      ['default-end', 'end'],
    ]);
    expect(output.workflows[0].failureActions).toHaveLength(3);
    expect(output.markdown).toContain('Viewer inspection order');
  });
  test('prerequisites and call-step provenance retain owning workflow and scoped links', () => {
    const output = generateDocumentation(document(scopedActions));
    const call = output.workflows[0].steps[2];
    expect(
      call.prerequisites?.map((target) => [target.kind, target.workflowId, target.stepId]),
    ).toEqual([
      ['local', 'flowA', 'prepare'],
      ['local', 'flowB', 'init'],
    ]);
    expect(call.provenance?.occurrencePath).toContain('/workflows/0/steps/2');
    expect(output.workflowMarkdowns.get('flowA')).toContain('data-target-workflow-id="flowB"');
    expect(output.workflowMarkdowns.get('flowA')).toContain('data-target-step-id="init"');
    expect(output.workflows[1].steps[1].prerequisites?.[0].kind).toBe('missing');
  });
  test('reusable action parameter values retain property-presence overrides and definition immutability', () => {
    const input = document(parameterOverrides);
    const before = structuredClone(input);
    const output = generateDocumentation(input);
    const actions = output.workflows[0].steps[0].onFailure!;
    expect(
      actions.map((action) => ('parameters' in action ? action.parameters?.[0] : undefined)),
    ).toMatchObject([
      { value: 0 },
      { value: false },
      { value: '' },
      { value: null },
      { value: [0, false] },
      { value: { nested: { enabled: false } } },
      { value: '$inputs.token' },
      { value: { selector: '$response.body#/id' } },
      { value: 'component-default' },
    ]);
    expect(input).toEqual(before);
    expect(output.markdown).toContain('component-default');
    expect(output.markdown).toContain('false');
  });
  test('missing declaration warnings include declaration/use provenance and original zero value', () => {
    const output = generateDocumentation(document(missingReferencesFirst));
    const markdown = output.workflowMarkdowns.get('valid')!;
    expect(markdown).toContain('$components.parameters.absent');
    expect(markdown).toContain('&quot;value&quot;: 0');
    expect(markdown).toContain('declaration');
    expect(markdown).toContain('/components/failureActions/recover/parameters/0');
  });
  test('opaque unknown fields/extensions, identity and custom dialect remain visible with separate limits', () => {
    const output = generateDocumentation(document(provenance), {
      documentURL: 'https://retrieval.test/input.yaml',
    });
    expect(output.metadata.support).toMatchObject({
      declaredVersion: '1.1.0',
      semanticInspection: true,
    });
    expect(output.metadata.provenance).toMatchObject({
      retrievalURI: 'https://retrieval.test/input.yaml',
      self: provenance.$self,
    });
    for (const value of [
      'unknownRoot',
      'unknownSource',
      'unknownWorkflow',
      'unknownStep',
      'unknownAction',
      'unknownParameter',
      'x-schema',
      'https://dialects.example.test/custom',
      'authored-collision',
    ])
      expect(output.markdown).toContain(value);
    expect(output.headerMarkdown).toContain('execution');
  });
  test('parseable unknown profile has raw documentation with no guessed workflow semantics', () => {
    const output = generateDocumentation(document(unknownVersion));
    expect(output.workflows).toEqual([]);
    expect(output.metadata.support?.semanticInspection).toBe(false);
    expect(output.markdown).toContain('futureControl');
    expect(output.markdown).toContain('1.2.0');
    expect(
      generateMermaidSequence(document(unknownVersion).workflows[0], document(unknownVersion)),
    ).toBe('');
  });
  test('source details preserve channel-only receive intent and full querystring without HTTP assumptions', () => {
    const output = generateDocumentation(document(asynchronous));
    expect(output.workflows[0].steps[1].sourceBinding).toMatchObject({
      sourceName: 'events.a',
      sourceType: 'asyncapi',
      verification: 'unverified',
      action: 'receive',
      timeout: 0,
    });
    expect(output.markdown).toContain('q={$inputs.q}&amp;literal=a%26b&amp;empty=');
    expect(output.markdown).toContain('urn:vendor:operation:emit');
    expect(output.workflows[0].steps[4].sourceBinding?.verification).toBe('ambiguous');
  });
  test('authored HTML and delimiters are escaped in attributes and readable details', () => {
    const input = document({
      ...structuredClone(asynchronous),
      info: { title: '<script>alert(1)</script>', version: '"unsafe"' },
    });
    const markdown = generateDocumentation(input).markdown;
    expect(markdown).not.toContain('<script>');
    expect(markdown).toContain('&lt;script&gt;');
    expect(markdown).toContain('quoted &quot;[]|');
  });
});

describe('schematic Mermaid consumers', () => {
  test('workflow prerequisites, external and missing targets stay classified in docs and Mermaid', async () => {
    const input = document(sharedFeatures11);
    const model = buildViewerModel(inspect(createSnapshot(input)));
    const diagram = generateMermaidFlowchart(input.workflows[1], model);
    expect(diagram).toContain('WorkflowPrerequisite0 -.->|prerequisite| Start');
    await expect(mermaid.parse(diagram)).resolves.toBeTruthy();
    const external = document(classifiedTargets);
    const output = generateDocumentation(external);
    const html = globalThis.document.createElement('div');
    html.innerHTML = output.workflowMarkdowns.get('flowA')!;
    expect(Array.from(html.querySelectorAll('a')).map((anchor) => anchor.textContent)).toEqual([
      '$workflows.flowB.steps.init',
      '$workflows.dotted.workflow.steps.dotted.step',
    ]);
    expect(html.textContent).toContain('external source remote');
    expect(html.textContent).toContain('missing');
    const externalDiagram = generateMermaidFlowchart(
      external.workflows[0],
      buildViewerModel(inspect(createSnapshot(external))),
    );
    expect(externalDiagram).toContain('external-step');
    expect(externalDiagram).toContain('prerequisite missing');
    await expect(mermaid.parse(externalDiagram)).resolves.toBeTruthy();
  });
  test('unsupported profiles suppress flowcharts and older profiles never backport async/prerequisite semantics', () => {
    const unknown = document(unknownVersion);
    const unknownModel = buildViewerModel(inspect(createSnapshot(unknown)));
    expect(generateMermaidFlowchart(unknown.workflows[0], unknownModel)).toBe('');
    const older = document(newerFieldsIn10);
    const model = buildViewerModel(inspect(createSnapshot(older)));
    const sequence = generateMermaidSequence(older.workflows[0], older, model);
    expect(sequence).not.toContain('->>Client');
    expect(generateMermaidFlowchart(older.workflows[0], model)).not.toContain('prerequisite|');
    expect(generateDocumentation(older, { model }).markdown).toContain('dependsOn');
  });
  test('a synthetic future model using existing fact kinds feeds unchanged documentation and Mermaid consumers', async () => {
    const input = document(sharedFeatures11);
    const known = inspect(createSnapshot(input));
    const future = {
      ...known,
      profileId: 'future-test',
      support: { ...known.support, profile: 'future-test' },
    };
    const model = buildViewerModel(future);
    expect(
      generateDocumentation(input, { model }).workflows.map((workflow) => workflow.workflowId),
    ).toEqual(['authWorkflow', 'orderWorkflow']);
    await expect(
      mermaid.parse(generateMermaidFlowchart(input.workflows[1], model)),
    ).resolves.toBeTruthy();
    await expect(
      mermaid.parse(generateMermaidSequence(input.workflows[0], input, model)),
    ).resolves.toBeTruthy();
    const shared10 = generateDocumentation(document(sharedFeatures10));
    const shared11 = generateDocumentation(input);
    expect(
      shared10.workflows.map((workflow) => workflow.steps.map((step) => step.onFailure)),
    ).toEqual(shared11.workflows.map((workflow) => workflow.steps.map((step) => step.onFailure)));
  });
  test('sequence preserves authored send/receive, ambiguous source and all effective actions without predictions', async () => {
    const input = document(asynchronous);
    const sequence = generateMermaidSequence(input.workflows[0], input);
    expect(sequence).toContain('P0->>P1');
    expect(sequence).toContain('P2->>P0');
    expect(sequence).toContain('Ambiguous destination');
    const metadata = generateDocumentation(input).markdown;
    expect(metadata).toContain('correlation');
    expect(metadata).toContain('timeout');
    expect(sequence).not.toContain('Response');
    expect(sequence).not.toContain('->>+');
    expect(sequence).not.toContain('✓');
    await expect(mermaid.parse(sequence)).resolves.toBeTruthy();
    const actions = generateMermaidSequence(
      document(scopedActions).workflows[0],
      document(scopedActions),
    );
    const actionDocs = generateDocumentation(document(scopedActions)).markdown;
    expect(actionDocs).toContain('Viewer inspection order');
    expect(actionDocs).toContain('default-end');
    expect(actions).toContain('extra');
    await expect(mermaid.parse(actions)).resolves.toBeTruthy();
  });
  test('flowchart preserves all action transitions, one-way goto and retry source return', async () => {
    const input = document({
      ...structuredClone(scopedActions),
      workflows: [
        {
          workflowId: 'test',
          steps: [
            {
              stepId: 'init',
              operationId: 'go',
              onSuccess: [{ name: 'transfer', type: 'goto', workflowId: 'flowB' }],
              onFailure: [
                { name: 'recovery', type: 'retry', workflowId: 'flowB' },
                { name: 'another', type: 'goto', workflowId: 'flowC' },
              ],
            },
            { stepId: 'next', operationId: 'next' },
          ],
        },
        ...structuredClone(scopedActions.workflows.slice(1)),
      ],
    });
    const flowchart = generateMermaidFlowchart(
      input.workflows[0],
      buildViewerModel(inspect(createSnapshot(input))),
    );
    expect(flowchart).toContain('transfer');
    expect(flowchart).toContain('recovery');
    expect(flowchart).toContain('another');
    expect(flowchart).toContain('Action0_1_0 -->|retry source step| Step0');
    expect(flowchart).not.toMatch(/Action0_0_0 -->/);
    await expect(mermaid.parse(flowchart)).resolves.toBeTruthy();
  });
  test('prerequisites retain authored order and safe IDs/labels parse with punctuation and newlines', async () => {
    const flowchart = generateMermaidFlowchart(document(localPrerequisites).workflows[0]);
    expect(flowchart).toContain('Step1 -.->|prerequisite| Step0');
    expect(flowchart).toContain('Step2 -.->|prerequisite| Step0');
    expect(flowchart).toContain('Step0 --> Step1');
    await expect(mermaid.parse(flowchart)).resolves.toBeTruthy();
    await expect(
      mermaid.parse(generateMermaidFlowchart(document(asynchronous).workflows[0])),
    ).resolves.toBeTruthy();
  });
});
