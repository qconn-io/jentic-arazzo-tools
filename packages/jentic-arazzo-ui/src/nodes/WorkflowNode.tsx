import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/index';
import { OVERVIEW_WIDTH, OVERVIEW_HEIGHT } from '../utils/model/graphLayout';

// supplementary overview references share card bounds, with no local navigation.
export interface OverviewWorkflowNodeData extends WorkflowNodeData {
  referenceKind?: 'external' | 'missing' | 'malformed' | 'unsupported';
  referenceLabel?: string;
  warning?: string;
}

export const WorkflowNode: React.FC<NodeProps<OverviewWorkflowNodeData>> = ({ data, selected }) => {
  const { workflow, onClick, referenceKind, referenceLabel, warning } = data;
  const description = workflow.summary || workflow.description;
  const label = referenceLabel || workflow.workflowId;
  const activate = () => onClick?.(workflow.workflowId);
  return (
    <div
      onClick={onClick ? activate : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activate();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={[label, description, warning].filter(Boolean).join('\n')}
      style={{
        width: OVERVIEW_WIDTH,
        height: OVERVIEW_HEIGHT,
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: selected ? '#eff6ff' : '#fff',
        border: `2px solid ${warning || referenceKind ? '#d97706' : selected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,.1)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="relationship-in"
        style={{ background: '#64748b' }}
      />
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          minWidth: 0,
        }}
      >
        <div
          style={{ fontSize: 10, color: referenceKind ? '#92400e' : '#1e40af', marginBottom: 5 }}
        >
          {referenceKind ? `${referenceKind.toUpperCase()} REFERENCE` : 'WORKFLOW'}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          padding: '10px 14px',
          flex: 1,
          overflow: 'hidden',
          fontSize: 12,
          color: '#64748b',
        }}
      >
        {description && (
          <div
            style={{
              lineHeight: '16px',
              maxHeight: 32,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {description}
          </div>
        )}
        <div style={{ marginTop: 7 }}>
          {referenceKind === 'external'
            ? 'Source not verified'
            : referenceKind
              ? 'Target unavailable'
              : `${workflow.steps.length} step${workflow.steps.length === 1 ? '' : 's'}`}
        </div>
        {warning && (
          <div
            style={{
              color: '#92400e',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {warning}
          </div>
        )}
      </div>
      {onClick && (
        <div
          style={{
            fontSize: 11,
            textAlign: 'center',
            padding: '7px 12px',
            borderTop: '1px solid #f3f4f6',
            color: '#64748b',
          }}
        >
          Open workflow
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        id="relationship-out"
        style={{ background: '#64748b' }}
      />
    </div>
  );
};
