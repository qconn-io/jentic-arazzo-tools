import React, { useId, useEffect, useRef } from 'react';
import { useSystems } from '../context/SystemsContext';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import type { SystemRow } from '../utils/systems/scene';

export function SystemsView() {
  const systems = useSystems()!;
  const viewer = useArazzoViewer();
  const session = useViewerSession();
  const marker = useId().replace(/:/g, '');
  const controls = useRef(new Map<string, HTMLButtonElement>());
  const restored = useRef(false);
  const { scene } = systems;
  const width = Math.max(660, scene.participants.length * 210);
  const height = Math.max(120, scene.rows.length * 85);
  const xs = new Map(scene.participants.map((p, i) => [p.id, i * 210 + 105]));
  const inspect = (row: SystemRow, control: HTMLElement) => {
    systems.select(row);
    if (row.association) session.inspectStep(row.association.workflowId, '', control);
    else
      session.inspectRow(
        {
          ...row,
          kind: row.kind === 'call' ? 'call' : row.kind === 'marker' ? 'marker' : 'operation',
          ...(row.kind === 'call'
            ? {
                path: [...row.path, [row.workflowId, row.step!.stepId]],
                target: row.step?.callTarget,
              }
            : {}),
        },
        control,
      );
  };
  useEffect(() => {
    if (!restored.current && systems.selected?.step && viewer.activeWorkflowId === systems.root) {
      restored.current = true;
      const row = systems.selected;
      if (session.details?.row?.id === row.id) return;
      const frame = requestAnimationFrame(() => {
        const control = controls.current.get(row.id);
        if (row.association) session.inspectStep(row.association.workflowId, '', control);
        else
          session.inspectRow(
            {
              ...row,
              kind: row.kind === 'call' ? 'call' : row.kind === 'marker' ? 'marker' : 'operation',
              ...(row.kind === 'call'
                ? {
                    path: [...row.path, [row.workflowId, row.step!.stepId]],
                    target: row.step?.callTarget,
                  }
                : {}),
            },
            control,
          );
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [systems.selected?.id, viewer.activeWorkflowId]);
  return (
    <section className="arazzo-systems" aria-label={`Systems ${scene.root}`}>
      <p>
        Authored system interactions · descriptive implementations are presentation associations.
        Standard calls retain workflow semantics. No execution, delivery, or transaction result is
        shown.
      </p>
      {!scene.root && <p>Select a workflow to inspect its system interactions.</p>}
      {scene.diagnostics.length > 0 && (
        <details open>
          <summary>Profile diagnostics</summary>
          {scene.diagnostics.map((d, i) => (
            <p key={i}>{d}</p>
          ))}
        </details>
      )}
      <div
        className="arazzo-systems-canvas"
        tabIndex={0}
        aria-label="Scrollable system interactions"
      >
        <div className="arazzo-systems-participants" style={{ width }}>
          {scene.participants.map((p) => (
            <div style={{ width: 210 }} key={p.id}>
              <strong>{p.name}</strong>
              {p.organizationalOwner && <small>Organization: {p.organizationalOwner}</small>}
            </div>
          ))}
        </div>
        <svg width={width} height={height} role="img" aria-label="System interaction diagram">
          <defs>
            <marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8" fill="#334155" />
            </marker>
          </defs>
          {scene.rows
            .filter((row) => row.kind === 'implementation' && row.expanded)
            .map((row) => {
              const first = scene.rows.indexOf(row);
              let last = first;
              while (last + 1 < scene.rows.length && scene.rows[last + 1].depth > row.depth) last++;
              return (
                <rect
                  key={`group:${row.id}`}
                  x={8 + row.depth * 12}
                  y={first * 85 + 10}
                  width={width - 16 - row.depth * 24}
                  height={(last - first + 1) * 85 - 8}
                  fill="#f0fdfa"
                  fillOpacity="0.5"
                  stroke="#0f766e"
                  strokeDasharray="6 4"
                />
              );
            })}
          {scene.participants.map((p) => (
            <line
              key={p.id}
              x1={xs.get(p.id)}
              x2={xs.get(p.id)}
              y1={0}
              y2={height}
              stroke="#94a3b8"
              strokeDasharray="4 5"
            />
          ))}
          {scene.rows.map((row, i) => {
            const x1 = xs.get(row.from) ?? 105,
              x2 = xs.get(row.to) ?? x1,
              y = i * 85 + 48;
            return (
              <g key={row.id}>
                <title>
                  {row.label} · {row.kind}
                </title>
                {row.kind === 'exchange' ? (
                  <path
                    d={x1 === x2 ? `M${x1},${y} h50 v20 h-50` : `M${x1},${y} H${x2}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="2"
                    markerEnd={`url(#${marker})`}
                  />
                ) : (
                  <rect
                    x={10 + row.depth * 14}
                    y={y - 26}
                    width={width - 20 - row.depth * 28}
                    height={50}
                    fill={row.kind === 'implementation' ? '#f0fdfa' : '#f8fafc'}
                    stroke={row.kind === 'implementation' ? '#0f766e' : '#64748b'}
                    strokeDasharray={row.kind === 'implementation' ? '6 4' : undefined}
                  />
                )}
                <text x={20 + row.depth * 14} y={y - 8} fill="#0f172a" fontSize="13">
                  {row.label}
                </text>
                <text x={20 + row.depth * 14} y={y + 14} fill="#475569" fontSize="11">
                  {row.kind === 'exchange'
                    ? `${row.step?.sourceBinding.intent ?? 'request'} · ${row.contract?.status}`
                    : row.kind === 'implementation'
                      ? 'Descriptive association · not an additional request'
                      : row.kind === 'call'
                        ? 'Workflow control · not a business participant'
                        : row.reason}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ol className="arazzo-systems-controls" aria-label="System interaction controls">
        {scene.rows.map((row) => (
          <li key={row.id} style={{ marginLeft: row.depth * 12 }}>
            <button
              ref={(element) => {
                if (element) controls.current.set(row.id, element);
                else controls.current.delete(row.id);
              }}
              onClick={(e) => inspect(row, e.currentTarget)}
              aria-label={
                row.kind === 'implementation'
                  ? `Inspect descriptive implementation ${row.association?.workflowId}`
                  : `Inspect system ${row.workflowId}.${row.step?.stepId ?? row.kind}${row.kind === 'marker' ? ` ${row.reason}` : ''}${scene.rows.filter((other) => other.kind === row.kind && other.workflowId === row.workflowId && other.step?.stepId === row.step?.stepId).length > 1 ? ` · occurrence ${row.associations.join(' / ')} ${row.path.map((site) => site.join('.')).join(' → ') || 'root'}` : ''}`
              }
            >
              {row.label}
            </button>
            {(row.kind === 'call' || row.kind === 'implementation') && (
              <button
                onClick={() => systems.toggle(row)}
                aria-expanded={!!row.expanded}
                aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${row.kind === 'call' ? 'standard call' : 'implementation'} ${row.workflowId}.${row.step?.stepId}`}
              >
                {row.expanded ? 'Collapse' : 'Expand'}
              </button>
            )}
            {row.kind === 'marker' && (
              <button
                onClick={() => {
                  systems.setPerspective('workflow');
                  viewer.setActiveWorkflow(
                    row.inspectionWorkflowId ?? row.association?.workflowId ?? row.workflowId,
                  );
                }}
              >
                Open full authored workflow
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
