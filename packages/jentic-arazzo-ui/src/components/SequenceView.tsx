import React, { useEffect, useMemo, useRef, useId } from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import { buildSequence, type SequenceRow } from '../utils/sequence/sequenceModel';

function wrap(label: string, width = 30): string[] {
  const text = label.replace(/[\r\n]+/g, ' ');
  const chunks = text.match(new RegExp(`.{1,${width}}`, 'g')) ?? [''];
  return chunks.length > 3 ? [...chunks.slice(0, 2), chunks[2].slice(0, width - 1) + '…'] : chunks;
}

export function SequenceView({ workflowId }: { workflowId: string }) {
  const { model, navigateToTarget } = useArazzoViewer();
  const session = useViewerSession();
  const scene = useMemo(
    () => buildSequence(model, workflowId, session.expansions[workflowId]),
    [model, workflowId, session.expansions],
  );
  const container = useRef<HTMLDivElement>(null);
  const controls = useRef(new Map<string, HTMLButtonElement>());
  const markerId = useId().replace(/:/g, '');
  const width = Math.max(660, scene.participants.length * 230);
  const height = 130 + scene.rows.length * 100;
  const xs = new Map(scene.participants.map((p, i) => [p.id, 115 + i * 230]));
  const rowMap = new Map(scene.rows.map((row) => [row.id, row]));
  const descendant = (row: SequenceRow, parentId: string) => {
    let cursor = row.parentId;
    while (cursor) {
      if (cursor === parentId) return true;
      cursor = rowMap.get(cursor)?.parentId;
    }
    return false;
  };
  useEffect(() => {
    if (session.focusRowId) {
      const control = controls.current.get(session.focusRowId);
      control?.focus();
      control?.scrollIntoView?.({ block: 'nearest' });
      if (control) session.consumeFocus();
    }
  }, [session.focusRowId, scene]);
  const select = (row: SequenceRow, control: HTMLElement) => {
    session.inspectRow(row, control);
    const svgRow = Array.from(
      container.current?.querySelectorAll<SVGGElement>('[data-sequence-id]') ?? [],
    ).find((element) => element.getAttribute('data-sequence-id') === row.id);
    svgRow?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  return (
    <section aria-label={`Sequence ${workflowId}`} className="arazzo-sequence">
      <p>Schematic authored interactions · structural continuations are not evaluated outcomes.</p>
      <div className="arazzo-sequence-canvas" ref={container}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Interaction canvas for ${workflowId}`}
        >
          <defs>
            <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8" fill="#334155" />
            </marker>
          </defs>
          {scene.participants.map((participant) => (
            <g key={participant.id}>
              <title>
                {participant.name} ({participant.kind}) · {participant.id}
              </title>
              <rect
                x={xs.get(participant.id)! - 105}
                y={8}
                width={210}
                height={80}
                rx={5}
                fill="#f1f5f9"
                stroke="#94a3b8"
              />
              <text x={xs.get(participant.id)} y={28} textAnchor="middle" fontSize={13}>
                {wrap(participant.name, 26).map((line, i) => (
                  <tspan x={xs.get(participant.id)} dy={i ? 16 : 0} key={i}>
                    {line}
                  </tspan>
                ))}
              </text>
              <text x={xs.get(participant.id)} y={79} textAnchor="middle" fontSize={11}>
                {participant.kind} · {participant.id}
              </text>
              <line
                x1={xs.get(participant.id)}
                x2={xs.get(participant.id)}
                y1={90}
                y2={height}
                stroke="#94a3b8"
                strokeDasharray="4 5"
              />
            </g>
          ))}
          {scene.rows
            .filter((row) => row.kind === 'call' && row.expanded)
            .map((row) => {
              const first = scene.rows.indexOf(row);
              const last = scene.rows.reduce(
                (end, other, index) => (descendant(other, row.id) ? index : end),
                first,
              );
              return (
                <rect
                  key={row.id}
                  x={8 + row.depth * 12}
                  y={105 + first * 100}
                  width={width - 16 - row.depth * 24}
                  height={(last - first + 1) * 100 - 8}
                  rx={6}
                  fill="none"
                  stroke="#7c3aed"
                  strokeDasharray="7 3"
                />
              );
            })}
          {scene.rows.map((row, index) => {
            const x1 = xs.get(row.from)!,
              x2 = xs.get(row.to)!;
            const y = 155 + index * 100;
            const selected = session.selectedRow?.id === row.id;
            return (
              <g
                key={row.id}
                data-sequence-id={row.id}
                onClick={() => {
                  const control = controls.current.get(row.id);
                  if (control) select(row, control);
                }}
              >
                <title>{row.label}</title>
                {selected && (
                  <rect
                    x={8}
                    y={y - 45}
                    width={width - 16}
                    height={90}
                    fill="#dbeafe"
                    opacity={0.5}
                  />
                )}
                <text x={(x1 + x2) / 2} y={y - 26} textAnchor="middle" fontSize={13} fill="#0f172a">
                  {wrap(row.label).map((line, i) => (
                    <tspan x={(x1 + x2) / 2} dy={i ? 16 : 0} key={i}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {['operation', 'call', 'continuation', 'transfer'].includes(row.kind) &&
                  (x1 === x2 ? (
                    <path
                      d={`M${x1} ${y + 18} h50 v18 h-50`}
                      fill="none"
                      stroke="#334155"
                      markerEnd={`url(#${markerId})`}
                    />
                  ) : (
                    <line
                      x1={x1}
                      x2={x2}
                      y1={y + 26}
                      y2={y + 26}
                      stroke="#334155"
                      strokeDasharray={
                        row.kind === 'continuation' || row.kind === 'transfer' ? '6 4' : undefined
                      }
                      markerEnd={`url(#${markerId})`}
                    />
                  ))}
                {row.returnTo === 'source-step' && x1 !== x2 && (
                  <line
                    x1={x2}
                    x2={x1}
                    y1={y + 38}
                    y2={y + 38}
                    stroke="#b45309"
                    strokeDasharray="3 3"
                    markerEnd={`url(#${markerId})`}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <ol aria-label="Ordered interactions" className="arazzo-sequence-list">
        {scene.rows.map((row) => (
          <li key={row.id} style={{ paddingLeft: Math.min(row.depth, 8) * 12 }}>
            <span>{row.label}</span>{' '}
            {(row.step || row.kind === 'prerequisite' || row.kind === 'marker') && (
              <button
                ref={(element) => {
                  if (row.kind !== 'call' && element) controls.current.set(row.id, element);
                }}
                aria-label={`${['operation', 'call', 'transfer'].includes(row.kind) ? 'Inspect' : 'Inspect context for'} ${row.workflowId}${row.step ? `.${row.step.stepId}` : ''}`}
                onClick={(event) => select(row, event.currentTarget)}
              >
                {row.kind === 'operation' || row.kind === 'call' || row.kind === 'transfer'
                  ? 'Details'
                  : 'Inspect context'}
              </button>
            )}
            {row.kind === 'call' && row.target?.navigable && (
              <>
                <button
                  ref={(element) => {
                    if (element) controls.current.set(row.id, element);
                    else controls.current.delete(row.id);
                  }}
                  aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${row.workflowId}.${row.step?.stepId} → ${row.target.workflowId}`}
                  onClick={(event) => {
                    if (
                      row.expanded &&
                      session.selectedRow &&
                      descendant(session.selectedRow, row.id)
                    ) {
                      session.inspectRow(row, event.currentTarget);
                      session.closeDetails();
                      event.currentTarget.focus();
                    }
                    session.setExpansion(workflowId, row.id, !row.expanded);
                  }}
                >
                  {row.expanded ? 'Collapse' : 'Expand'}
                </button>
                <button
                  aria-label={`Open workflow ${row.target.workflowId} from ${row.workflowId}.${row.step?.stepId}`}
                  onClick={() => session.followCall(workflowId, row)}
                >
                  Open workflow
                </button>
              </>
            )}
            {row.kind === 'marker' && row.reason === 'rows' && (
              <button
                onClick={() => {
                  if (row.workflowId !== workflowId && row.target) {
                    session.clearTrail();
                    navigateToTarget(row.target);
                  }
                  session.setView(row.workflowId, 'docs');
                }}
              >
                View complete documentation for {row.workflowId}
              </button>
            )}
            {row.kind === 'marker' &&
              row.reason !== 'collapsed' &&
              row.reason !== 'rows' &&
              row.step &&
              row.target?.navigable && (
                <button onClick={() => session.followCall(workflowId, row)}>
                  Open workflow {row.target.workflowId}
                </button>
              )}
          </li>
        ))}
      </ol>
    </section>
  );
}
