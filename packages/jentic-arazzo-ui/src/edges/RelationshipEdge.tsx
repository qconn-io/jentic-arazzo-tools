import React from 'react';
import { EdgeProps } from 'reactflow';
import type { WorkflowRelationship } from '../utils/model/viewerModel';

export interface RelationshipEdgeData {
  type: 'relationship';
  kind: 'prerequisite' | 'call' | 'action';
  label: string;
  compactLabel?: string;
  lane: number;
  selfLoop: boolean;
  sideRoute?: boolean;
  warning?: string;
  channel?: 'success' | 'failure';
  actionType?: string;
  provenance?: unknown;
  relationship?: WorkflowRelationship;
}

// explicit orthogonal lanes preserve parallel occurrences and loops.
export function relationshipPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  lane: number,
  selfLoop: boolean,
  sideRoute = false,
) {
  const offset = 26 + lane * 24;
  if (sideRoute) {
    const outsideX = Math.min(sourceX, targetX) - 60 - lane * 26;
    return {
      path: `M ${sourceX} ${sourceY} L ${outsideX} ${sourceY} L ${outsideX} ${targetY} L ${targetX} ${targetY}`,
      labelX: outsideX,
      labelY: (sourceY + targetY) / 2 + lane * 22,
    };
  }
  if (selfLoop) {
    const outsideX = Math.max(sourceX, targetX) + 190 + lane * 24;
    return {
      path: `M ${sourceX} ${sourceY} L ${sourceX} ${sourceY + offset} L ${outsideX} ${sourceY + offset} L ${outsideX} ${targetY - offset} L ${targetX} ${targetY - offset} L ${targetX} ${targetY}`,
      labelX: outsideX,
      labelY: (sourceY + targetY) / 2 + lane * 22,
    };
  }
  if (targetY <= sourceY) {
    const outsideX = Math.max(sourceX, targetX) + 190 + lane * 24;
    return {
      path: `M ${sourceX} ${sourceY} L ${sourceX} ${sourceY + offset} L ${outsideX} ${sourceY + offset} L ${outsideX} ${targetY - offset} L ${targetX} ${targetY - offset} L ${targetX} ${targetY}`,
      labelX: outsideX,
      labelY: (sourceY + targetY) / 2 + lane * 22,
    };
  }
  const middleY = (sourceY + targetY) / 2 + lane * 18;
  // a lateral detour also separates parallel edges on vertically aligned cards.
  const middleX = (sourceX + targetX) / 2 + 35 + lane * 24;
  return {
    path: `M ${sourceX} ${sourceY} L ${sourceX} ${middleY - 12} L ${middleX} ${middleY - 12} L ${middleX} ${middleY + 12} L ${targetX} ${middleY + 12} L ${targetX} ${targetY}`,
    labelX: middleX,
    labelY: middleY,
  };
}

export const RelationshipEdge: React.FC<EdgeProps<RelationshipEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  markerEnd,
  selected,
}) => {
  const route = relationshipPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    data?.lane || 0,
    !!data?.selfLoop,
    !!data?.sideRoute,
  );
  const label = `${data?.label || 'Relationship'}${data?.warning ? ` · ${data.warning}` : ''}`;
  const color = data?.warning
    ? '#b45309'
    : data?.kind === 'prerequisite'
      ? '#2563eb'
      : data?.kind === 'call'
        ? '#7c3aed'
        : data?.actionType === 'retry'
          ? '#b45309'
          : data?.channel === 'failure'
            ? '#dc2626'
            : '#16a34a';
  return (
    <g>
      <title>
        {label}
        {data?.provenance ? ` · provenance: ${JSON.stringify(data.provenance)}` : ''}
      </title>
      <path d={route.path} fill="none" stroke="transparent" strokeWidth={20} />
      <path
        id={id}
        className="react-flow__edge-path"
        d={route.path}
        markerEnd={markerEnd}
        style={{
          ...style,
          fill: 'none',
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: data?.kind === 'prerequisite' ? '6 4' : undefined,
        }}
      />
      <text
        x={route.labelX}
        y={route.labelY - 6}
        textAnchor="middle"
        style={{
          fontSize: 11,
          fill: color,
          paintOrder: 'stroke',
          stroke: '#fff',
          strokeWidth: 5,
          strokeLinejoin: 'round',
        }}
      >
        {data?.compactLabel || label}
      </text>
    </g>
  );
};
