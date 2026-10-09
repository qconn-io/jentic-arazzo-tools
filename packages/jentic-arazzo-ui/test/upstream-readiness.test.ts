import { createServer } from 'node:http';
import { it, expect } from 'vitest';
import { projectArazzo } from '../src/utils/contract/ArazzoAdapter';
import { SourceRegistry } from '../src/utils/source/SourceRegistry';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { buildSystemScene } from '../src/utils/systems/scene';
import { compareWorkflowRevisions } from '../src/utils/review';
import {
  consumerWorkflow,
  consumerCatalog,
  paymentContract,
  defaultActionReview,
  entryActorProfile,
} from './fixtures/upstream-readiness';

it('keeps denied Arazzo schema dependencies authored without alternate HTTP acquisition', async () => {
  let alternateHits = 0;
  const server = createServer((_request, response) => {
    alternateHits++;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ type: 'object', properties: { amount: { type: 'integer' } } }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture server port');
    const uri = `http://127.0.0.1:${address.port}/schema.json`;
    const denied: string[] = [];
    const registry = new SourceRegistry();
    registry.setProvider({
      async load(request) {
        denied.push(request.uri);
        throw new Error('Denied by fixture authority');
      },
    });
    const content = consumerWorkflow();
    content.workflows[1].inputs = { $ref: uri };
    const model = await projectArazzo(content, `${uri}/../flow.json`, registry);
    expect(alternateHits).toBe(0);
    expect(denied).toEqual([uri]);
    expect(model.document.workflows[1].inputs?.$ref).toBe(uri);
    expect(model.inspection.snapshot.diagnostics?.some((d) => /denied/i.test(d.message))).toBe(
      true,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it('keeps each unbound helper actor unknown across both expanded entry calls', () => {
  const model = buildViewerModel(inspect(createSnapshot(consumerWorkflow())));
  const profile = entryActorProfile();
  const collapsed = buildSystemScene(model, 'entry', profile, { document: 'fixture' });
  const scene = buildSystemScene(model, 'entry', profile, {
    document: 'fixture',
    expansion: Object.fromEntries(collapsed.rows.map((row) => [row.id, true])),
  });
  const captures = scene.rows.filter((row) => row.step?.stepId === 'capture');
  expect(captures.map((row) => row.path)).toEqual([
    [['entry', 'first-item']],
    [['entry', 'second-item']],
  ]);
  expect(captures.map((row) => row.from)).toEqual(['unknown:actor:helper', 'unknown:actor:helper']);
  expect(captures.map((row) => row.to)).toEqual(['payments', 'payments']);
});

it('does not make a literal Example.value a user of an otherwise unused schema', async () => {
  const baseline = consumerCatalog('complete', 'old');
  const candidate = consumerCatalog('complete', 'new');
  candidate.documents[1].content = paymentContract('integer');
  const result = await compareWorkflowRevisions(baseline, candidate);
  const finding = result.findings.find(
    (f) => f.before?.pointer === '#/components/schemas/Unused/type',
  );
  expect(finding).toBeDefined();
  expect(finding?.baselineImpact.direct).toEqual([]);
  expect(finding?.baselineImpact.paths).toEqual([]);
  expect(finding?.candidateImpact.direct).toEqual([]);
});

it('traces valid workflow failureActions to effective helper uses and both entry paths', async () => {
  const result = await compareWorkflowRevisions(
    defaultActionReview('old', 2),
    defaultActionReview('new', 3),
  );
  const finding = result.findings.find(
    (f) => f.before?.pointer === '#/components/failureActions/shared/retryLimit',
  );
  expect(finding).toBeDefined();
  expect(
    finding?.effects.filter((e) => e.side === 'baseline').map((e) => e.location.selection?.stepId),
  ).toEqual(['capture']);
  expect(finding?.baselineImpact.paths.map((p) => p.entry.workflowId)).toEqual(['entry', 'entry']);
  expect(
    finding?.baselineImpact.paths.map((p) => p.relationships[0].location.selection?.stepId),
  ).toEqual(['first-item', 'second-item']);
});
