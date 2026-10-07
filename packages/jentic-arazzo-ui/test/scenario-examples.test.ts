import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { normalizeScenarioManifest, resolveScenarioWaypoint } from '../src/utils/scenario/manifest';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
const root = new URL('../public/examples/', import.meta.url);
const stress = JSON.parse(
  readFileSync(new URL('digital-product-stress/scenarios.json', root), 'utf8'),
);
const legacy = JSON.parse(
  readFileSync(new URL('./fixtures/legacy-scenarios.json', import.meta.url), 'utf8'),
);
test('stress annotations preserve all original identities, expectations and evidence', () => {
  expect(
    stress.map(({ id, document, workflow, expected, evidence }: any) => ({
      id,
      document,
      workflow,
      expected,
      evidence,
    })),
  ).toEqual(legacy);
});
for (const [pack, count] of [
  ['digital-product-stress', 27],
  ['digital-product', 7],
] as const) {
  test(`${pack}: every authored waypoint resolves exactly or reaches its intentional display boundary`, async () => {
    const base = new URL(`${pack}/scenarios.json`, root);
    const result = normalizeScenarioManifest(JSON.parse(readFileSync(base, 'utf8')), base.href);
    expect(result.diagnostics).toEqual([]);
    expect(result.manifest?.scenarios).toHaveLength(count);
    const cache = new Map();
    for (const scenario of result.manifest!.scenarios) {
      expect(scenario.waypoints?.length, scenario.id).toBeGreaterThan(0);
      for (const point of scenario.waypoints!) {
        const uri = point.location.document;
        if (!cache.has(uri)) {
          const loaded = await loadDocument(readFileSync(new URL(uri), 'utf8'), { baseURI: uri });
          cache.set(uri, { loaded, model: buildViewerModel(inspect(loaded.snapshot)) });
        }
        const { loaded, model } = cache.get(uri);
        const resolved = resolveScenarioWaypoint(model, loaded.snapshot.authoredDocument, point, {
          document: uri,
        });
        expect(
          ['restored', 'bounded'],
          `${scenario.id}/${point.id}: ${resolved.status.message}`,
        ).toContain(resolved.status.state);
        expect(resolved.row?.workflowId).toBe(point.location.selection?.workflowId);
        expect(resolved.row?.step?.stepId).toBe(point.location.selection?.stepId);
        if (point.focus) expect(resolved.focusValue, `${scenario.id}/${point.id}`).toBeDefined();
        if (point.location.selection?.kind === 'action')
          expect(resolved.row?.action?.value.name).toBe(point.location.selection.action.name);
        if (scenario.id === 'depth-budget' && point.location.selection?.occurrence)
          expect(resolved.scene?.rows.some((r: any) => r.reason === 'depth')).toBe(true);
        if (
          ['recursive-call', 'row-budget'].includes(scenario.id) &&
          point.location.selection?.occurrence !== undefined
        )
          expect(resolved.status.state, scenario.id + '/' + point.id).toBe('bounded');
      }
    }
  });
}
test('recovery guides retain explicit alternatives and evidence without claiming execution', () => {
  const byId = new Map(stress.map((s: any) => [s.id, s]));
  const unknown: any = byId.get('capture-uncertain-then-confirmed');
  expect(unknown.waypoints.map((p: any) => p.location.root)).toContain('reconcile-payment');
  expect(unknown.waypoints.map((p: any) => p.narrative).join(' ')).toContain('CAPTURED');
  const timeout: any = byId.get('completion-timeout');
  expect(timeout.waypoints.map((p: any) => p.location.selection.stepId)).not.toContain(
    'publish-command',
  );
  expect(timeout.waypoints.map((p: any) => p.narrative).join(' ')).toContain('12 seconds');
  const audit: any = byId.get('failed-device-activation');
  expect(audit.waypoints.map((p: any) => p.narrative).join(' ')).toContain('RECORDED');
  expect(audit.waypoints.map((p: any) => p.narrative).join(' ')).toContain('FAILED');
});
