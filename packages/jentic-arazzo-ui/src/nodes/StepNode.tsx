import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import type { StepNodeData, WorkflowRefNodeData } from '../types/viewer';
import type { ViewerStep } from '../utils/model/viewerModel';
import { actionHandle } from '../utils/conversion/arazzoToFlow';
import { rootCallOccurrence } from '../utils/sequence/sequenceModel';

export type InspectedStepData = (StepNodeData | WorkflowRefNodeData) & {
  inspectionStep?: ViewerStep;
};
const rowStyle: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: '22px',
};
export function InspectionStepCard({
  data,
  selected,
  id,
}: {
  data: InspectedStepData;
  selected?: boolean;
  id: string;
}) {
  const context = useArazzoViewer();
  const session = useViewerSession();
  const owner = data.workflowId ?? context.getNodeOwner({ id, data, position: { x: 0, y: 0 } });
  const fact =
    data.inspectionStep ??
    (owner ? context.model.stepsByWorkflow.get(owner)?.get(data.step.stepId) : undefined);
  const binding = fact?.sourceBinding;
  return (
    <div
      data-step-id={data.step.stepId}
      data-workflow-id={owner}
      style={{
        width: 420,
        boxSizing: 'border-box',
        border: `2px solid ${selected ? '#3b82f6' : '#cbd5e1'}`,
        borderRadius: 10,
        background: '#fff',
        fontSize: 12,
        color: '#334155',
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Left} id="prerequisite-out" style={{ top: 28 }} />
      <Handle type="target" position={Position.Left} id="prerequisite-in" style={{ top: 48 }} />
      <div
        style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
      >
        <strong>{data.step.stepId}</strong>{' '}
        <span>{data.type === 'workflowRef' ? 'WORKFLOW CALL' : binding?.sourceType || 'STEP'}</span>
      </div>
      <div style={{ padding: '10px 14px' }}>
        {owner && (
          <button
            aria-label={`Details for ${owner}.${data.step.stepId}`}
            onClick={(event) => {
              event.stopPropagation();
              session.inspectStep(owner, data.step.stepId, event.currentTarget);
            }}
          >
            Details
          </button>
        )}
        {binding?.sourceName && <div style={rowStyle}>Source: {binding.sourceName}</div>}
        {['operationId', 'operationPath', 'channelPath', 'workflowId'].map((key) => {
          const locator = (data.step as unknown as Record<string, unknown>)[key];
          return locator === undefined ? null : (
            <div key={key} style={rowStyle} title={String(locator)}>
              {key}: {String(locator)}
            </div>
          );
        })}
        {binding?.intent && <div style={rowStyle}>Authored intent: {binding.intent}</div>}
        {fact?.callTarget && (
          <button
            disabled={!fact.callTarget.navigable}
            title={fact.callTarget.reason}
            onClick={(event) => {
              event.stopPropagation();
              const row = owner && rootCallOccurrence(context.model, owner, fact.stepId);
              if (row && owner) session.followCall(owner, row);
            }}
          >
            Call {fact.callTarget.reference} ({fact.callTarget.kind})
          </button>
        )}
        {fact?.prerequisites.map((prerequisite, index) => (
          <div key={index} style={{ marginTop: 6 }}>
            <button
              disabled={!prerequisite.target.navigable}
              title={prerequisite.target.reason}
              onClick={(event) => {
                event.stopPropagation();
                context.navigateToTarget(prerequisite.target);
              }}
              style={{ maxWidth: '100%', ...rowStyle }}
            >
              Prerequisite: {prerequisite.target.reference} ({prerequisite.target.kind})
            </button>
          </div>
        ))}
        <div>
          {fact?.parameters.length ?? 0} parameters · {Object.keys(data.step.outputs ?? {}).length}{' '}
          output mappings
        </div>
        <div>Viewer inspection order</div>
        {(['onSuccess', 'onFailure'] as const).map((channel) =>
          fact?.effectiveActions[channel].length ? (
            <section key={channel}>
              <h4 style={{ margin: '10px 0 4px' }}>
                {channel === 'onSuccess' ? 'Success actions' : 'Failure actions'} · inspection order
              </h4>
              {fact.effectiveActions[channel].map((action) => (
                <div
                  key={action.effectiveIndex}
                  style={{
                    position: 'relative',
                    minHeight: 54,
                    padding: '8px 10px',
                    marginTop: 6,
                    border: '1px solid #e2e8f0',
                    borderRadius: 5,
                  }}
                >
                  <div style={rowStyle}>
                    <strong>
                      {action.value.name || action.authored.reference || 'Authored action'}
                    </strong>{' '}
                    · {action.value.type || action.status} · {action.origin}
                    {action.isOverride ? ' override' : ''}
                  </div>
                  {action.target && (
                    <button
                      disabled={!action.target.navigable}
                      onClick={(event) => {
                        event.stopPropagation();
                        context.navigateToTarget(action.target!);
                      }}
                      style={{ maxWidth: '100%', ...rowStyle }}
                    >
                      {action.target.reference} ({action.target.kind})
                    </button>
                  )}
                  <div style={rowStyle}>
                    {action.parameters.length} parameters · {action.value.criteria?.length || 0}{' '}
                    authored criteria
                  </div>
                  {action.status !== 'resolved' && <div>{action.status} — inspect details</div>}
                  {action.status === 'resolved' && action.target && action.value.type !== 'end' && (
                    <Handle
                      type="source"
                      position={channel === 'onSuccess' ? Position.Right : Position.Left}
                      id={actionHandle(action)}
                    />
                  )}
                </div>
              ))}
            </section>
          ) : null,
        )}
        {fact?.diagnostics.map((diagnostic, index) => (
          <div
            key={index}
            style={{ color: '#92400e', lineHeight: '18px', marginTop: 6 }}
            title={diagnostic.message}
          >
            Inspection warning: {diagnostic.message}
          </div>
        ))}
      </div>
      {fact?.callTarget && (
        <Handle type="source" position={Position.Right} id="call" style={{ top: 65 }} />
      )}
      <Handle type="source" position={Position.Bottom} id="sequential" />
    </div>
  );
}
export const StepNode: React.FC<NodeProps<StepNodeData & { inspectionStep?: ViewerStep }>> = ({
  data,
  selected,
  id,
}) => <InspectionStepCard data={data} selected={selected} id={id} />;
