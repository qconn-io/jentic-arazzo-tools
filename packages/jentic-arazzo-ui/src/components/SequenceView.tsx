import { contractReadingStatus } from '../utils/contract/readingStatus';
import { interactionReadingLabel, interactionReadingTitle } from '../utils/readingLabels';
import React, { useEffect, useMemo, useRef, useId, useState } from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import { useContractFacts } from '../context/ContractFactsContext';
import { resolveStepOperation } from '../utils/contract/stepOperation';
import { buildSequence, destinationKey, type SequenceRow } from '../utils/sequence/sequenceModel';
import { projectSequenceSteps } from '../utils/sequence/readingProjection';

function wrap(label: string, width = 30): string[] {
  const words = label.replace(/[\r\n]+/g, ' ').split(/\s+/);
  const lines: string[] = [''];
  for (const word of words) {
    const index = lines.length - 1;
    if (lines[index] && lines[index].length + word.length + 1 > width) lines.push(word);
    else lines[index] += (lines[index] ? ' ' : '') + word;
  }
  return lines
    .slice(0, 3)
    .map((line, i) =>
      line.length > width || (i === 2 && lines.length > 3) ? line.slice(0, width - 1) + '…' : line,
    );
}

export function SequenceView({ workflowId }: { workflowId: string }) {
  const { model, navigateToTarget } = useArazzoViewer();
  const session = useViewerSession();
  const { loaded } = useContractFacts();
  const scene = useMemo(
    () =>
      buildSequence(
        model,
        workflowId,
        session.expansions[workflowId],
        new Map(
          model.workflows.flatMap((workflow) =>
            workflow.steps.map(
              (step) =>
                [destinationKey(model, step), resolveStepOperation(model, step, loaded)] as const,
            ),
          ),
        ),
      ),
    [model, workflowId, session.expansions, loaded],
  );
  const container = useRef<HTMLDivElement>(null);
  const steps = useMemo(() => projectSequenceSteps(scene), [scene]);
  const visibleRows = useMemo(() => scene.rows.filter((row) => row.kind !== 'transfer'), [scene]);
  const stepRows = visibleRows.filter((row) => steps.has(row.id));
  const prelude: SequenceRow[] = [];
  const prerequisites = new Map<string, SequenceRow[]>();
  const annotations = new Map<string, SequenceRow[]>();
  for (const [index, row] of visibleRows.entries()) {
    if (steps.has(row.id)) continue;
    if (row.kind === 'prerequisite') {
      if (!row.step && !row.parentId) prelude.push(row);
      else {
        const owner = row.step
          ? stepRows.find((step) => step.step === row.step && step.parentId === row.parentId)
          : stepRows.find((step) => step.id === row.parentId);
        if (owner) {
          const placement = row.step ? prerequisites : annotations;
          placement.set(owner.id, [...(placement.get(owner.id) ?? []), row]);
        } else prelude.push(row);
      }
      continue;
    }
    const owner =
      stepRows.find((step) => step.id === row.parentId) ??
      stepRows.find(
        (step) =>
          step.step === row.step &&
          step.workflowId === row.workflowId &&
          step.parentId === row.parentId,
      ) ??
      stepRows.find(
        (step) => step.workflowId === row.workflowId && step.parentId === row.parentId,
      ) ??
      [...visibleRows.slice(0, index)].reverse().find((step) => steps.has(step.id)) ??
      stepRows[0];
    if (owner) annotations.set(owner.id, [...(annotations.get(owner.id) ?? []), row]);
  }
  const [openActions, setOpenActions] = useState<Record<string, boolean>>({});
  const toggleActions = (id: string) =>
    setOpenActions((current) => ({ ...current, [id]: !current[id] }));
  const hasStepContext = (row: SequenceRow) =>
    !!row.step &&
    (!!steps.get(row.id)?.actions.length ||
      !!row.step.prerequisites.length ||
      row.step.sourceBinding.timeout !== undefined ||
      row.step.sourceBinding.correlationId !== undefined);
  const readingLabel = (row: SequenceRow) =>
    `${steps.has(row.id) ? `${steps.get(row.id)?.number}. ` : ''}${interactionReadingLabel(row)}`;
  const controls = useRef(new Map<string, HTMLButtonElement>());
  const markerId = useId().replace(/:/g, '');
  const width = Math.max(660, scene.participants.length * 230);
  const offsets: number[] = [];
  let usedHeight = 0;
  for (const row of visibleRows) {
    offsets.push(usedHeight);
    usedHeight += 100 + (openActions[row.id] ? (steps.get(row.id)?.actions.length ?? 0) * 20 : 0);
  }
  const height = 30 + usedHeight;
  const xs = new Map(scene.participants.map((p, i) => [p.id, 115 + i * 230]));
  const contextName = (row: SequenceRow) =>
    ` · ${row.kind}${row.action ? ` ${row.action.channel} ${row.action.value.type} ${row.action.value.name} position ${row.action.effectiveIndex + 1}` : ''}${row.reason ? ` ${row.reason}` : ''} · root ${workflowId} · path ${row.path.map(([owner, step]) => `${owner}.${step}`).join(' → ') || 'root'} · row ${scene.rows.indexOf(row) + 1}`;
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
  useEffect(() => {
    const selected = session.selectedRow ?? session.details?.row;
    if (selected?.kind !== 'transfer') return;
    const owner = Array.from(steps).find(([, presentation]) =>
      presentation.actions.some((entry) => entry.transfer?.id === selected.id),
    )?.[0];
    if (owner)
      setOpenActions((current) => (current[owner] ? current : { ...current, [owner]: true }));
  }, [session.selectedRow, session.details, steps]);
  const select = (row: SequenceRow, control: HTMLElement | SVGElement) => {
    session.inspectRow(row, control);
    const svgRow = Array.from(
      container.current?.querySelectorAll<SVGGElement>('[data-sequence-id]') ?? [],
    ).find((element) => element.getAttribute('data-sequence-id') === row.id);
    svgRow?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  const renderAnnotation = (annotation: SequenceRow) => (
    <div
      className="arazzo-sequence-annotation"
      data-sequence-list-id={annotation.id}
      key={annotation.id}
    >
      {annotation.kind === 'prerequisite' || annotation.kind === 'marker' ? (
        <button
          ref={(element) => {
            if (element) controls.current.set(annotation.id, element);
            else controls.current.delete(annotation.id);
          }}
          className="arazzo-reading-identity"
          title={interactionReadingTitle(annotation)}
          aria-label={`Inspect ${annotation.workflowId}${annotation.step ? `.${annotation.step.stepId}` : ''}${contextName(annotation)}`}
          onClick={(event) => select(annotation, event.currentTarget)}
        >
          {interactionReadingLabel(annotation)}
        </button>
      ) : (
        <span title={interactionReadingTitle(annotation)}>
          {interactionReadingLabel(annotation)}
        </span>
      )}
      {annotation.kind === 'marker' && annotation.reason === 'rows' && (
        <button
          aria-label={`View complete documentation for ${annotation.workflowId}${contextName(annotation)}`}
          onClick={() => {
            if (annotation.workflowId !== workflowId && annotation.target) {
              session.clearTrail();
              navigateToTarget(annotation.target);
            }
            session.setView(annotation.workflowId, 'docs');
          }}
        >
          View complete documentation for {annotation.workflowId}
        </button>
      )}
      {annotation.kind === 'marker' &&
        annotation.reason !== 'collapsed' &&
        annotation.reason !== 'rows' &&
        annotation.step &&
        annotation.target?.navigable && (
          <button
            aria-label={`Open workflow ${annotation.target.workflowId}${contextName(annotation)}`}
            onClick={() => session.followCall(workflowId, annotation)}
          >
            Open workflow {annotation.target.workflowId}
          </button>
        )}
    </div>
  );
  return (
    <section aria-label={`Sequence ${workflowId}`} className="arazzo-sequence">
      <details className="arazzo-sequence-reading-help">
        <summary>How to read this sequence</summary>
        <p>
          Schematic authored interactions · structural continuations are not evaluated outcomes.
        </p>
        <p>
          Destinations use authored source bindings and explicitly loaded current contracts.
          Operation lookup does not establish validity or execution.
        </p>
      </details>
      <p role="status" className="arazzo-sequence-context">
        Root: {workflowId}
        {session.selectedRow && (
          <>
            {' '}
            · Selected {session.selectedRow.workflowId}.
            {session.selectedRow.step?.stepId ?? session.selectedRow.kind} ·{' '}
            {session.selectedRow.kind} · Caller path:{' '}
            {session.selectedRow.path.map(([owner, step]) => `${owner}.${step}`).join(' → ') ||
              'root'}
          </>
        )}
      </p>
      <div className="arazzo-sequence-canvas" ref={container}>
        <div
          aria-label="Sequence participants"
          className="arazzo-sequence-participants"
          style={{ width }}
        >
          {scene.participants.map((participant) => (
            <div key={participant.id} style={{ width: 230 }}>
              <span tabIndex={0} title={participant.name} className="arazzo-full-label">
                {participant.name}
              </span>
              <small>
                {participant.kind === 'source'
                  ? 'API description'
                  : participant.kind === 'workflow'
                    ? 'Workflow'
                    : 'Destination not established'}
              </small>
            </div>
          ))}
        </div>
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
                {participant.name} ({participant.kind})
              </title>
              <line
                x1={xs.get(participant.id)}
                x2={xs.get(participant.id)}
                y1={0}
                y2={height}
                stroke="#94a3b8"
                strokeDasharray="4 5"
              />
            </g>
          ))}
          {visibleRows
            .filter((row) => row.kind === 'call' && row.expanded)
            .map((row) => {
              const first = visibleRows.indexOf(row);
              const last = visibleRows.reduce(
                (end, other, index) => (descendant(other, row.id) ? index : end),
                first,
              );
              return (
                <rect
                  key={row.id}
                  x={8 + row.depth * 12}
                  y={5 + offsets[first]}
                  width={width - 16 - row.depth * 24}
                  height={
                    offsets[last] +
                    100 +
                    (openActions[visibleRows[last].id]
                      ? (steps.get(visibleRows[last].id)?.actions.length ?? 0) * 20
                      : 0) -
                    offsets[first] -
                    8
                  }
                  rx={6}
                  fill="none"
                  stroke="#7c3aed"
                  strokeDasharray="7 3"
                />
              );
            })}
          {visibleRows.map((row, index) => {
            const x1 = xs.get(row.from)!,
              x2 = xs.get(row.to)!;
            const y = 55 + offsets[index];
            const selected = session.selectedRow?.id === row.id;
            return (
              <g
                key={row.id}
                data-sequence-id={row.id}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${row.workflowId}${row.step ? `.${row.step.stepId}` : ''}${contextName(row)}`}
                onClick={(event) => select(row, event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  select(row, event.currentTarget);
                }}
              >
                <title>
                  {readingLabel(row)}
                  {contextName(row)}
                </title>
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
                  {wrap(readingLabel(row)).map((line, i) => (
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
                {hasStepContext(row) && (
                  <text
                    x={(x1 + x2) / 2}
                    y={y + 58}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#1d4ed8"
                    role="button"
                    tabIndex={0}
                    aria-label={`${openActions[row.id] ? 'Hide' : 'Show'} Conditions and recovery for ${row.workflowId}.${row.step?.stepId}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleActions(row.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      event.stopPropagation();
                      toggleActions(row.id);
                    }}
                  >
                    Conditions and recovery
                  </text>
                )}
                {openActions[row.id] &&
                  steps.get(row.id)?.actions.map(({ action }, actionIndex) => {
                    const label = `${action.channel === 'onSuccess' ? 'Success' : 'Failure'} · ${action.value.name ?? 'Authored action'} · ${action.value.type ?? action.status}${action.value.type === 'end' ? ' (end)' : ''}`;
                    return (
                      <text
                        key={`${action.channel}:${action.effectiveIndex}`}
                        x={(x1 + x2) / 2}
                        y={y + 80 + actionIndex * 20}
                        textAnchor="middle"
                        fontSize={12}
                        fill="#475569"
                      >
                        <title>{label}</title>
                        {wrap(label, 54)[0]}
                      </text>
                    );
                  })}
              </g>
            );
          })}
        </svg>
      </div>
      {prelude.map(renderAnnotation)}
      <ol aria-label="Ordered interactions" className="arazzo-sequence-list">
        {stepRows.map((row) => (
          <li
            key={row.id}
            data-sequence-list-id={row.id}
            style={{ paddingLeft: Math.min(row.depth, 8) * 12 }}
          >
            {prerequisites.get(row.id)?.map(renderAnnotation)}
            <button
              ref={(element) => {
                if (element) controls.current.set(row.id, element);
                else controls.current.delete(row.id);
              }}
              className="arazzo-reading-identity"
              title={interactionReadingTitle(row)}
              aria-label={`Inspect ${row.workflowId}${row.step ? `.${row.step.stepId}` : ''}${contextName(row)}`}
              onClick={(event) => select(row, event.currentTarget)}
            >
              {readingLabel(row)}
            </button>{' '}
            {row.kind === 'operation' &&
              row.step &&
              row.step.sourceBinding.status !== 'declared' &&
              row.destinationEvidence?.status !== 'located' && (
                <p className="arazzo-destination-explanation">
                  The API destination is not established.{' '}
                  {row.step.diagnostics.map((diagnostic) => diagnostic.message).join(' ')} View
                  details to inspect the authored locator and available API descriptions.
                </p>
              )}
            {row.destinationEvidence && (
              <small title={row.destinationEvidence.diagnostics?.join(' · ')}>
                {contractReadingStatus[row.destinationEvidence.status]}
              </small>
            )}
            {hasStepContext(row) && (
              <details className="arazzo-step-actions" open={!!openActions[row.id]}>
                <summary
                  aria-label={`Conditions and recovery for ${row.workflowId}.${row.step?.stepId}${contextName(row)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    toggleActions(row.id);
                  }}
                >
                  Conditions and recovery ({steps.get(row.id)?.actions.length ?? 0})
                </summary>
                <p>Possible authored actions; criteria are not evaluated.</p>
                {!!row.step?.prerequisites.length && (
                  <p>
                    Prerequisites:{' '}
                    {row.step.prerequisites
                      .map((entry) => `${entry.target.reference} (${entry.target.kind})`)
                      .join(', ')}
                  </p>
                )}
                {row.step?.sourceBinding.timeout !== undefined && (
                  <p>Timeout: {JSON.stringify(row.step.sourceBinding.timeout)}</p>
                )}
                {row.step?.sourceBinding.correlationId !== undefined && (
                  <p>Correlation: {JSON.stringify(row.step.sourceBinding.correlationId)}</p>
                )}
                <ul>
                  {steps.get(row.id)?.actions.map(({ action, transfer }) => (
                    <li
                      key={`${action.channel}:${action.origin}:${action.authoredIndex}:${action.effectiveIndex}`}
                    >
                      <strong>{action.channel === 'onSuccess' ? 'Success' : 'Failure'}</strong> ·{' '}
                      {action.value.name ?? action.authored.reference ?? 'Authored action'} ·{' '}
                      {action.value.type ?? action.status}
                      {action.value.type === 'end' && ' · End'}
                      {action.target && ` · ${action.target.reference} (${action.target.kind})`}
                      {transfer?.returnTo === 'source-step' &&
                        ` · returns to retry ${row.step?.stepId}`}
                      {action.value.criteria !== undefined &&
                        ` · criteria ${JSON.stringify(action.value.criteria)}`}
                      {action.value.retryLimit !== undefined &&
                        ` · retry limit ${JSON.stringify(action.value.retryLimit)}`}
                      {action.value.retryAfter !== undefined &&
                        ` · retry delay ${JSON.stringify(action.value.retryAfter)}`}
                      <button
                        aria-label={`Inspect ${action.channel} ${action.value.name ?? action.authored.reference ?? 'action'} position ${action.effectiveIndex + 1}${contextName(row)}`}
                        onClick={(event) =>
                          transfer
                            ? select(transfer, event.currentTarget)
                            : select(row, event.currentTarget)
                        }
                      >
                        Inspect authored action
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {row.kind === 'call' && row.target?.navigable && (
              <>
                <button
                  aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${row.workflowId}.${row.step?.stepId} → ${row.target.workflowId}${contextName(row)}`}
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
                  aria-label={`Open workflow ${row.target.workflowId} from ${row.workflowId}.${row.step?.stepId}${contextName(row)}`}
                  onClick={() => session.followCall(workflowId, row)}
                >
                  Open workflow
                </button>
              </>
            )}
            {annotations.get(row.id)?.map(renderAnnotation)}
          </li>
        ))}
      </ol>
    </section>
  );
}
