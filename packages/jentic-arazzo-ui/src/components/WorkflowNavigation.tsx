import React from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';

export function WorkflowNavigation() {
  const { model, activeWorkflowId, setActiveWorkflow } = useArazzoViewer();
  const session = useViewerSession();
  const select = (id: string | null) => {
    session.clearTrail();
    setActiveWorkflow(id);
  };
  const incoming = model.relationships.filter(
    (r) => r.target.navigable && r.targetWorkflowId === activeWorkflowId,
  ).length;
  const outgoing = model.relationships.filter(
    (r) => r.sourceWorkflowId === activeWorkflowId,
  ).length;
  return (
    <nav aria-label="Workflows" className="arazzo-workflow-navigation">
      <button aria-pressed={activeWorkflowId === null} onClick={() => select(null)}>
        All workflows
      </button>
      <label>
        Select workflow
        <select
          value={activeWorkflowId ?? ''}
          onChange={(event) => select(event.target.value || null)}
        >
          <option value="">All workflows</option>
          {model.workflows.map((workflow) => (
            <option key={workflow.workflowId} value={workflow.workflowId}>
              {workflow.workflowId}
            </option>
          ))}
        </select>
      </label>
      {activeWorkflowId !== null && (
        <span title={activeWorkflowId}>
          {activeWorkflowId} · {incoming} incoming · {outgoing} outgoing
        </span>
      )}
    </nav>
  );
}
