import React from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import type { WorkflowRelationship } from '../utils/model/viewerModel';

export function WorkflowOverview() {
  const { model, setActiveWorkflow, navigateToTarget } = useArazzoViewer();
  return (
    <section aria-label="Workflow overview" className="arazzo-workflow-overview">
      <h2>All workflows</h2>
      {model.workflows.map((workflow) => {
        const outgoing = model.relationships.filter(
          (r) => r.sourceWorkflowId === workflow.workflowId,
        );
        const incoming = model.relationships.filter(
          (r) => r.target.navigable && r.targetWorkflowId === workflow.workflowId,
        );
        const groups: [string, WorkflowRelationship[]][] = [
          ['Calls', outgoing.filter((r) => r.kind === 'call')],
          ['Called by', incoming.filter((r) => r.kind === 'call')],
          ['Prerequisites', outgoing.filter((r) => r.kind === 'prerequisite')],
          ['Transfers', outgoing.filter((r) => r.kind === 'action')],
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
            {groups.map(([label, relationships]) => (
              <div key={label}>
                <strong>{label}</strong>
                {relationships.length === 0 ? (
                  <span> None declared</span>
                ) : (
                  <ul>
                    {relationships.map((relationship) => {
                      const incomingLink = label === 'Called by';
                      const name = incomingLink
                        ? relationship.sourceWorkflowId
                        : relationship.target.reference;
                      return (
                        <li key={relationship.id}>
                          {incomingLink ? (
                            <button
                              onClick={() => setActiveWorkflow(relationship.sourceWorkflowId)}
                            >
                              {name}
                            </button>
                          ) : relationship.target.navigable ? (
                            <button onClick={() => navigateToTarget(relationship.target)}>
                              {name}
                            </button>
                          ) : (
                            <span title={relationship.target.reason}>
                              {name} ({relationship.target.kind})
                            </span>
                          )}
                          {relationship.sourceStepId && <span> · {relationship.sourceStepId}</span>}
                          {relationship.actionType && (
                            <span>
                              {' '}
                              · {relationship.channel} {relationship.actionType}
                            </span>
                          )}
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
