import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { digitalProductProfile } from '../src/utils/systems/digitalProductProfile';
import { buildSystemScene, mappingOverlay } from '../src/utils/systems/scene';

it('nests descriptive implementation without inventing a second client purchase', async () => {
  const loaded = await loadDocument(
    readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8'),
  );
  const model = buildViewerModel(inspect(loaded.snapshot));
  const profile = digitalProductProfile(loaded.document, 'small');
  const scene = buildSystemScene(model, 'client-journey', profile, { document: 'small' });
  expect(scene.participants).toHaveLength(5);
  expect(
    scene.rows.filter((r) => r.step?.stepId === 'purchase' && r.kind === 'exchange'),
  ).toHaveLength(1);
  expect(
    scene.rows.some(
      (r) => r.kind === 'implementation' && r.association?.workflowId === 'fulfil-purchase',
    ),
  ).toBe(true);
  const call = scene.rows.find((r) => r.step?.stepId === 'reserve-and-pay')!;
  expect(call.kind).toBe('call');
  expect(scene.participants.some((p) => p.id === 'reserve-and-capture')).toBe(false);
  const expanded = buildSystemScene(model, 'client-journey', profile, {
    document: 'small',
    expansion: { [call.id]: true },
  });
  expect(expanded.rows.find((r) => r.step?.stepId === 'capture-payment')?.from).toBe('coordinator');
  expect(
    buildSystemScene(model, 'client-journey', undefined, { document: 'small' }).rows.some(
      (r) => r.kind === 'implementation',
    ),
  ).toBe(false);
});
it('bounds descriptive recursion and preserves operations with unknown associations', () => {
  const doc = {
    arazzo: '1.0.1',
    info: { title: 'T', version: '1' },
    sourceDescriptions: [{ name: 'api', type: 'openapi', url: 'https://test/api' }],
    workflows: [
      { workflowId: 'w', steps: [{ stepId: 'a', operationId: '$sourceDescriptions.api.a' }] },
    ],
  };
  const model = buildViewerModel(inspect(createSnapshot(doc)));
  const provenance = { kind: 'host' as const, description: 'test' };
  const profile = {
    version: 1 as const,
    document: 'test',
    participants: [],
    actors: [],
    sourceOwners: [],
    implementations: [
      { id: 'recursive', exchange: { workflowId: 'w', stepId: 'a' }, workflowId: 'w', provenance },
    ],
    events: [],
  };
  const scene = buildSystemScene(model, 'w', profile, { document: 'test' });
  expect(scene.bounded).toBe(true);
  expect(scene.rows.some((r) => r.reason === 'recursion')).toBe(true);
  expect(scene.rows.filter((r) => r.kind === 'exchange').length).toBeGreaterThan(0);
  expect(scene.participants.some((p) => p.name.includes('Unknown'))).toBe(true);
});
it('keeps second-item caller mappings and opaque expressions exact', async () => {
  const loaded = await loadDocument(
    readFileSync('public/examples/digital-product-stress/arazzo.yaml', 'utf8'),
  );
  const model = buildViewerModel(inspect(loaded.snapshot));
  let scene = buildSystemScene(model, 'batch-fulfilment', undefined, { document: 'stress' });
  const second = scene.rows.find((r) => r.step?.stepId === 'second-item')!;
  scene = buildSystemScene(model, 'batch-fulfilment', undefined, {
    document: 'stress',
    expansion: { [second.id]: true },
  });
  const secondRow = scene.rows.find(
    (r) => r.step?.stepId !== 'second-item' && r.path[0]?.[1] === 'second-item',
  )!;
  expect(JSON.stringify(mappingOverlay(model, secondRow))).toContain('2499');
  expect(JSON.stringify(mappingOverlay(model, secondRow))).not.toContain('1299');
});

