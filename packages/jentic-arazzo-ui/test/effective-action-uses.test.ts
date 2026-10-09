import { expect, it } from 'vitest';
import type { ArazzoDocument } from '../src/types/arazzo';
import type { WorkflowReviewSnapshot } from '../src/types/review';
import { loadCatalog } from '../src/utils/catalog/load';
import { buildCatalogIndex } from '../src/utils/catalog';
import { compareWorkflowRevisions, exportWorkflowReview } from '../src/utils/review';
import { prepareWorkflowReview } from '../src/utils/review/inputs';
import { resolveLocation } from '../src/utils/location/resolve';
import { effectiveUseLocation } from '../src/utils/model/effectiveUses';

function workflow(limit = 2): ArazzoDocument {
  return {
    arazzo: '1.0.1',
    info: { title: 'Effective inspection', version: '1' },
    sourceDescriptions: [],
    components: {
      failureActions: {
        shared: { name: 'recover', type: 'retry', retryLimit: limit },
        explicit: { name: 'stop', type: 'end' },
        unused: { name: 'unused', type: 'retry', retryLimit: limit },
      },
      successActions: { shared: { name: 'done', type: 'goto', workflowId: 'followup' } },
    },
    workflows: [
      {
        workflowId: 'entry',
        steps: [
          { stepId: 'first', workflowId: 'helper' },
          { stepId: 'second', workflowId: 'helper' },
        ],
      },
      {
        workflowId: 'helper',
        failureActions: [{ reference: '$components.failureActions.shared' }],
        successActions: [{ reference: '$components.successActions.shared' }],
        steps: [
          { stepId: 'inherit' },
          {
            stepId: 'override',
            onFailure: [{ name: 'recover', type: 'retry', retryLimit: 9 }],
            onSuccess: [{ name: 'done', type: 'goto', workflowId: 'other' }],
          },
          { stepId: 'explicit', onFailure: [{ reference: '$components.failureActions.explicit' }] },
        ],
      },
      { workflowId: 'followup', steps: [] },
      { workflowId: 'other', steps: [] },
      { workflowId: 'unrelated', steps: [] },
    ],
  };
}
function snapshot(revision: string, content = workflow()): WorkflowReviewSnapshot {
  return {
    version: 1,
    id: 'effective',
    revision,
    documents: [
      {
        id: 'flow',
        revision,
        uri: 'https://example.test/flow.json',
        content,
        workflows: [
          { workflowId: 'entry', role: 'entry' },
          { workflowId: 'unrelated', role: 'entry' },
        ],
      },
    ],
  };
}

it('projects one viewer policy with inherited/override/explicit provenance and step-specific default relationships', async () => {
  const loaded = await loadCatalog(snapshot('old'));
  const doc = loaded.documents[0];
  expect(doc.viewerModel?.inspection).toBe(doc.inspection);
  const uses = doc.effectiveUses!;
  expect(
    uses
      .filter((u) => u.declarationPointer === '#/components/failureActions/shared')
      .map((u) => [u.stepId, u.origin]),
  ).toEqual([
    ['inherit', 'inherited'],
    ['explicit', 'inherited'],
  ]);
  expect(
    uses
      .filter((u) => u.declarationPointer === '#/components/successActions/shared')
      .map((u) => u.stepId),
  ).toEqual(['inherit', 'explicit']);
  expect(uses.filter((u) => u.stepId === 'override').map((u) => u.origin)).toEqual([
    'override',
    'override',
  ]);
  expect(
    uses.find((u) => u.declarationPointer === '#/components/failureActions/explicit'),
  ).toMatchObject({
    stepId: 'explicit',
    origin: 'step',
    revision: 'old',
    documentId: 'flow',
    usePointer: '#/workflows/1/steps/2/onFailure/0',
  });
  const index = buildCatalogIndex(loaded);
  const defaults = index.relationships.filter(
    (r) => r.declarationPointer === '#/components/failureActions/shared',
  );
  expect(defaults.map((r) => [r.kind, r.targetStepId, r.location.selection?.stepId])).toEqual([
    ['retry', 'inherit', 'inherit'],
    ['retry', 'explicit', 'explicit'],
  ]);
  expect(new Set(index.relationships.map((r) => r.id)).size).toBe(index.relationships.length);
  expect(
    index.relationships.filter((r) => r.kind === 'goto' && r.to?.workflowId === 'followup'),
  ).toHaveLength(2);
});

