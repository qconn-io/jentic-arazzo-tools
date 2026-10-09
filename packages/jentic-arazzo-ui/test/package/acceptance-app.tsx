import React from 'react';
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
} from '@jentic/arazzo-ui';
import { ArazzoCatalog } from '@jentic/arazzo-ui/catalog';
import { ArazzoUIStandalone } from '@jentic/arazzo-ui/standalone';
import '@jentic/arazzo-ui/styles.css';

declare global {
  interface Window {
    acceptanceState: { providerRequests: string[]; locations: WorkflowLocation[] };
  }
}

const query = new URLSearchParams(location.search);
const container = document.getElementById('root')!;
container.style.height = '100vh';
document.body.style.margin = '0';
const root = createRoot(container);
window.acceptanceState = { providerRequests: [], locations: [] };
fetch('/fixtures/readiness.json')
  .then((response) => response.json())
  .then(
    (fixtures: {
      document: ArazzoDocument;
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
      if (surface === 'representative')
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
