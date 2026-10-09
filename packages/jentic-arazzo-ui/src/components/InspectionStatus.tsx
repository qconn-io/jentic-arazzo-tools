import React from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';

export function InspectionStatus() {
  const { model, sourceRegistry } = useArazzoViewer();
  const sources = (model.document.sourceDescriptions ?? []).map((source) => {
    const { resolvedUri } = sourceRegistry.resolveUri(
      source.url,
      model.inspection.snapshot.baseURI,
    );
    return { name: source.name, entry: sourceRegistry.getEntry(resolvedUri) };
  });
  const checked = sources.some((source) => source.entry);
  return (
    <details className="arazzo-inspection-status">
      <summary>Inspection status</summary>
      <div role="region" aria-label="Inspection status details">
        {checked ? (
          <>
            <p>
              API-description availability is shown below. View step details to check an operation.
              Loading a description does not establish contract validity.
            </p>
            <ul>
              {sources.map(({ name, entry }) => (
                <li key={name}>
                  {name}:{' '}
                  {entry?.state === 'located'
                    ? 'API description loaded; operations can be checked in details'
                    : entry?.state === 'loading'
                      ? 'Checking API description'
                      : !entry
                        ? 'API description not loaded'
                        : 'API description unavailable'}
                  {entry && (
                    <details>
                      <summary>Technical acquisition details</summary>
                      <p>Acquisition state: {entry.state}</p>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            API descriptions have not been loaded, so their operations and versions have not been
            checked. This does not mean they are invalid or inaccessible. Declared source names
            remain available.
          </p>
        )}
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
