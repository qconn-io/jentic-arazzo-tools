import { it, expect } from 'vitest';
import { createSnapshot, inspect } from '../src/utils/inspection';
import { buildViewerModel } from '../src/utils/model/viewerModel';
import { projectAsyncAPI } from '../src/utils/contract/AsyncAPIAdapter';
import { SourceRegistry } from '../src/utils/source/SourceRegistry';
import { validateEventAssociation } from '../src/utils/systems/contracts';
import type { WorkflowEventAssociation } from '../src/types/profile';
it('requires exact declared message identities and current revisions, never equal names', async () => {
  const message = { name: 'Ready' };
  const facts = await projectAsyncAPI(
    {
      asyncapi: '3.0.0',
      channels: { c: { messages: { a: message, b: message } } },
      operations: {
        send: {
          action: 'send',
          channel: { $ref: '#/channels/c' },
          messages: [{ $ref: '#/channels/c/messages/a' }],
        },
        receive: {
          action: 'receive',
          channel: { $ref: '#/channels/c' },
          messages: [{ $ref: '#/channels/c/messages/a' }],
        },
      },
    },
    'https://test/events',
    new SourceRegistry(),
    'r1',
  );
  const model = buildViewerModel(
    inspect(
      createSnapshot({
        arazzo: '1.0.1',
        info: { title: 'T', version: '1' },
        sourceDescriptions: [{ name: 'events', type: 'asyncapi', url: 'https://test/events' }],
        workflows: [
          {
            workflowId: 'w',
            steps: [
              { stepId: 'p', operationId: '$sourceDescriptions.events.send' },
              { stepId: 'c', operationId: '$sourceDescriptions.events.receive' },
            ],
          },
        ],
      }),
    ),
  );
  const a: WorkflowEventAssociation = {
    id: 'a',
    producer: { workflowId: 'w', stepId: 'p' },
    consumer: { workflowId: 'w', stepId: 'c' },
    channel: { uri: facts.uri, pointer: '#/channels/c' },
    message: { uri: facts.uri, pointer: '#/channels/c/messages/a' },
    provenance: { kind: 'host', description: 'explicit' },
  };
  const loaded = { events: { state: 'success' as const, facts } };
  expect(validateEventAssociation(model, a, loaded).valid).toBe(true);
  expect(
    validateEventAssociation(
      model,
      { ...a, message: { ...a.message, pointer: '#/channels/c/messages/b' } },
      loaded,
    ).valid,
  ).toBe(false);
  expect(
    validateEventAssociation(model, { ...a, message: { ...a.message, revision: 'r2' } }, loaded)
      .valid,
  ).toBe(false);
  expect(validateEventAssociation(model, a, {}).valid).toBe(false);
});

it('the explicitly authored event profile verifies all four worker relationships', async () => {
  const { readFileSync } = await import('node:fs');
  const { loadDocument } = await import('../src/utils/loading/loadDocument');
  const { buildSystemScene } = await import('../src/utils/systems/scene');
  const rawProfile = JSON.parse(
    readFileSync('public/examples/digital-product-stress/systems-profile.json', 'utf8'),
  );
  rawProfile.document = 'events';
  for (const a of rawProfile.events) {
    a.channel.uri = 'https://test/events';
    a.message.uri = 'https://test/events';
  }
  const loaded = await loadDocument(
    readFileSync('public/examples/digital-product-stress/event-based.arazzo.yaml', 'utf8'),
  );
  const model = buildViewerModel(inspect(loaded.snapshot));
  const facts = await projectAsyncAPI(
    readFileSync('public/examples/digital-product-stress/events.asyncapi.yaml', 'utf8'),
    'https://test/events',
    new SourceRegistry(),
  );
  const scene = buildSystemScene(model, 'event-driven-purchase', rawProfile, {
    document: 'events',
    contracts: { events: { state: 'success', facts } },
  });
  expect(scene.events).toHaveLength(4);
  expect(scene.events.every((e) => e.valid)).toBe(true);
  expect(
    buildSystemScene(
      model,
      'event-driven-purchase',
      { ...rawProfile, events: [] },
      { document: 'events', contracts: { events: { state: 'success', facts } } },
    ).events,
  ).toEqual([]);
});
