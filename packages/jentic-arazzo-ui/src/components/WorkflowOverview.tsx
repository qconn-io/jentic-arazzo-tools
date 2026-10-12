import React, { useState } from 'react';

import { workflowReadingLabel } from '../utils/readingLabels';
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
      <details className="arazzo-overview-filters">
        <summary>Relationship filters</summary>
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
      </details>
      {model.workflows.map((workflow) => {
        const allOutgoing = model.relationships.filter(
          (r) => r.sourceWorkflowId === workflow.workflowId,
        );
        const allIncoming = model.relationships.filter(
          (r) => r.target.navigable && r.targetWorkflowId === workflow.workflowId,
        );
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
        const unavailable = allOutgoing.filter((r) => !r.target.navigable).length;
        return (
          <article key={workflow.workflowId} className="arazzo-overview-entry">
            <h3>
              <button
                className="arazzo-overview-link"
                onClick={() => setActiveWorkflow(workflow.workflowId)}
                aria-label={`Open workflow ${workflow.workflowId}`}
                title={workflowReadingLabel(workflow)}
              >
                {workflowReadingLabel(workflow)}
              </button>
            </h3>
            {typeof workflow.authored.description === 'string' &&
              workflow.authored.description.trim() && (
                <p className="arazzo-overview-summary" title={workflow.authored.description}>
                  {workflow.authored.description}
                </p>
              )}
            {unavailable > 0 && (
              <p className="arazzo-overview-unavailable">
                {unavailable} unavailable relationship{unavailable === 1 ? '' : 's'}; open
                relationships for the authored targets and reasons.
              </p>
            )}
            {(allOutgoing.length > 0 || allIncoming.length > 0) && (
              <details className="arazzo-overview-relationships">
                <summary>
                  Relationships ({allOutgoing.length} outgoing, {allIncoming.length} incoming)
                </summary>
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
                                  className="arazzo-overview-link"
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
                                <button
                                  className="arazzo-overview-link"
                                  onClick={() => navigateToTarget(r.target)}
                                >
                                  {name}
                                </button>
                              ) : (
                                <span title={r.target.reason}>
                                  {name} ({r.target.kind}
                                  {r.target.reason ? `: ${r.target.reason}` : ''})
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
              </details>
            )}
          </article>
        );
      })}
    </section>
  );
}
