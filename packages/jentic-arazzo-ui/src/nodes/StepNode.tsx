import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

import { useArazzoViewer } from '../context/ArazzoViewerContext';
import type { StepNodeData, WorkflowRefNodeData } from '../types/viewer';
import type { ViewerStep } from '../utils/model/viewerModel';
import { actionHandle } from '../utils/conversion/arazzoToFlow';

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
  const owner = data.workflowId ?? context.getNodeOwner({ id, data, position: { x: 0, y: 0 } });
  const fact =
    data.inspectionStep ??
    (owner ? context.model.stepsByWorkflow.get(owner)?.get(data.step.stepId) : undefined);
  const binding = fact?.sourceBinding;
  const description = data.step.description;
  const value = (item: unknown) =>
    typeof item === 'string' && item !== '' ? item : JSON.stringify(item);
  const actions = fact?.effectiveActions;
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
        {description && (
          <p style={{ lineHeight: '16px', maxHeight: 64, overflow: 'hidden', margin: '0 0 8px' }}>
            {description}
          </p>
        )}
        <div>Viewer inspection order</div>
        {binding?.sourceName && (
          <div style={rowStyle}>
            Source: {binding.sourceName} ({binding.verification})
          </div>
        )}
        {['operationId', 'operationPath', 'channelPath', 'workflowId'].map((key) => {
          const locator = (data.step as unknown as Record<string, unknown>)[key];
          return locator === undefined ? null : (
            <div key={key} style={rowStyle} title={value(locator)}>
              {key}: {value(locator)}
            </div>
          );
        })}
        {binding?.intent !== undefined && (
          <div style={rowStyle}>Authored intent: {binding.intent}</div>
        )}
        {binding?.timeout !== undefined && (
          <div style={rowStyle}>Timeout: {value(binding.timeout)} ms</div>
        )}
        {binding?.correlationId !== undefined && (
          <div style={rowStyle}>Correlation: {value(binding.correlationId)}</div>
        )}
        {fact?.callTarget && (
          <button
            disabled={!fact.callTarget.navigable}
            onClick={(event) => {
              event.stopPropagation();
              context.navigateToTarget(fact.callTarget!);
            }}
          >
            Call {fact.callTarget.reference} ({fact.callTarget.kind})
          </button>
        )}
        {fact?.prerequisites.map((prerequisite, index) => (
          <div key={index} style={{ marginTop: 6 }}>
            <button
              disabled={!prerequisite.target.navigable}
              onClick={(event) => {
                event.stopPropagation();
                context.navigateToTarget(prerequisite.target);
              }}
              style={{
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Prerequisite: {prerequisite.target.reference} ({prerequisite.target.kind})
            </button>
          </div>
        ))}
        {fact?.parameters.length ? (
          <section>
            <h4 style={{ margin: '10px 0 4px' }}>Parameters</h4>
            {fact.parameters.map((parameter, index) => (
              <div key={index} style={rowStyle} title={JSON.stringify(parameter.value)}>
                {parameter.value.name || parameter.authored.reference}{' '}
                {parameter.value.in ? `(${parameter.value.in})` : ''}:{' '}
                {value(parameter.value.value)}{' '}
                {parameter.status !== 'resolved' ? `(${parameter.status})` : ''}
              </div>
            ))}
          </section>
        ) : null}
        {data.step.outputs && (
          <section>
            <h4 style={{ margin: '10px 0 4px' }}>Outputs</h4>
            {Object.entries(data.step.outputs).map(([name, output]) => (
              <div key={name} style={rowStyle} title={value(output)}>
                {name}: {value(output)}
              </div>
            ))}
          </section>
        )}
        {data.step.successCriteria?.length ? (
          <div style={{ marginTop: 10 }}>
            Authored success criteria: {data.step.successCriteria.length}
          </div>
        ) : null}
        {(['onSuccess', 'onFailure'] as const).map((channel) =>
          actions?.[channel].length ? (
            <section key={channel}>
              <h4 style={{ margin: '10px 0 4px' }}>
                {channel === 'onSuccess' ? 'Success actions' : 'Failure actions'} · inspection order
              </h4>
              {actions[channel].map((action) => (
                <div
                  key={action.effectiveIndex}
                  style={{
                    position: 'relative',
                    minHeight: 54,
                    boxSizing: 'border-box',
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
                  {action.target ? (
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
                  ) : (
                    <div style={rowStyle}>
                      {action.status === 'resolved'
                        ? 'No transition target'
                        : JSON.stringify(action.authored)}
                    </div>
                  )}
                  <div style={rowStyle}>
                    {action.parameters.length} parameters · {action.value.criteria?.length || 0}{' '}
                    authored criteria
                  </div>
                  {action.parameters.map((parameter, index) => (
                    <div key={index} style={{ marginTop: 6 }}>
                      <pre
                        style={{
                          margin: 0,
                          maxHeight: 120,
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          lineHeight: '18px',
                        }}
                      >{`${parameter.value.name || parameter.authored.reference || 'Parameter'}: ${value(parameter.value.value)}${parameter.status === 'resolved' ? '' : ` (${parameter.status})`}`}</pre>
                      {parameter.authored.reference && (
                        <div
                          style={{ ...rowStyle, fontSize: 10 }}
                          title={parameter.authored.reference}
                        >
                          Reference: {parameter.authored.reference}
                        </div>
                      )}
                      {parameter.status !== 'resolved' && (
                        <pre
                          style={{
                            margin: '4px 0',
                            maxHeight: 120,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {JSON.stringify(parameter.authored)}
                        </pre>
                      )}
                    </div>
                  ))}
                  {action.value.criteria?.length > 0 && (
                    <pre
                      style={{
                        maxHeight: 80,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                        lineHeight: '18px',
                      }}
                    >
                      Authored criteria: {JSON.stringify(action.value.criteria)}
                    </pre>
                  )}
                  <div style={{ fontSize: 10, marginTop: 6, lineHeight: '18px' }}>
                    <div style={rowStyle}>
                      Applies to: {action.applicableWorkflowId}.{action.applicableStepId}
                    </div>
                    <div style={rowStyle} title={JSON.stringify(action.path)}>
                      Use: /{action.path.join('/')}
                    </div>
                    {action.declarationPath && (
                      <div style={rowStyle} title={JSON.stringify(action.declarationPath)}>
                        Declaration: /{action.declarationPath.join('/')}
                      </div>
                    )}
                  </div>
                  {action.diagnostics.map((diagnostic, index) => (
                    <div
                      key={index}
                      style={{
                        color: '#92400e',
                        marginTop: 6,
                        lineHeight: '18px',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      Inspection warning: {diagnostic.message}
                    </div>
                  ))}
                  <details style={{ marginTop: 6 }}>
                    <summary>Authored action details</summary>
                    <pre
                      style={{
                        maxHeight: 120,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {JSON.stringify(action.authored, null, 2)}
                    </pre>
                  </details>
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
        {context.model.support.limitations.length > 0 && (
          <div style={{ marginTop: 8, color: '#64748b' }}>
            Selected inspection; validation and execution support not established.
          </div>
        )}
        <details style={{ marginTop: 10 }}>
          <summary>Authored details</summary>
          <pre
            style={{
              maxHeight: 120,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {JSON.stringify(fact?.authored ?? data.step, null, 2)}
          </pre>
        </details>
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
