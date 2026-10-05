import React, { useEffect, useRef } from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import { projectOccurrenceDetails } from '../utils/sequence/occurrenceDetails';

export function SelectionDetails() {
  const { model } = useArazzoViewer();
  const session = useViewerSession();
  const selection = session.details;
  const closeControl = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selection) closeControl.current?.focus();
  }, [selection]);
  const details =
    selection &&
    projectOccurrenceDetails(model, selection.workflowId, selection.stepId, selection.row);
  if (!details) return null;
  return (
    <aside role="region" aria-label="Selection details" className="arazzo-selection-details">
      <button ref={closeControl} onClick={session.closeDetails}>
        Close details
      </button>
      <h2>{details.title}</h2>
      {details.sections.map((section) => (
        <details
          key={section.title}
          open={[
            'Context',
            'Caller-supplied parameters',
            'Parameters',
            'Caller-side output expressions',
            'Declared callee inputs',
            'Declared callee outputs',
          ].includes(section.title)}
        >
          <summary>{section.title}</summary>
          <pre>
            {typeof section.value === 'string'
              ? section.value
              : JSON.stringify(section.value, null, 2)}
          </pre>
        </details>
      ))}
    </aside>
  );
}
