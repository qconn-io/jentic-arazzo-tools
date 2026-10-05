import React, { useEffect, useMemo, useState } from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';

export function WorkflowNavigation() {
  const { model, activeWorkflowId, setActiveWorkflow } = useArazzoViewer();
  const session = useViewerSession();
  const [query, setQuery] = useState('');
  useEffect(() => setQuery(''), [model]);
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    const matches = (value: Record<string, unknown>, id: string) =>
      [
        id,
        value.title,
        value.summary,
        value.description,
        value.operationId,
        value.operationPath,
        value.channelPath,
      ].some((text) => typeof text === 'string' && text.toLocaleLowerCase().includes(term));
    return model.workflows.flatMap((workflow) => [
      ...(matches(workflow.authored, workflow.workflowId)
        ? [{ workflowId: workflow.workflowId, stepId: undefined as string | undefined }]
        : []),
      ...workflow.steps
        .filter((step) => matches(step.authored, step.stepId))
        .map((step) => ({ workflowId: workflow.workflowId, stepId: step.stepId })),
    ]);
  }, [model, query]);
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
      <label>
        Search workflows and steps
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {query.trim() && (
        <div className="arazzo-search-results">
          <p role="status">{results.length} authored locations</p>
          <ul aria-label="Search results">
            {results.map((result) => (
              <li key={JSON.stringify(result)}>
                <button
                  aria-label={
                    result.stepId
                      ? `Inspect authored step ${result.workflowId}.${result.stepId}`
                      : `Open authored workflow ${result.workflowId}`
                  }
                  onClick={(event) =>
                    result.stepId
                      ? session.openAuthoredStep(
                          result.workflowId,
                          result.stepId,
                          event.currentTarget,
                        )
                      : select(result.workflowId)
                  }
                >
                  {result.workflowId}
                  {result.stepId ? ` · ${result.stepId} · authored step` : ' · workflow'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {activeWorkflowId !== null && (
        <span title={activeWorkflowId}>
          {activeWorkflowId} · {incoming} incoming · {outgoing} outgoing
        </span>
      )}
    </nav>
  );
}
