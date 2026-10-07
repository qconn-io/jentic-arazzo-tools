import { actionAddress, rowOccurrence } from '../utils/location/resolve';
import ReactMarkdown from 'react-markdown';
import React, { useMemo, useState } from 'react';
import { useScenario } from '../context/ScenarioContext';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import { resolveScenarioWaypoint } from '../utils/scenario/manifest';
import type { AuthoredScenario, ScenarioWaypoint } from '../types/scenario';
import type { ArazzoUIProps } from '../types/viewer';
export function ScenarioPanel({ props }: { props: ArazzoUIProps }) {
  const guide = useScenario();
  const viewer = useArazzoViewer();
  const session = useViewerSession();
  const [search, setSearch] = useState('');
  const source = guide?.source;
  const selection = guide?.selection;
  const manifest = guide?.manifest.manifest;
  const validIdentity =
    selection?.manifest === guide?.identity && selection?.revision === manifest?.revision;
  const scenario = validIdentity
    ? manifest?.scenarios.find((s) => s.id === selection?.scenarioId)
    : undefined;
  const index = scenario?.waypoints?.findIndex((w) => w.id === selection?.waypointId) ?? -1;
  const point = scenario?.waypoints?.[index];
  const resolved = useMemo(
    () =>
      point
        ? resolveScenarioWaypoint(
            viewer.model,
            viewer.snapshot.authoredDocument,
            point,
            source ?? { document: '' },
          )
        : undefined,
    [point, viewer.model, viewer.snapshot, source?.document, source?.revision, source?.digest],
  );
  if (!guide) return null;
  const open = (s: AuthoredScenario, w?: ScenarioWaypoint, origin?: HTMLElement) => {
    const waypoint = w ?? {
      id: '',
      narrative: '',
      location: {
        version: 1 as const,
        document: s.document,
        root: s.workflow,
        view: props.view ?? 'docs',
        subview: 'docs' as const,
      },
    };
    guide.select(
      {
        manifest: guide.identity,
        ...(props.scenarioManifestURI ? { manifestURI: props.scenarioManifestURI } : {}),
        ...(manifest?.revision ? { revision: manifest.revision } : {}),
        scenarioId: s.id,
        ...(w ? { waypointId: w.id } : {}),
      },
      waypoint,
      origin,
    );
  };
  const invalid =
    selection &&
    (selection.manifest !== guide.identity || selection.revision !== manifest?.revision
      ? 'Unavailable manifest identity or revision.'
      : !scenario
        ? `Unavailable scenario: ${selection.scenarioId}`
        : selection.waypointId && !point
          ? `Unavailable waypoint: ${selection.waypointId}`
          : undefined);
  return (
    <section role="region" aria-label="Authored scenario guides" className="arazzo-scenario-panel">
      <h2>Authored scenario guides</h2>
      <p>
        <strong>Authored expectations · inspection only</strong>
      </p>
      <p>These guides do not execute operations, evaluate criteria, or report test results.</p>
      <label>
        Search scenarios{' '}
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      {guide.manifest.diagnostics.map((message, i) => (
        <p role="status" key={i}>
          {message}
        </p>
      ))}
      <div className="arazzo-scenario-list">
        {manifest?.scenarios
          .filter((s) =>
            [s.id, s.title, s.expected, s.assumptions, ...(s.tags ?? [])]
              .join(' ')
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((s) => (
            <button
              key={s.id}
              aria-pressed={s.id === scenario?.id}
              onClick={(e) => open(s, s.waypoints?.[0], e.currentTarget)}
            >
              {s.title ?? s.id}
            </button>
          ))}
      </div>
      {invalid && <p role="status">{invalid}</p>}
      {scenario && (
        <div className="arazzo-scenario-current">
          <h3>{scenario.title ?? scenario.id}</h3>
          {scenario.assumptions !== undefined && (
            <>
              <h4>Authored assumptions</h4>
              <ReactMarkdown>{scenario.assumptions}</ReactMarkdown>
            </>
          )}
          <h4>Expected outcome (authored)</h4>
          <ReactMarkdown>{scenario.expected}</ReactMarkdown>
          <h4>Evidence description (authored)</h4>
          <ReactMarkdown>{scenario.evidence}</ReactMarkdown>
          {!scenario.waypoints?.length && (
            <p>No authored waypoints. Only the declared workflow is addressed.</p>
          )}
          {point && (
            <>
              <h4>
                Waypoint {index + 1} of {scenario.waypoints?.length}: {point.id}
              </h4>
              <ReactMarkdown>{point.narrative}</ReactMarkdown>
              <p>
                Address: {point.location.document} · {point.location.root}
                {point.location.selection
                  ? ` · ${point.location.selection.workflowId}.${point.location.selection.stepId}`
                  : ''}
              </p>
              {point.focus && (
                <p>
                  Authored {point.focus.kind} focus: <code>{point.focus.pointer}</code>
                </p>
              )}
              {resolved && resolved.status.state !== 'restored' && (
                <p role="status">{resolved.status.message}</p>
              )}
            </>
          )}
          <div className="arazzo-scenario-controls">
            <button
              disabled={index <= 0}
              onClick={(e) => open(scenario, scenario.waypoints![index - 1], e.currentTarget)}
            >
              Previous waypoint
            </button>
            <button
              disabled={index < 0 || index >= (scenario.waypoints?.length ?? 0) - 1}
              onClick={(e) => open(scenario, scenario.waypoints![index + 1], e.currentTarget)}
            >
              Next waypoint
            </button>
            <button
              disabled={
                !point || !resolved || !['restored', 'bounded'].includes(resolved.status.state)
              }
              onClick={(e) => open(scenario, point, e.currentTarget)}
            >
              Inspect waypoint details
            </button>
            <button onClick={() => session.closeDetails()}>Return to guide</button>
            <button
              onClick={() => {
                guide.select(null);
                session.closeDetails();
              }}
            >
              Leave guide
            </button>
          </div>
        </div>
      )}
      {selection && !scenario && <button onClick={() => guide.select(null)}>Leave guide</button>}
    </section>
  );
}
export function ScenarioFocusDetails() {
  const guide = useScenario();
  const viewer = useArazzoViewer();
  const validIdentity =
    guide?.selection?.manifest === guide?.identity &&
    guide?.selection?.revision === guide?.manifest.manifest?.revision;
  const point = validIdentity
    ? guide?.manifest.manifest?.scenarios
        .find((s) => s.id === guide.selection?.scenarioId)
        ?.waypoints?.find((w) => w.id === guide.selection?.waypointId)
    : undefined;
  const session = useViewerSession();
  if (
    !point?.focus ||
    !session.details ||
    session.details.workflowId !== point.location.selection?.workflowId ||
    session.details.stepId !== point.location.selection?.stepId
  )
    return null;
  const selected = point.location.selection!;
  const detail = session.details;
  if (viewer.activeWorkflowId !== point.location.root) return null;
  if (
    selected.occurrence !== undefined &&
    (!detail.row ||
      JSON.stringify(rowOccurrence(detail.row)) !==
        JSON.stringify(selected.occurrence.map((site) => [site.workflowId, site.stepId])))
  )
    return null;
  if (selected.occurrence === undefined && detail.row && !detail.authoredOnly) return null;
  if (selected.kind === 'action') {
    if (!detail.row?.action) return null;
    const actual = actionAddress(detail.row.action, guide!.source.document);
    const wanted = selected.action;
    if (
      actual.document !== wanted.document ||
      actual.pointer !== wanted.pointer ||
      actual.usePointer !== wanted.usePointer ||
      actual.channel !== wanted.channel ||
      actual.index !== wanted.index ||
      (wanted.name !== undefined && actual.name !== wanted.name)
    )
      return null;
  } else if (detail.row?.action) return null;
  const result = resolveScenarioWaypoint(
    viewer.model,
    viewer.snapshot.authoredDocument,
    point,
    guide!.source,
  );
  if (!['restored', 'bounded'].includes(result.status.state)) return null;
  return (
    <section aria-label="Authored guide focus">
      <h3>Authored {point.focus.kind} focus</h3>
      <ReactMarkdown>{point.narrative}</ReactMarkdown>
      <code>{point.focus.pointer}</code>
      <pre>{JSON.stringify(result.focusValue, null, 2)}</pre>
    </section>
  );
}
