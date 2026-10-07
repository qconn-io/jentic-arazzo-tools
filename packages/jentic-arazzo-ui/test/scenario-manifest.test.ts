import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { normalizeScenarioManifest, resolveScenarioWaypoint } from '../src/utils/scenario/manifest';
import { inspect } from '../src/utils/inspection';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { nestedCalls } from './fixtures/connected';
const base = 'https://example.test/pack/scenarios.json';
const legacy = JSON.parse(
  readFileSync(new URL('./fixtures/legacy-scenarios.json', import.meta.url), 'utf8'),
);
test('preserves every legacy id, expectation and evidence and resolves relative documents', () => {
  const result = normalizeScenarioManifest(legacy, base);
  expect(result.manifest?.scenarios).toHaveLength(27);
  for (const [i, entry] of legacy.entries()) {
    expect(result.manifest?.scenarios[i]).toMatchObject({
      id: entry.id,
      expected: entry.expected,
      evidence: entry.evidence,
      document: new URL(entry.document, base).href,
    });
  }
});
test('localizes invalid scenarios and duplicate ids without hiding valid guides', () => {
  const result = normalizeScenarioManifest(
    [{ ...legacy[0], id: 'good' }, legacy[1], legacy[1], { ...legacy[2], expected: 3 }],
    base,
  );
  expect(result.manifest?.scenarios.map((s) => s.id)).toEqual(['good']);
  expect(result.diagnostics.join(' ')).toMatch(/duplicate/i);
});
test('enforces bounds and manifest version with visible explanations', () => {
  expect(
    normalizeScenarioManifest({ version: 2, scenarios: [] }, base).diagnostics.join(' '),
  ).toMatch(/version/i);
  const entries = Array.from({ length: 501 }, (_, i) => ({ ...legacy[0], id: String(i) }));
  expect(normalizeScenarioManifest(entries, base).manifest?.scenarios).toHaveLength(500);
  expect(normalizeScenarioManifest(entries, base).diagnostics.join(' ')).toContain('500');
});
test('retains prose-only guides and rejects relative references with no explicit base', () => {
  expect(normalizeScenarioManifest([legacy[0]]).diagnostics.join(' ')).toMatch(/base/i);
  expect(normalizeScenarioManifest([legacy[0]], base).manifest?.scenarios[0].waypoints).toEqual([]);
});
test('restores occurrence and focus exactly, localizing stale steps and missing documents', async () => {
  const loaded = await loadDocument(nestedCalls);
  const model = buildViewerModel(inspect(loaded.snapshot));
  const location = {
    version: 1 as const,
    document: 'host:doc',
    root: 'checkout',
    view: 'docs' as const,
    subview: 'sequence' as const,
    selection: {
      kind: 'step' as const,
      workflowId: 'payment',
      stepId: 'charge',
      occurrence: [{ workflowId: 'checkout', stepId: 'secondPayment' }],
    },
  };
  const waypoint = {
    id: 'charge',
    narrative: 'Inspect the second mapping.',
    location,
    focus: { kind: 'parameter' as const, pointer: '/workflows/0/steps/2/parameters/0' },
  };
  const good = resolveScenarioWaypoint(model, loaded.snapshot.authoredDocument, waypoint, {
    document: 'host:doc',
  });
  expect(good.status.state).toBe('restored');
  expect(good.focusValue).toBeDefined();
  expect(
    resolveScenarioWaypoint(
      model,
      loaded.snapshot.authoredDocument,
      { ...waypoint, location: { ...location, document: 'host:missing' } },
      { document: 'host:doc' },
    ).status.state,
  ).toBe('document-request');
  expect(
    resolveScenarioWaypoint(
      model,
      loaded.snapshot.authoredDocument,
      {
        ...waypoint,
        location: { ...location, selection: { ...location.selection, stepId: 'removed' } },
      },
      { document: 'host:doc' },
    ).status.state,
  ).toBe('stale');
  expect(
    resolveScenarioWaypoint(
      model,
      loaded.snapshot.authoredDocument,
      { ...waypoint, focus: { ...waypoint.focus, pointer: '/removed' } },
      { document: 'host:doc' },
    ).status.state,
  ).toBe('stale');
});
test('localizes invalid action addresses, duplicate waypoint IDs and bounded waypoint lists', async () => {
  const loaded = await loadDocument(nestedCalls);
  const model = buildViewerModel(inspect(loaded.snapshot));
  const location = {
    version: 1 as const,
    document: 'host:doc',
    root: 'payment',
    view: 'docs' as const,
    subview: 'sequence' as const,
    selection: {
      kind: 'action' as const,
      workflowId: 'payment',
      stepId: 'charge',
      action: {
        document: 'host:doc',
        pointer: '/removed/action',
        usePointer: '/removed/action',
        channel: 'onFailure' as const,
        index: 0,
      },
    },
  };
  expect(
    resolveScenarioWaypoint(
      model,
      loaded.snapshot.authoredDocument,
      { id: 'missing-action', narrative: 'Missing.', location },
      { document: 'host:doc' },
    ).status.state,
  ).toBe('stale');
  const point = {
    id: 'one',
    narrative: 'Authored.',
    location: { ...location, selection: undefined },
  };
  const entry = {
    ...legacy[0],
    document: 'host:doc',
    waypoints: [point, point, { ...point, id: 'two' }],
  };
  const result = normalizeScenarioManifest([entry]);
  expect(result.manifest?.scenarios[0].waypoints?.map((w) => w.id)).toEqual(['two']);
  expect(result.diagnostics.join(' ')).toMatch(/Duplicate waypoint/);
  const bounded = normalizeScenarioManifest([
    { ...entry, waypoints: Array.from({ length: 101 }, (_, i) => ({ ...point, id: String(i) })) },
  ]);
  expect(bounded.manifest?.scenarios[0].waypoints).toHaveLength(100);
  expect(bounded.diagnostics.join(' ')).toContain('100');
});
test('a focus must match its semantic kind and scoped selected step', async () => {
  const loaded = await loadDocument(nestedCalls);
  const model = buildViewerModel(inspect(loaded.snapshot));
  const point = {
    id: 'wrong',
    narrative: 'Misaddressed.',
    location: {
      version: 1 as const,
      document: 'host:doc',
      root: 'payment',
      view: 'docs' as const,
      subview: 'docs' as const,
      selection: { kind: 'step' as const, workflowId: 'payment', stepId: 'charge' },
    },
    focus: { kind: 'criterion' as const, pointer: '/workflows/0/steps/1/parameters/0' },
  };
  expect(
    resolveScenarioWaypoint(model, loaded.snapshot.authoredDocument, point, {
      document: 'host:doc',
    }).status.state,
  ).toBe('stale');
});
