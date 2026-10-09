import React, { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  ArazzoUI,
  ArazzoWorkflowReview,
  type ArazzoDocument,
  type WorkflowCatalogManifest,
  type WorkflowViewProfile,
  type WorkflowReviewSnapshot,
  type SourceDocumentProvider,
  type WorkflowLocation,
  type ViewerMode,
  type SourceDocumentContent,
} from '@jentic/arazzo-ui';
import { ArazzoCatalog } from '@jentic/arazzo-ui/catalog';
import { ArazzoUIStandalone } from '@jentic/arazzo-ui/standalone';
import '@jentic/arazzo-ui/styles.css';

declare global {
  interface Window {
    acceptanceState: {
      providerRequests: string[];
      locations: WorkflowLocation[];
      views: ViewerMode[];
      workflows: string[];
      aborted: number;
    };
    acceptanceControl?: {
      acceptView(): void;
      acceptWorkflow(): void;
      replaceProvider(): void;
      replaceDocument(): void;
      pending(): void;
      denied(): void;
      release(): void;
    };
  }
}

const query = new URLSearchParams(location.search);
const container = document.getElementById('root')!;
container.style.height = '100vh';
document.body.style.margin = '0';
const root = createRoot(container);
window.acceptanceState = {
  providerRequests: [],
  locations: [],
  views: [],
  workflows: [],
  aborted: 0,
};

