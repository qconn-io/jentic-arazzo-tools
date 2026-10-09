import { createServer } from 'node:http';
import { it, expect } from 'vitest';
import { compareWorkflowRevisions } from '../src/utils/review';
import type { WorkflowReviewSnapshot } from '../src/types/review';
import { consumerWorkflow } from './fixtures/upstream-readiness';

function snapshot(revision: string, dependencyURI: string): WorkflowReviewSnapshot {
  const content = consumerWorkflow();
  content.sourceDescriptions = [];
  content.workflows[1].steps = [{ stepId: 'inspect', description: revision }];
  content.workflows[1].inputs = { $ref: `${dependencyURI}#/components/schemas/Input` };
  return {
    version: 1,
    id: 'offline-arazzo',
    revision,
    documents: [{ id: 'flow', revision, uri: 'https://example.test/flow.json', content }],
  };
}

it('keeps missing historic Arazzo schema bytes diagnostic and makes zero mutable HTTP requests', async () => {
  let hits = 0;
  const server = createServer((_request, response) => {
    hits++;
    response.end('{"type":"integer"}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture server port');
    const dependencyURI = `http://127.0.0.1:${address.port}/historic.json`;
    const result = await compareWorkflowRevisions(
      snapshot('old', dependencyURI),
      snapshot('new', dependencyURI),
    );
    expect(hits).toBe(0);
    expect(result.findings.some((finding) => finding.before?.workflowId === 'helper')).toBe(true);
    expect(
      result.baseline.coverage.some(
        (item) => item.state === 'failed' && /pinned.*unavailable/i.test(item.message ?? ''),
      ),
    ).toBe(true);
    expect(result.findings.every((finding) => !finding.baselineImpact.complete)).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it('does not choose between two supplied same-URI schema revisions without an applicable pin', async () => {
  const dependencyURI = 'https://example.test/schema.json';
  const a = snapshot('old', dependencyURI),
    b = snapshot('new', dependencyURI);
  for (const side of [a, b])
    for (const revision of ['schema-one', 'schema-two'])
      side.documents.push({
        id: revision,
        revision,
        uri: dependencyURI,
        kind: 'openapi',
        content: {
          openapi: '3.1.0',
          info: { title: 'Input', version: revision },
          paths: {},
          components: {
            schemas: { Input: { type: revision === 'schema-one' ? 'string' : 'integer' } },
          },
        },
      });
  const result = await compareWorkflowRevisions(a, b);
  expect(
    result.baseline.coverage.some((item) => /ambiguous.*authority/i.test(item.message ?? '')),
  ).toBe(true);
  expect(result.findings.every((finding) => !finding.baselineImpact.complete)).toBe(true);
});

it('reports bypassed native resolution as incomplete pinned coverage', async () => {
  const a = snapshot('old', 'https://example.test/schema.json');
  const b = snapshot('new', 'https://example.test/schema.json');
  for (const side of [a, b]) {
    const content = consumerWorkflow();
    content.$self = 'https://identity.example.test/flow.json';
    content.sourceDescriptions = [];
    content.workflows[1].steps[0].description = side.revision;
    side.documents[0].content = content;
  }
  const result = await compareWorkflowRevisions(a, b);
  expect(
    result.baseline.coverage.some(
      (item) => item.state === 'unsupported' && /\$self/i.test(item.message ?? ''),
    ),
  ).toBe(true);
  expect(result.findings.every((finding) => !finding.baselineImpact.complete)).toBe(true);
});
