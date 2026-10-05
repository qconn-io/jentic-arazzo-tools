import React, { useState } from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import type { WorkflowRelationship } from '../utils/model/viewerModel';

const labels = {
  call: 'Call',
  prerequisite: 'Prerequisite',
  goto: 'One-way goto',
  retry: 'Retry recovery',
};
const relationshipType = (relationship: WorkflowRelationship) =>
  relationship.kind === 'action' ? (relationship.actionType ?? 'action') : relationship.kind;

export function WorkflowOverview() {
  const { model, setActiveWorkflow, navigateToTarget } = useArazzoViewer();
  const [filter, setFilter] = useState('all');
  const included = (r: WorkflowRelationship) => filter === 'all' || relationshipType(r) === filter;
  return (
    <section aria-label="Workflow overview" className="arazzo-workflow-overview">
      <h2>All workflows</h2>
      <label>
        Relationship type{' '}
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All relationship types</option>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>
        Authored relationships, including possible conditional transfers. Criteria are not
        evaluated.
      </p>
      {model.workflows.map((workflow) => {
        const outgoing = model.relationships.filter(
          (r) => r.sourceWorkflowId === workflow.workflowId && included(r),
        );
        const incoming = model.relationships.filter(
          (r) => r.target.navigable && r.targetWorkflowId === workflow.workflowId && included(r),
        );
        const groups: [string, WorkflowRelationship[]][] = [
          ['Outgoing', outgoing],
          ['Incoming', incoming],
        ];
        return (
          <article key={workflow.workflowId}>
            <h3>
              <button
                onClick={() => setActiveWorkflow(workflow.workflowId)}
                aria-label={`Open workflow ${workflow.workflowId}`}
              >
                {workflow.workflowId}
              </button>
            </h3>
            {workflow.value.summary && <p>{workflow.value.summary}</p>}
            {groups.map(([direction, relationships]) => (
              <div key={direction}>
                <strong>{direction}</strong>
                {!relationships.length ? (
                  <span> None declared{filter !== 'all' && ' for this filter'}</span>
                ) : (
                  <ul>
                    {relationships.map((r) => {
                      const type = relationshipType(r);
                      const name =
                        direction === 'Incoming' ? r.sourceWorkflowId : r.target.reference;
                      return (
                        <li key={r.id} data-relationship-type={type}>
                          <strong>{labels[type as keyof typeof labels] ?? type}</strong>
                          {' · '}
                          {direction === 'Incoming' ? (
                            <button
                              onClick={() =>
                                navigateToTarget({
                                  kind: r.sourceStepId ? 'local-step' : 'local-workflow',
                                  reference: `${r.sourceWorkflowId}${r.sourceStepId ? `.${r.sourceStepId}` : ''}`,
                                  role: 'action',
                                  workflowId: r.sourceWorkflowId,
                                  stepId: r.sourceStepId,
                                  navigable: true,
                                })
                              }
                            >
                              {name}
                            </button>
                          ) : r.target.navigable ? (
                            <button onClick={() => navigateToTarget(r.target)}>{name}</button>
                          ) : (
                            <span title={r.target.reason}>
                              {name} ({r.target.kind})
                            </span>
                          )}
                          <span>
                            {' '}
                            · origin {r.sourceWorkflowId}
                            {r.sourceStepId && `.${r.sourceStepId}`}
                            {r.channel && ` · ${r.channel}`}
                            {r.actionName && ` · ${r.actionName}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </article>
        );
      })}
    </section>
  );
}
