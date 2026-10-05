import React from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';

export function InspectionStatus() {
  const { model } = useArazzoViewer();
  return (
    <details className="arazzo-inspection-status">
      <summary>Inspection status</summary>
      <div role="region" aria-label="Inspection status details">
        <p>
          Source documents were not fetched, so their operations and versions were not checked. This
          does not mean they are invalid or inaccessible. Declared source names remain available.
        </p>
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
          marked at their occurrences; external content is not expanded.
        </p>
      </div>
    </details>
  );
}
