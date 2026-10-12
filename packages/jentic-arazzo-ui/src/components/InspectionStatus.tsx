import React from 'react';

import { useContractFacts } from '../context/ContractFactsContext';
import { SourceDescriptions, sourceAvailability } from './SourceDescriptions';
import { useArazzoViewer } from '../context/ArazzoViewerContext';

export function InspectionStatus() {
  const { model, sourceProvider } = useArazzoViewer();
  const { loaded, eligibility } = useContractFacts();
  const sources = (model.document.sourceDescriptions ?? []).filter(
    (source) => source.type !== 'arazzo',
  );
  const states = sources.map((source) =>
    sourceAvailability(loaded[source.name], eligibility(source), !!sourceProvider),
  );
  const counts = ['Loading', 'Failed', 'Unsupported', 'Loading unavailable']
    .map((status) => {
      const count = states.filter((state) => state === status).length;
      return count ? ` · ${count} ${status.toLowerCase()}` : '';
    })
    .join('');
  return (
    <details className="arazzo-inspection-status">
      <summary>
        {sources.length
          ? `API descriptions · ${states.filter((state) => state === 'Loaded').length} of ${sources.length} loaded${counts}`
          : 'Inspection status'}
      </summary>
      <div role="region" aria-label="Inspection status details">
        {sources.length > 0 && (
          <>
            <SourceDescriptions />
            <p>
              Loading a description does not establish contract validity. View step details to check
              an operation.
            </p>
          </>
        )}
        <details>
          <summary>Inspection scope</summary>
          <p>
            Inspection scope: Arazzo {model.support.exactVersion}, profile {model.support.profile}.
            These views do not establish schema validation or execution support.
          </p>
          <ul>
            {model.support.limitations
              .filter((limit) => !/source documents|schema validation/i.test(limit))
              .map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
          </ul>
          {model.diagnostics
            .filter((d) => d.phase === 'resolution')
            .map((d, i) => (
              <p key={i}>{d.message}</p>
            ))}
          <p>
            Understood local workflow calls remain inspectable. Missing and ambiguous targets are
            marked at their occurrences; external workflow loading remains explicit.
          </p>
        </details>
      </div>
    </details>
  );
}
