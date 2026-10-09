import { it, expect } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { buildSystemScene } from '../src/utils/systems/scene';
import { consumerWorkflow, entryActorProfile } from './fixtures/upstream-readiness';

it('keeps descriptive implementation actors unknown instead of inheriting the exchange owner', () => {
  const document = consumerWorkflow();
  document.workflows.push({
    workflowId: 'implementation',
    steps: [{ stepId: 'execute', operationId: '$sourceDescriptions.pay.capture' }],
  });
  const model = buildViewerModel(inspect(createSnapshot(document)));
  const profile = entryActorProfile();
  const provenance = { kind: 'host' as const, description: 'Explicit fixture metadata' };
  profile.actors.push({ workflowId: 'helper', participant: 'client', provenance });
  profile.implementations.push({
    id: 'helper-impl',
    exchange: { workflowId: 'helper', stepId: 'capture' },
    workflowId: 'implementation',
    provenance,
  });
  const collapsed = buildSystemScene(model, 'entry', profile, { document: 'fixture' });
  const scene = buildSystemScene(model, 'entry', profile, {
    document: 'fixture',
    expansion: Object.fromEntries(collapsed.rows.map((row) => [row.id, true])),
  });
  const implementations = scene.rows.filter((row) => row.step?.stepId === 'execute');
  expect(implementations.map((row) => row.from)).toEqual([
    'unknown:actor:implementation',
    'unknown:actor:implementation',
  ]);
  expect(implementations.map((row) => row.to)).toEqual(['payments', 'payments']);
  expect(implementations.map((row) => row.associationPaths)).toEqual([
    [[['entry', 'first-item']]],
    [[['entry', 'second-item']]],
  ]);
});

it.each([false, true])(
  'uses valid step overrides and distinct ownership roles with conflicting workflow bindings: %s',
  (conflicting) => {
    const document = consumerWorkflow();
    document.workflows[1].steps.push({
      stepId: 'other',
      operationId: '$sourceDescriptions.pay.capture',
    });
    const model = buildViewerModel(inspect(createSnapshot(document)));
    const profile = entryActorProfile();
    const provenance = { kind: 'host' as const, description: 'Explicit fixture metadata' };
    profile.participants.push({
      id: 'worker',
      name: 'Worker',
      organizationalOwner: 'Engineering',
      provenance,
    });
    profile.actors.push(
      { workflowId: 'helper', participant: 'client', provenance },
      { workflowId: 'helper', stepId: 'capture', participant: 'worker', provenance },
    );
    if (conflicting)
      profile.actors.push({ workflowId: 'helper', participant: 'payments', provenance });
    const scene = buildSystemScene(model, 'helper', profile, { document: 'fixture' });
    expect(scene.rows.map((row) => row.from)).toEqual([
      'worker',
      conflicting ? 'unknown:actor:helper' : 'client',
    ]);
    expect(scene.rows.map((row) => row.to)).toEqual(['payments', 'payments']);
    expect(scene.diagnostics.some((diagnostic) => /conflict/i.test(diagnostic))).toBe(conflicting);
    expect(scene.rows.some((row) => ['Finance', 'Engineering'].includes(row.from))).toBe(false);
  },
);