it('retains both entry calls for shared changes while excluding shadowed defaults and unrelated entries', async () => {
  const next = workflow(3);
  next.components!.successActions!.shared = { name: 'done', type: 'goto', workflowId: 'other' };
  const result = await compareWorkflowRevisions(snapshot('old'), snapshot('new', next));
  const finding = result.findings.find(
    (f) => f.before?.pointer === '#/components/failureActions/shared/retryLimit',
  )!;
  expect(
    finding.effects.filter((e) => e.side === 'baseline').map((e) => e.location.selection?.stepId),
  ).toEqual(['inherit', 'explicit']);
  expect(
    finding.baselineImpact.paths.map((p) => [
      p.entry.workflowId,
      p.relationships[0].location.selection?.stepId,
    ]),
  ).toEqual([
    ['entry', 'first'],
    ['entry', 'second'],
  ]);
  expect(finding.baselineImpact.direct.every((r) => r.kind === 'retry')).toBe(true);
  expect(finding.baselineImpact.cycles.length).toBeGreaterThan(0);
  const unused = result.findings.find(
    (f) => f.before?.pointer === '#/components/failureActions/unused/retryLimit',
  )!;
  expect(unused.baselineImpact.paths).toEqual([]);
  expect(unused.baselineImpact.complete).toBe(true);
  expect(unused.baselineImpact.coverage.at(-1)?.message).toMatch(/No known applicable consumers/);
  const success = result.findings.find(
    (f) => f.before?.pointer === '#/components/successActions/shared/workflowId',
  )!;
  expect(
    success.effects.filter((e) => e.side === 'baseline').map((e) => e.location.selection?.stepId),
  ).toEqual(['inherit', 'explicit']);
  expect(success.baselineImpact.direct.map((r) => r.kind)).toEqual(['goto', 'goto']);
  expect(success.baselineImpact.paths.map((p) => p.entry.workflowId)).toEqual(['entry', 'entry']);
});

it('restores default and explicit action use addresses on their own before/after revisions', async () => {
  const a = snapshot('old'),
    b = snapshot('new', workflow(3));
  const content = workflow(3);
  content.workflows[1].steps[1].onFailure = [{ name: 'recover', type: 'retry', retryLimit: 10 }];
  b.documents[0].content = content;
  const projections = await prepareWorkflowReview(a, b);
  const result = await compareWorkflowRevisions(a, b);
  for (const finding of result.findings.filter((f) => f.before?.pointer.includes('retryLimit')))
    for (const effect of finding.effects) {
      const projection = effect.side === 'baseline' ? projections.baseline : projections.candidate;
      const doc = projection.loaded.documents[0];
      const restored = resolveLocation(doc.viewerModel!, effect.location, {
        document: doc.uri,
        revision: doc.definition.revision,
        digest: doc.digest,
      });
      expect(restored.status.state).toBe('restored');
      expect(restored.row?.action?.applicableStepId).toBe(effect.location.selection?.stepId);
      expect(restored.row?.action?.origin).toBe(
        effect.location.selection?.stepId === 'override' ? 'step' : 'workflow',
      );
    }
  const explicit = result.findings.find(
    (f) => f.before?.pointer === '#/workflows/1/steps/1/onFailure/0/retryLimit',
  )!;
  expect(explicit.before?.location?.selection?.kind).toBe('action');
  expect(explicit.after?.location?.revision).toBe('new');
});

it('keeps removed step navigation on the step rather than choosing an arbitrary contained action', async () => {
  const next = workflow();
  next.workflows[1].steps.pop();
  const result = await compareWorkflowRevisions(snapshot('old'), snapshot('new', next));
  const removed = result.findings.find(
    (f) => f.kind === 'removed' && f.before?.stepId === 'explicit',
  )!;
  expect(removed.before?.location?.selection).toEqual({
    kind: 'step',
    workflowId: 'helper',
    stepId: 'explicit',
  });
});