it('retains a bounded row marker and terminates an eight-level descriptive chain', () => {
  const provenance = { kind: 'host' as const, description: 'fixture' };
  const workflows = Array.from({ length: 11 }, (_, i) => ({
    workflowId: `w${i}`,
    steps: [{ stepId: 'a', operationId: '$sourceDescriptions.api.a' }],
  }));
  const doc = {
    arazzo: '1.0.1',
    info: { title: 'T', version: '1' },
    sourceDescriptions: [{ name: 'api', type: 'openapi', url: 'https://test/api' }],
    workflows,
  };
  const profile = {
    version: 1 as const,
    document: 'test',
    participants: [],
    actors: [],
    sourceOwners: [],
    implementations: workflows.slice(0, -1).map((w, i) => ({
      id: `i${i}`,
      exchange: { workflowId: w.workflowId, stepId: 'a' },
      workflowId: `w${i + 1}`,
      provenance,
    })),
    events: [],
  };
  const depth = buildSystemScene(buildViewerModel(inspect(createSnapshot(doc))), 'w0', profile, {
    document: 'test',
  });
  expect(depth.rows.some((r) => r.reason === 'depth')).toBe(true);
  const longDoc = {
    ...doc,
    workflows: [
      {
        workflowId: 'w',
        steps: Array.from({ length: 205 }, (_, i) => ({
          stepId: `s${i}`,
          operationId: '$sourceDescriptions.api.a',
        })),
      },
    ],
  };
  const rows = buildSystemScene(
    buildViewerModel(inspect(createSnapshot(longDoc))),
    'w',
    undefined,
    { document: 'test' },
  );
  expect(rows.rows).toHaveLength(200);
  expect(rows.rows.at(-1)?.reason).toBe('rows');
  expect(rows.bounded).toBe(true);
});
it('descriptive descendants distinguish repeated callers', () => {
  const doc = {
    arazzo: '1.0.1',
    info: { title: 't', version: '1' },
    sourceDescriptions: [{ name: 'api', type: 'openapi', url: 'https://test/api' }],
    workflows: [
      {
        workflowId: 'root',
        steps: [
          {
            stepId: 'first',
            workflowId: 'wrapper',
            parameters: [{ name: 'amount', in: 'path', value: 1299 }],
          },
          {
            stepId: 'second',
            workflowId: 'wrapper',
            parameters: [{ name: 'amount', in: 'path', value: 2499 }],
          },
        ],
      },
      {
        workflowId: 'wrapper',
        steps: [{ stepId: 'op', operationId: '$sourceDescriptions.api.purchase' }],
      },
      {
        workflowId: 'impl',
        steps: [{ stepId: 'child', operationId: '$sourceDescriptions.api.capture' }],
      },
    ],
  };
  const model = buildViewerModel(inspect(createSnapshot(doc)));
  const profile = {
    version: 1 as const,
    document: 'd',
    participants: [],
    actors: [],
    sourceOwners: [],
    events: [],
    implementations: [
      {
        id: 'impl',
        exchange: { workflowId: 'wrapper', stepId: 'op' },
        workflowId: 'impl',
        provenance: { kind: 'host' as const, description: 'explicit' },
      },
    ],
  };
  const base = buildSystemScene(model, 'root', profile, { document: 'd' });
  const expansion = Object.fromEntries(base.rows.map((r) => [r.id, true]));
  const scene = buildSystemScene(model, 'root', profile, { document: 'd', expansion });
  const children = scene.rows.filter((r) => r.workflowId === 'impl');
  expect(JSON.stringify(mappingOverlay(model, children[0]))).toContain('1299');
  expect(JSON.stringify(mappingOverlay(model, children[1]))).toContain('2499');
  expect(JSON.stringify(mappingOverlay(model, children[1]))).not.toContain('1299');
  expect(new Set(children.map((r) => r.id)).size).toBe(2);
});

it('links only declared unique outputs and retains opaque expressions exactly', () => {
  const doc = {
    arazzo: '1.0.1',
    info: { title: 'T', version: '1' },
    sourceDescriptions: [{ name: 'api', type: 'openapi', url: 'https://test/api' }],
    workflows: [
      {
        workflowId: 'w',
        steps: [
          {
            stepId: 'a',
            operationId: '$sourceDescriptions.api.a',
            outputs: { good: '$response.body#/value' },
          },
          {
            stepId: 'b',
            operationId: '$sourceDescriptions.api.b',
            parameters: [
              { name: 'known', in: 'query', value: '$steps.a.outputs.good' },
              { name: 'missing', in: 'query', value: '$steps.a.outputs.absent' },
              { name: 'opaque', in: 'query', value: 'Bearer {$steps.a.outputs.good}' },
            ],
          },
        ],
      },
    ],
  };
  const model = buildViewerModel(inspect(createSnapshot(doc)));
  const row = buildSystemScene(model, 'w', undefined, { document: 'd' }).rows.find(
    (r) => r.step?.stepId === 'b',
  )!;
  const entries = mappingOverlay(model, row);
  expect(entries.find((e) => e.value === '$steps.a.outputs.good')?.producer).toMatchObject({
    workflowId: 'w',
    stepId: 'a',
    path: [],
  });
  expect(entries.find((e) => e.value === '$steps.a.outputs.absent')?.producer).toBeUndefined();
  expect(
    entries.find((e) => e.value === 'Bearer {$steps.a.outputs.good}')?.producer,
  ).toBeUndefined();
});
