import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { inspect, createSnapshot } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { validateProfile } from '../src/utils/systems/profile';
import { digitalProductProfile } from '../src/utils/systems/digitalProductProfile';
import type { WorkflowViewProfile } from '../src/types/profile';

const doc = {
  arazzo: '1.0.1',
  info: { title: 'T', version: '1' },
  sourceDescriptions: [{ name: 'api', url: './api', type: 'openapi' }],
  workflows: [
    { workflowId: 'root', steps: [{ stepId: 'a', operationId: '$sourceDescriptions.api.run' }] },
  ],
};
const model = buildViewerModel(inspect(createSnapshot(doc)));
const provenance = { kind: 'host' as const, description: 'fixture' };
const profile: WorkflowViewProfile = {
  version: 1,
  document: 'doc',
  revision: 'r1',
  participants: [{ id: 'client', name: 'Client', provenance }],
  actors: [{ workflowId: 'root', participant: 'client', provenance }],
  sourceOwners: [],
  implementations: [],
  events: [],
};
describe('explicit Systems profiles', () => {
  it('rejects wrong document, stale revision and conflicting actors without guessing', () => {
    expect(validateProfile(model, profile, 'other', 'r1').actors.size).toBe(0);
    expect(validateProfile(model, profile, 'doc', 'r2').actors.size).toBe(0);
    const conflict = {
      ...profile,
      actors: [...profile.actors, { ...profile.actors[0], participant: 'missing' }],
    };
    const result = validateProfile(model, conflict, 'doc', 'r1');
    expect(result.actors.size).toBe(0);
    expect(result.diagnostics.join(' ')).toMatch(/conflict|participant/i);
  });
  it('localizes missing workflow and non-operation implementation references', () => {
    const result = validateProfile(
      model,
      {
        ...profile,
        implementations: [
          {
            id: 'bad',
            exchange: { workflowId: 'root', stepId: 'missing' },
            workflowId: 'absent',
            provenance,
          },
        ],
      },
      'doc',
      'r1',
    );
    expect(result.implementations.size).toBe(0);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
  it('opt-in adapter yields exactly five participants and separate descriptive implementation', async () => {
    const loaded = await loadDocument(
      readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8'),
    );
    const mapped = digitalProductProfile(loaded.document, 'small');
    expect(mapped.participants.map((p) => p.id)).toEqual([
      'client',
      'coordinator',
      'inventory',
      'payment',
      'license',
    ]);
    expect(mapped.implementations[0]).toMatchObject({
      exchange: { workflowId: 'client-journey', stepId: 'purchase' },
      workflowId: 'fulfil-purchase',
    });
    const plain = buildViewerModel(inspect(loaded.snapshot));
    expect(
      plain.relationships.filter((r) => r.kind === 'call').map((r) => r.sourceWorkflowId),
    ).toEqual(['fulfil-purchase']);
    expect(validateProfile(plain, undefined, 'small').participants).toEqual([]);
  });
});

it('invalidates every conflicting event identity instead of selecting the first entry', () => {
  const a = {
    id: 'same',
    producer: { workflowId: 'root', stepId: 'a' },
    consumer: { workflowId: 'root', stepId: 'a' },
    channel: { uri: 'https://test/events', pointer: '#/channels/c' },
    message: { uri: 'https://test/events', pointer: '#/messages/a' },
    provenance,
  };
  const b = { ...a, message: { ...a.message, pointer: '#/messages/b' } };
  expect(validateProfile(model, { ...profile, events: [a, b] }, 'doc', 'r1').events).toEqual([]);
  expect(validateProfile(model, { ...profile, events: [b, a] }, 'doc', 'r1').events).toEqual([]);
});
