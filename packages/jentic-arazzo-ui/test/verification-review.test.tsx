// @vitest-environment jsdom
import React from 'react';
import { describe, expect, test } from 'vitest';
import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { toValue } from '@speclynx/apidom-core';
import type { ArazzoDocument } from '../src/types/arazzo';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { convertWorkflowToFlow } from '../src/utils/conversion/arazzoToFlow';
import { applySequentialLayout } from '../src/utils/sequentialLayout';
import { generateDocumentation } from '../src/utils/documentation/docGenerator';
import { generateMermaidFlowchart } from '../src/utils/documentation/mermaidFlowchartGenerator';

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
const document = (): ArazzoDocument => ({
  arazzo: '1.1.0',
  info: { title: 'Review regressions', version: '1' },
  sourceDescriptions: [{ name: 'remote', type: 'arazzo', url: 'https://example.test/remote' }],
  workflows: [
    {
      workflowId: 'a',
      steps: [
        { stepId: 'failed', operationId: 'opaque' },
        { stepId: 'repair', operationId: 'repair' },
      ],
    },
    { workflowId: 'b', steps: [{ stepId: 'y', operationId: 'opaque' }] },
  ],
});

describe('verification review regressions', () => {
  test.each(['1.0.1', '1.1.0'])(
    'W1: action-step targets remain in their owner while prerequisites cross workflows (%s)',
    (version) => {
      const input = document();
      input.arazzo = version;
      input.workflows[0].steps[0].dependsOn = ['$workflows.b.steps.y'];
      input.workflows[0].steps[0].onFailure = [
        { name: 'cross', type: 'retry', stepId: '$workflows.b.steps.y' },
        { name: 'external', type: 'goto', stepId: '$sourceDescriptions.remote.b.steps.y' },
        { name: 'invalid', type: 'goto', stepId: '$inputs.destination' },
        { name: 'own', type: 'goto', stepId: 'repair' },
      ];
      const model = buildViewerModel(inspect(createSnapshot(input)));
      const step = model.workflows[0].steps[0];
      expect(step.actions.onFailure.slice(0, 3).map((action) => action.status)).toEqual([
        'unsupported',
        'unsupported',
        'unsupported',
      ]);
      expect(
        step.actions.onFailure
          .slice(0, 3)
          .every((action) => !action.target?.navigable && action.diagnostics.length > 0),
      ).toBe(true);
      expect(step.actions.onFailure[0].authored.stepId).toBe('$workflows.b.steps.y');
      expect(step.actions.onFailure[3].target).toMatchObject({
        kind: 'local-step',
        workflowId: 'a',
        stepId: 'repair',
      });
      expect(model.relationships.filter((relationship) => relationship.kind === 'action')).toEqual(
        [],
      );
      if (version === '1.1.0')
        expect(step.prerequisites[0].target).toMatchObject({
          kind: 'local-step',
          workflowId: 'b',
          stepId: 'y',
        });
    },
  );

  test.each(['native', 'bypassed', 'supplied'])(
    'W2: lossless reusable occurrence fields survive %s inspection and documentation',
    async (mode) => {
      const input = {
        ...document(),
        components: {
          parameters: { p: { name: 'p', value: 'default', 'x-definition': true } },
          failureActions: {
            recovery: {
              name: 'recovery',
              type: 'retry',
              workflowId: 'b',
              'x-definition': true,
              parameters: [
                { reference: '$components.parameters.p', value: false, 'x-nested-use': 'keep' },
              ],
            },
          },
        },
      };
      Object.assign(input.workflows[0].steps[0], {
        parameters: [
          { reference: '$components.parameters.p', value: 0, 'x-use': 'keep', futureField: false },
        ],
        onFailure: [
          { reference: '$components.failureActions.recovery', 'x-use': 'keep', futureField: false },
        ],
      });
      const before = structuredClone(input);
      const loaded =
        mode === 'supplied'
          ? undefined
          : await loadDocument(
              input,
              mode === 'native' ? { baseURI: 'https://example.test/local' } : {},
            );
      const snapshot = loaded?.snapshot ?? createSnapshot(input);
      const expected = {
        name: 'p',
        value: 0,
        'x-definition': true,
        'x-use': 'keep',
        futureField: false,
      };
      if (mode === 'native') {
        expect(loaded!.document.workflows[0].steps[0].parameters![0]).toMatchObject(expected);
        expect(toValue(snapshot.restored.api)).toEqual(loaded!.document);
      }
      const model = buildViewerModel(inspect(snapshot));
      const step = model.workflows[0].steps[0];
      expect(step.parameters[0].value).toMatchObject(expected);
      expect(step.parameters[0].declarationPath).toEqual(['components', 'parameters', 'p']);
      expect(step.actions.onFailure[0].declarationPath).toEqual([
        'components',
        'failureActions',
        'recovery',
      ]);
      if (mode === 'native')
        expect(step.parameters[0].value).toEqual(
          loaded!.document.workflows[0].steps[0].parameters![0],
        );
      expect(step.actions.onFailure[0].value).toMatchObject({
        name: 'recovery',
        'x-definition': true,
        'x-use': 'keep',
        futureField: false,
      });
      expect(step.actions.onFailure[0].parameters[0].value).toMatchObject({
        name: 'p',
        value: false,
        'x-nested-use': 'keep',
        'x-definition': true,
      });
      const docs = generateDocumentation(snapshot.document, { model });
      expect(docs.workflows[0].steps[0].parameters![0]).toMatchObject(expected);
      expect(docs.workflows[0].steps[0].onFailure![0]).toMatchObject({
        'x-use': 'keep',
        futureField: false,
      });
      expect(step.parameters[0].authored).toEqual(before.workflows[0].steps[0].parameters![0]);
      expect(input).toEqual(before);
    },
  );

  test.each([
    ['local workflow', { workflowId: 'b' }, true],
    ['external workflow', { workflowId: '$sourceDescriptions.remote.recover' }, true],
    ['local step', { stepId: 'repair' }, true],
    ['self retry', { stepId: 'failed' }, false],
    ['implicit self retry', {}, false],
    ['missing workflow', { workflowId: 'absent' }, false],
  ] as const)(
    'W3: interactive and Mermaid retry return parity for %s',
    async (_name, locator, returns) => {
      const input = document();
      input.workflows[0].steps[0].onFailure = [{ name: 'recovery', type: 'retry', ...locator }];
      const model = buildViewerModel(inspect(createSnapshot(input)));
      const converted = convertWorkflowToFlow(input.workflows[0], undefined, input, model);
      const flow = applySequentialLayout(converted.nodes, converted.edges);
      const outbound = flow.edges.find((edge) => edge.label === 'recovery');
      const back = flow.edges.filter((edge) => edge.label === 'Retry return');
      expect(back).toHaveLength(returns ? 1 : 0);
      if (returns) {
        expect(back[0].source).toBe(outbound!.target);
        expect(back[0].target).toBe(model.workflows[0].steps[0].nodeId);
        expect(back[0].sourceHandle).toBe('stepId' in locator ? 'sequential' : 'return');
      }
      const chart = generateMermaidFlowchart(input.workflows[0], model);
      expect(chart.includes('|retry source step|')).toBe(returns);
      await expect(mermaid.parse(chart)).resolves.toBeTruthy();
    },
  );

  test.each(['b', '$sourceDescriptions.remote.recover'])(
    'W3: call returns to the next step and goto remains one-way (%s)',
    async (workflowId) => {
      const input = document();
      input.workflows[0].steps[0] = {
        stepId: 'failed',
        workflowId,
        onSuccess: [{ name: 'jump', type: 'goto', workflowId }],
      };
      const model = buildViewerModel(inspect(createSnapshot(input)));
      const flow = convertWorkflowToFlow(input.workflows[0], undefined, input, model);
      const call = flow.edges.find((edge) => edge.label === 'Call')!;
      expect(flow.edges.filter((edge) => edge.label === 'Call return')).toEqual([
        expect.objectContaining({
          source: call.target,
          target: model.workflows[0].steps[1].nodeId,
        }),
      ]);
      expect(flow.edges.some((edge) => edge.label === 'Goto return')).toBe(false);
      const chart = generateMermaidFlowchart(input.workflows[0], model);
      expect(chart).toContain('Call0 -->|call return| Step1');
      expect(chart).not.toMatch(/Action0_0_0 -->/);
      await expect(mermaid.parse(chart)).resolves.toBeTruthy();
    },
  );

  test('W4: Mermaid retains complete querystring, structured/falsy and unresolved step parameters', async () => {
    const input = document();
    input.workflows[0].steps[0].parameters = [
      { name: 'query', in: 'querystring', value: 'q={$inputs.q}&literal=a%26b&empty=' },
      {
        name: 'structured',
        value: { zero: 0, disabled: false, empty: '', list: ['a|b', '<tag>'] },
      },
      { reference: '$components.parameters.absent', value: null },
    ];
    const chart = generateMermaidFlowchart(
      input.workflows[0],
      buildViewerModel(inspect(createSnapshot(input))),
    );
    const metadata = generateDocumentation(input).markdown;
    expect(chart).toContain('3 parameters');
    expect(chart).not.toContain('literal=a%26b');
    expect(metadata).toContain('querystring');
    expect(metadata).toContain('q={$inputs.q}&amp;literal=a%26b&amp;empty=');
    expect(metadata).toContain('&quot;zero&quot;: 0');
    expect(metadata).toContain('&quot;disabled&quot;: false');
    expect(metadata).toContain('&quot;empty&quot;: &quot;&quot;');
    expect(metadata).toContain('a|b');
    expect(metadata).toContain('&lt;tag&gt;');
    expect(metadata).toContain('$components.parameters.absent');
    expect(metadata).toContain('null');
    expect(metadata).toContain('unresolved');
    await expect(mermaid.parse(chart)).resolves.toBeTruthy();
  });

  test('W5: document descriptions render CommonMark links, emphasis and multiple paragraphs safely', () => {
    const input = document();
    input.info.description =
      'See [API docs](https://example.test) and **important** details.\n\nSecond paragraph with *emphasis* and <img src="x" onerror="alert(1)">.';
    input.info.title = '<img src="x" onerror="alert(2)">';
    const { container, getByRole, getByText } = render(
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
        {generateDocumentation(input).headerMarkdown}
      </ReactMarkdown>,
    );
    expect(getByRole('link', { name: 'API docs' }).getAttribute('href')).toBe(
      'https://example.test',
    );
    expect(getByText('important').tagName).toBe('STRONG');
    expect(getByText('emphasis').tagName).toBe('EM');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelectorAll('p').length).toBeGreaterThanOrEqual(2);
  });
  test('W5: CommonMark autolinks and literal angle brackets in inline and fenced code survive escaping', () => {
    const input = document();
    input.info.description =
      '<https://example.test>\n\nUse `<tag>` safely.\n\n```xml\n<entry>&value</entry>\n```';
    const { container, getByRole } = render(
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
        {generateDocumentation(input).headerMarkdown}
      </ReactMarkdown>,
    );
    expect(getByRole('link', { name: 'https://example.test' }).getAttribute('href')).toBe(
      'https://example.test',
    );
    expect([...container.querySelectorAll('code')].map((code) => code.textContent)).toEqual([
      '<tag>',
      '<entry>&value</entry>\n',
    ]);
  });
});