function ControlledAcceptance({ input }: { input: ArazzoDocument }) {
  const [document, setDocument] = useState<ArazzoDocument>(() => ({
    ...input,
    sourceDescriptions: [
      { name: 'pay', type: 'openapi', url: 'https://example.test/pay.json' },
      { name: 'other', type: 'openapi', url: 'https://example.test/other.json' },
    ],
    workflows: input.workflows.map((workflow) =>
      workflow.workflowId === 'helper'
        ? { ...workflow, steps: [{ stepId: 'capture', operationId: 'capture' }] }
        : workflow,
    ),
  }));
  const [view, setView] = useState<ViewerMode>('diagram');
  const [workflow, setWorkflow] = useState('entry');
  const [generation, setGeneration] = useState(0);
  const [revision, setRevision] = useState(0);
  const mode = React.useRef('normal');
  const delayed = React.useRef<Array<() => void>>([]);
  const provider = useMemo<SourceDocumentProvider>(
    () => ({
      load: async ({ uri, signal }) => {
        window.acceptanceState.providerRequests.push(uri);
        signal?.addEventListener(
          'abort',
          () => {
            window.acceptanceState.aborted++;
          },
          { once: true },
        );
        if (mode.current === 'denied') throw new Error('Controlled provider denied acquisition');
        const result: SourceDocumentContent = {
          retrievalURI: uri,
          revision: `provider-${generation}`,
          content: {
            openapi: '3.1.0',
            info: { title: 'Controlled contract', version: String(generation) },
            paths: {
              '/capture': {
                post: {
                  operationId:
                    uri.endsWith('/pay.json') && generation === 0 ? 'capture' : 'different',
                  summary: `Current provider ${generation}`,
                  responses: { '200': { description: 'Authored only' } },
                },
              },
            },
          },
        };
        if (mode.current === 'pending')
          return new Promise<SourceDocumentContent>((resolve) =>
            delayed.current.push(() => resolve(result)),
          );
        return result;
      },
    }),
    [generation],
  );
  window.acceptanceControl = {
    acceptView: () => setView(window.acceptanceState.views.at(-1) ?? view),
    acceptWorkflow: () => setWorkflow(window.acceptanceState.workflows.at(-1) ?? workflow),
    replaceProvider: () => {
      mode.current = 'normal';
      setGeneration((value) => value + 1);
    },
    replaceDocument: () =>
      flushSync(() => {
        setRevision((value) => value + 1);
        setDocument((value) => ({
          ...value,
          info: { ...value.info, title: 'Replacement candidate' },
          workflows: value.workflows.map((item) =>
            item.workflowId === 'helper'
              ? { ...item, steps: [{ stepId: 'replacement', operationId: 'replacementOperation' }] }
              : item,
          ),
        }));
      }),
    pending: () => {
      mode.current = 'pending';
    },
    denied: () => {
      mode.current = 'denied';
    },
    release: () => {
      for (const resolve of delayed.current.splice(0)) resolve();
      mode.current = 'normal';
    },
  };
  return (
    <ArazzoUI
      document={document}
      documentIdentity="https://example.test/controlled.json"
      documentRevision={`document-${revision}`}
      baseURI="https://example.test/controlled.json"
      view={view}
      activeWorkflowId={workflow}
      sourceProvider={provider}
      onViewChange={(value) => window.acceptanceState.views.push(value)}
      onWorkflowSelect={(value) => window.acceptanceState.workflows.push(value)}
      onLocationChange={(value) => window.acceptanceState.locations.push(value)}
    />
  );
}
fetch('/fixtures/readiness.json')
  .then((response) => response.json())
  .then(
    (fixtures: {
      document: ArazzoDocument;
      digitalProduct: ArazzoDocument;
      representatives: Record<string, ArazzoDocument>;
      profile: WorkflowViewProfile;
      catalog: WorkflowCatalogManifest;
      baseline: WorkflowReviewSnapshot;
      candidate: WorkflowReviewSnapshot;
    }) => {
      const onLocationChange = (value: WorkflowLocation) =>
        window.acceptanceState.locations.push(value);
      const sourceProvider: SourceDocumentProvider = {
        async load(request) {
          window.acceptanceState.providerRequests.push(request.uri);
          throw new Error('Explicit host provider denied this dependency');
        },
      };
      const surface = query.get('surface') ?? 'host';
      if (surface === 'controlled') root.render(<ControlledAcceptance input={fixtures.document} />);
      else if (surface === 'systems')
        root.render(
          <ArazzoUI
            document={fixtures.digitalProduct}
            documentIdentity="https://example.test/digital-product.yaml"
            viewProfileAdapter="digital-product"
            sourceProvider={sourceProvider}
          />,
        );
      else if (surface === 'stale-profile')
        root.render(
          <ArazzoUI
            document={fixtures.document}
            documentIdentity="https://example.test/flow.json"
            viewProfile={{
              version: 1,
              document: 'stale:document',
              participants: [],
              actors: [],
              sourceOwners: [],
              implementations: [],
              events: [],
            }}
          />,
        );
      else if (surface === 'mismatched-guide')
        root.render(
          <ArazzoUI
            document={fixtures.document}
            documentIdentity="https://example.test/flow.json"
            scenarioManifest={[
              {
                id: 'wrong-document',
                document: 'https://example.test/other.yaml',
                workflow: 'missing',
                expected: 'Authored only',
                evidence: 'Not executed',
              },
            ]}
          />,
        );
      else if (surface === 'representative')
        root.render(
          <ArazzoUI
            document={fixtures.representatives[query.get('fixture') ?? 'asana']}
            view="docs"
          />,
        );
      else if (surface === 'review')
        root.render(
          <ArazzoWorkflowReview baseline={fixtures.baseline} candidate={fixtures.candidate} />,
        );
      else if (surface === 'catalog')
        root.render(
          <ArazzoCatalog manifest={fixtures.catalog} onLocationChange={onLocationChange} />,
        );
      else if (surface === 'standalone')
        root.render(<ArazzoUIStandalone document={fixtures.document} />);
      else
        root.render(
          <ArazzoUI
            document={fixtures.document}
            documentIdentity="https://example.test/flow.json"
            baseURI="https://example.test/flow.json"
            view="docs"
            viewProfile={{ ...fixtures.profile, document: 'https://example.test/flow.json' }}
            sourceProvider={sourceProvider}
            onLocationChange={onLocationChange}
          />,
        );
    },
  );
