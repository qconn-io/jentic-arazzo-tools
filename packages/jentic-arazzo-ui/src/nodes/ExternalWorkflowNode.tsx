import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

import type { ExternalWorkflowNodeData } from '../types/viewer';
import type { ClassifiedTarget } from '../utils/inspection';
import { useArazzoViewer } from '../context/ArazzoViewerContext';

export const ExternalWorkflowNode: React.FC<
  NodeProps<ExternalWorkflowNodeData & { target?: ClassifiedTarget; referenceLabel?: string }>
> = ({ data, selected }) => {
  const context = useArazzoViewer();
  const target = data.target;
  const label = data.referenceLabel || data.workflowId;
  return (
    <div
      style={{
        width: 420,
        height: 150,
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: `2px solid ${selected ? '#3b82f6' : '#cbd5e1'}`,
        background: '#fff',
        borderRadius: 10,
        padding: 14,
        fontSize: 12,
      }}
      title={target?.reason || label}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Left} id="prerequisite-out" style={{ top: 28 }} />
      <Handle type="target" position={Position.Left} id="prerequisite-in" style={{ top: 48 }} />
      <strong
        style={{
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </strong>
      <p>{target?.kind || 'Workflow reference'}</p>
      {target?.navigable || (!target && data.onClick) ? (
        <button
          onClick={(event) => {
            event.stopPropagation();
            if (target) context.navigateToTarget(target);
            else data.onClick?.(data.workflowId);
          }}
        >
          Open {target?.stepId ? 'step' : 'workflow'}
        </button>
      ) : (
        <div>{target?.reason || 'Target is unavailable or its source was not fetched'}</div>
      )}
      <Handle type="source" position={Position.Bottom} id="return" />
    </div>
  );
};
