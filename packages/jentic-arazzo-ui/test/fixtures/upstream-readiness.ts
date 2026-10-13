import type { ArazzoDocument } from '../../src/types/arazzo';
import type { WorkflowCatalogManifest } from '../../src/types/catalog';
import type { WorkflowViewProfile } from '../../src/types/profile';
import type { WorkflowReviewSnapshot } from '../../src/types/review';

export function consumerWorkflow(): ArazzoDocument {
  return {
    arazzo: '1.0.1',
    info: { title: 'Scoped consumers', version: '1' },
    sourceDescriptions: [{ name: 'pay', type: 'openapi', url: './pay.json' }],
    workflows: [
      {
        workflowId: 'entry',
        steps: [
          { stepId: 'first-item', workflowId: 'helper' },
          { stepId: 'second-item', workflowId: 'helper' },
        ],
      },
      {
        workflowId: 'helper',
        steps: [{ stepId: 'capture', operationId: '$sourceDescriptions.pay.capture' }],
      },
      { workflowId: 'unrelated', steps: [] },
    ],
  };
}

export function paymentContract(schemaType = 'string') {
  return {
    openapi: '3.1.0',
    info: { title: 'Pay', version: '1' },
    paths: {
      '/capture': {
        post: {
          operationId: 'capture',
          responses: {
            '200': {
              description: 'Captured',
              content: {
                'application/json': {
                  schema: { type: 'object' },
                  examples: { literal: { value: { $ref: '#/components/schemas/Unused' } } },
                },
              },
            },
          },
        },
      },
    },
    components: { schemas: { Unused: { type: schemaType } } },
  };
}

export function consumerCatalog(
  variant: 'complete' | 'partial' | 'cyclic' = 'complete',
  revision = 'old',
): WorkflowCatalogManifest {
  const flow = consumerWorkflow();
  if (variant === 'cyclic') flow.workflows[1].steps.push({ stepId: 'again', workflowId: 'entry' });
  return {
    version: 1,
    id: 'scoped-consumers',
    revision,
    documents: [
      {
        id: 'flow',
        revision,
        uri: 'https://example.test/flow.json',
        content: flow,
        sources: { pay: { documentId: 'pay', revision } },
        workflows: [
          { workflowId: 'entry', role: 'entry' },
          { workflowId: 'helper', role: 'helper' },
          { workflowId: 'unrelated', role: 'entry' },
        ],
      },
      {
        id: 'pay',
        revision,
        uri: 'https://example.test/pay.json',
        kind: 'openapi',
        ...(variant === 'partial' ? {} : { content: paymentContract() }),
      },
    ],
  };
}

export function defaultActionReview(revision: string, retryLimit: number): WorkflowReviewSnapshot {
  const snapshot = consumerCatalog('complete', revision);
  const flow = consumerWorkflow();
  flow.components = {
    failureActions: { shared: { name: 'recover', type: 'retry', retryLimit } },
  };
  flow.workflows[1].failureActions = [{ reference: '$components.failureActions.shared' }];
  snapshot.documents[0].content = flow;
  return snapshot;
}

export function entryActorProfile(): WorkflowViewProfile {
  const provenance = { kind: 'host' as const, description: 'Explicit fixture metadata' };
  return {
    version: 1,
    document: 'fixture',
    participants: [
      { id: 'client', name: 'Client', provenance },
      { id: 'payments', name: 'Payments', organizationalOwner: 'Finance', provenance },
    ],
    actors: [{ workflowId: 'entry', participant: 'client', provenance }],
    sourceOwners: [{ sourceName: 'pay', participant: 'payments', provenance }],
    implementations: [],
    events: [],
  };
}