it('traces inline workflow defaults to only inheriting steps and labels document metadata scope explicitly', async () => {
  const a = workflow(),
    b = workflow();
  a.workflows[1].failureActions = [{ name: 'recover', type: 'retry', retryLimit: 2 }];
  b.workflows[1].failureActions = [{ name: 'recover', type: 'retry', retryLimit: 3 }];
  b.info.title = 'Changed metadata';
  const result = await compareWorkflowRevisions(snapshot('old', a), snapshot('new', b));
  const action = result.findings.find(
    (f) => f.before?.pointer === '#/workflows/1/failureActions/0/retryLimit',
  )!;
  expect(
    action.effects.filter((e) => e.side === 'baseline').map((e) => e.location.selection?.stepId),
  ).toEqual(['inherit', 'explicit']);
  expect(action.baselineImpact.paths.every((p) => p.entry.workflowId === 'entry')).toBe(true);
  const metadata = result.findings.find((f) => f.before?.pointer === '#/info/title')!;
  expect(metadata.baselineImpact.paths.some((p) => p.entry.workflowId === 'unrelated')).toBe(true);
  expect(
    metadata.baselineImpact.coverage.some((c) =>
      c.message?.includes('Explicit document metadata scope'),
    ),
  ).toBe(true);
});

it('does not root impact in a workflow when every applicable step overrides its inline default', async () => {
  const a = workflow(),
    b = workflow();
  for (const content of [a, b]) content.workflows[1].steps = [content.workflows[1].steps[1]];
  a.workflows[1].failureActions = [{ name: 'recover', type: 'retry', retryLimit: 2 }];
  b.workflows[1].failureActions = [{ name: 'recover', type: 'retry', retryLimit: 3 }];
  const result = await compareWorkflowRevisions(snapshot('old', a), snapshot('new', b));
  const finding = result.findings[0];
  expect(finding.before?.workflowId).toBe('helper');
  expect(finding.effects).toEqual([]);
  expect(finding.baselineImpact.direct).toEqual([]);
  expect(finding.baselineImpact.paths).toEqual([]);
  expect(finding.baselineImpact.complete).toBe(true);
});

it('retains missing reusable addresses and partial no-consumer uncertainty without guessed entry roots', async () => {
  const a = workflow(),
    b = workflow(3);
  for (const content of [a, b]) delete content.components!.failureActions!.shared;
  const loaded = await loadCatalog(snapshot('old', a));
  expect(
    loaded.documents[0].effectiveUses
      ?.filter((u) => u.declarationPointer === '#/components/failureActions/shared')
      .every((u) => u.action.status === 'unresolved'),
  ).toBe(true);
  const index = buildCatalogIndex(loaded);
  expect(index.complete).toBe(false);
  const doc = loaded.documents[0],
    missing = doc.effectiveUses!.find((u) => u.action.status === 'unresolved')!;
  const base = index.entries.find((e) => e.workflowId === missing.workflowId)!.location;
  expect(
    resolveLocation(doc.viewerModel!, effectiveUseLocation(base, missing), {
      document: doc.uri,
      revision: doc.definition.revision,
      digest: doc.digest,
    }).status.state,
  ).toBe('restored');
  expect(
    loaded.coverage.some((c) => c.state === 'failed' && c.message?.includes('Action inspection')),
  ).toBe(true);
  const result = await compareWorkflowRevisions(snapshot('old', a), snapshot('new', b));
  const unused = result.findings.find(
    (f) => f.before?.pointer === '#/components/failureActions/unused/retryLimit',
  )!;
  expect(unused.effects).toEqual([]);
  expect(unused.baselineImpact.paths).toEqual([]);
  expect(unused.baselineImpact.complete).toBe(false);
  expect(unused.baselineImpact.coverage.at(-1)?.message).toMatch(/partial coverage.*unknown/);
});

it('exports deterministic authored applicability with supported addresses and undetermined runtime effect', async () => {
  const a = snapshot('old'),
    b = snapshot('new', workflow(3));
  const first = await compareWorkflowRevisions(a, b),
    second = await compareWorkflowRevisions(a, b);
  for (const format of ['json', 'markdown'] as const) {
    expect(exportWorkflowReview(first, format)).toBe(exportWorkflowReview(second, format));
    expect(exportWorkflowReview(first, format)).toContain('undetermined');
    expect(exportWorkflowReview(first, format)).toContain('/workflows/1/failureActions/0');
  }
  expect(first.runtimeEffect).toBe('undetermined');
});
