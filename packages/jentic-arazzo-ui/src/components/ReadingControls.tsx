import React, { useEffect, useRef } from 'react';
import type { ViewerMode } from '../types';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import { useSystems } from '../context/SystemsContext';

/** One entry point for the existing layout and workflow subview values. */
export function ReadingControls({ view }: { view: ViewerMode }) {
  const { activeWorkflowId, model, events } = useArazzoViewer();
  const session = useViewerSession();
  const systems = useSystems();
  const current = activeWorkflowId
    ? (session.views[activeWorkflowId] ?? session.defaultView)
    : undefined;
  const pending = useRef<{
    model: typeof model;
    root: string;
    target: 'docs' | 'sequence' | 'flowchart';
  }>();
  useEffect(() => {
    const request = pending.current;
    if (!request) return;
    if (request.model !== model || request.root !== activeWorkflowId) pending.current = undefined;
    else if ((view === 'docs' || view === 'split') && systems?.perspective !== 'systems') {
      pending.current = undefined;
      session.setView(request.root, request.target);
    }
  }, [model, activeWorkflowId, view, session, systems?.perspective]);
  const read = (target: 'docs' | 'sequence' | 'flowchart') => {
    if (!activeWorkflowId) return;
    if (systems?.perspective === 'systems') systems.setPerspective('workflow');
    if ((view === 'docs' || view === 'split') && systems?.perspective !== 'systems')
      session.setView(activeWorkflowId, target);
    else if (!pending.current) {
      pending.current = { model, root: activeWorkflowId, target };
      if (view === 'diagram') events?.onViewChange?.('docs');
    }
  };
  const layout = (target: ViewerMode) => {
    if (systems?.perspective === 'systems') systems.setPerspective('workflow');
    if (target === view) return;
    events?.onViewChange?.(target);
  };
  return (
    <div className="arazzo-reading-controls">
      {activeWorkflowId && (
        <div role="group" aria-label="Reading view" className="workflow-view-toggle">
          <span className="arazzo-control-scope">Reading view</span>
          <button
            aria-pressed={
              current === 'sequence' && view !== 'diagram' && systems?.perspective !== 'systems'
            }
            onClick={() => read('sequence')}
          >
            Sequence diagram
          </button>
          <button
            aria-pressed={
              current === 'docs' && view !== 'diagram' && systems?.perspective !== 'systems'
            }
            onClick={() => read('docs')}
          >
            Step descriptions
          </button>
        </div>
      )}
      <details className="arazzo-more-views">
        <summary>
          {systems?.perspective === 'systems'
            ? 'Systems view'
            : view === 'diagram'
              ? 'Workflow diagram'
              : view === 'split'
                ? 'Side by side'
                : current === 'flowchart'
                  ? 'Flowchart'
                  : 'More views'}
        </summary>
        <div role="group" aria-label="More views">
          <button
            aria-pressed={view === 'diagram' && systems?.perspective !== 'systems'}
            onClick={() => layout('diagram')}
          >
            Workflow diagram
          </button>
          {activeWorkflowId && (
            <button
              aria-pressed={
                current === 'flowchart' && view !== 'diagram' && systems?.perspective !== 'systems'
              }
              onClick={() => read('flowchart')}
            >
              Flowchart
            </button>
          )}
          <button
            aria-pressed={view === 'split'}
            onClick={() => layout(view === 'split' ? 'docs' : 'split')}
          >
            Side by side
          </button>
          {systems?.enabled && (
            <button
              aria-pressed={systems.perspective === 'systems'}
              onClick={() => systems.setPerspective('systems')}
            >
              Systems view
            </button>
          )}
        </div>
      </details>
    </div>
  );
}
