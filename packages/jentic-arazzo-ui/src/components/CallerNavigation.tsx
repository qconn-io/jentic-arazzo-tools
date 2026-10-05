import React from 'react';
import { useViewerSession } from '../context/ViewerSessionContext';

export function CallerNavigation() {
  const { trail, backToCaller } = useViewerSession();
  const last = trail.at(-1);
  if (!last) return null;
  return (
    <nav aria-label="Caller path" className="arazzo-caller-navigation">
      <ol>
        {trail.map((frame, index) => (
          <li key={`${frame.row.id}-${index}`}>
            {frame.row.workflowId}.{frame.row.step?.stepId} → {frame.callee}
          </li>
        ))}
      </ol>
      <button onClick={backToCaller}>
        Back to caller {last.row.workflowId}.{last.row.step?.stepId}
      </button>
    </nav>
  );
}
