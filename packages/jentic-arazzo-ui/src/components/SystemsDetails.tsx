import React, { useState } from 'react';
import { useSystems } from '../context/SystemsContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { mappingOverlay } from '../utils/systems/scene';
import { resolveLocation } from '../utils/location/resolve';
import type { WorkflowLocation } from '../types';

export function SystemsDetails() {
  const systems = useSystems();
  const viewer = useArazzoViewer();
  const session = useViewerSession();
  const [responses, setResponses] = useState(false);
  const [events, setEvents] = useState(false);
  if (!systems?.enabled) return null;
  if (systems.perspective === 'workflow')
    return systems.selected ? (
      <button
        onClick={() => {
          systems.returnToSystems();
        }}
      >
        Return to Systems context
      </button>
    ) : null;
  const row = systems.selected;
  if (!row) return null;
  const open = (
    workflowId = row.workflowId,
    stepId: string | null = row.step?.stepId ?? null,
    path = row.path,
    root = row.workflowRoot,
  ) => {
    const location: WorkflowLocation = {
      version: 1,
      document: systems.document,
      root,
      view: 'docs',
      subview: 'sequence',
      ...(stepId
        ? {
            selection: {
              kind: 'step',
              workflowId,
              stepId,
              occurrence: path.map(([workflowId, stepId]) => ({ workflowId, stepId })),
            },
          }
        : {}),
    };
    const resolved = resolveLocation(viewer.model, location, { document: systems.document });
    systems.setPerspective('workflow');
    session.restoreLocation(resolved, 'sequence');
  };
  return (
    <section aria-label="System selection details">
      <p>
        Selected system: {row.workflowId}.{row.step?.stepId ?? row.kind}
      </p>
      <p>
        {row.kind === 'implementation'
          ? 'Descriptive implementation association, not an additional request.'
          : row.kind === 'call'
            ? 'Standard workflow call; control structure, not a business system.'
            : 'Authored interaction, not an observed transaction result.'}
      </p>
      {row.association && <pre>{JSON.stringify(row.association.provenance, null, 2)}</pre>}
      <p>
        Association path:{' '}
        {row.associations
          .map(
            (id, i) =>
              `${id} [${row.associationPaths[i]?.map((site) => site.join('.')).join(' → ') || 'root'}]`,
          )
          .join(' → ') || 'none'}{' '}
        · Call path: {row.path.map((p) => p.join('.')).join(' → ') || 'root'}
      </p>
      <button
        onClick={() =>
          row.association || row.inspectionWorkflowId
            ? open(
                row.inspectionWorkflowId ?? row.association!.workflowId,
                null,
                [],
                row.inspectionWorkflowId ?? row.association!.workflowId,
              )
            : open()
        }
      >
        Open exact workflow occurrence
      </button>
      <details>
        <summary>Selected mappings and prerequisites (not evaluated)</summary>
        {mappingOverlay(viewer.model, row).map((entry, i) => (
          <div key={i}>
            <strong>{entry.label}</strong>
            <pre>{JSON.stringify(entry.value, null, 2)}</pre>
            {entry.producer && (
              <button
                onClick={() =>
                  open(entry.producer!.workflowId, entry.producer!.stepId, entry.producer!.path)
                }
              >
                Open producer {entry.producer.workflowId}.{entry.producer.stepId}
              </button>
            )}
          </div>
        ))}
      </details>
      <label>
        <input
          type="checkbox"
          checked={responses}
          onChange={(e) => setResponses(e.target.checked)}
        />
        Show contract response alternatives
      </label>
      {responses && (
        <>
          <p>Contract alternatives · no response is observed or selected</p>
          <pre>
            {JSON.stringify(
              row.contract?.operation?.responses ?? { status: row.contract?.status },
              null,
              2,
            )}
          </pre>
        </>
      )}
      <label>
        <input type="checkbox" checked={events} onChange={(e) => setEvents(e.target.checked)} />
        Show declared event relationships
      </label>
      {events &&
        systems.scene.events
          .filter((e) =>
            [e.association.producer, e.association.consumer].some(
              (ref) => ref.workflowId === row.workflowId && ref.stepId === row.step?.stepId,
            ),
          )
          .map((e) => (
            <div key={e.association.id}>
              <p>
                {e.association.id}: {e.diagnostic}
              </p>
              {e.valid && (
                <button
                  onClick={() => {
                    const ref =
                      e.association.producer.workflowId === row.workflowId &&
                      e.association.producer.stepId === row.step?.stepId
                        ? e.association.consumer
                        : e.association.producer;
                    systems.setPerspective('workflow');
                    session.openAuthoredStep(ref.workflowId, ref.stepId);
                  }}
                >
                  Open declared event endpoint
                </button>
              )}
              <pre>{JSON.stringify(e.association, null, 2)}</pre>
            </div>
          ))}
      {row.step?.sourceBinding.intent && (
        <pre>
          {JSON.stringify(
            {
              direction: row.step.sourceBinding.intent,
              correlation: row.step.sourceBinding.correlationId,
              timeout: row.step.sourceBinding.timeout,
            },
            null,
            2,
          )}
        </pre>
      )}
    </section>
  );
}
