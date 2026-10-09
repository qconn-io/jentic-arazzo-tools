import React from 'react';
import { ViewerMode } from '../types/index';

const views: ViewerMode[] = ['diagram', 'docs', 'split'];
const labels = { diagram: 'Workflow diagram', docs: 'Read workflow', split: 'Side by side' };

export interface ViewModeControlProps {
  value: ViewerMode;
  onChange: (view: ViewerMode) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ViewModeControl: React.FC<ViewModeControlProps> = ({
  value,
  onChange,
  className,
  style,
}) => {
  return (
    <div
      role="group"
      aria-label="Layout"
      className={`arazzo-view-mode-control ${className ?? ''}`}
      style={{
        display: 'inline-flex',
        borderRadius: '6px',
        border: '1px solid #444',
        overflow: 'hidden',
        fontSize: '13px',
        ...style,
      }}
    >
      <span style={{ padding: '4px 8px', color: '#e2e8f0', background: '#2a2a2a' }}>Layout</span>
      {views.map((v) => (
        <button
          key={v}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          style={{
            padding: '4px 12px',
            border: 'none',
            borderRight: v !== views[views.length - 1] ? '1px solid #444' : 'none',
            background: value === v ? '#fff' : '#2a2a2a',
            color: value === v ? '#1B1B1B' : '#ccc',
            cursor: value === v ? 'default' : 'pointer',
            fontWeight: value === v ? 600 : 400,
          }}
        >
          {labels[v]}
        </button>
      ))}
    </div>
  );
};
