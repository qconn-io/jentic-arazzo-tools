import React, { useEffect, useState } from 'react';
import { ArazzoUI } from './ArazzoUI';
import { ReadingValue } from './components/ReadingDetails';
import { SourceRevisionContext } from './context/SourceRevisionContext';
import type {
  ArazzoWorkflowReviewProps,
  WorkflowReviewEvidence,
  WorkflowReviewImpact,
  WorkflowReviewResult,
} from './types/review';
import type { WorkflowLocation } from './types/location';
import type { SourceDocumentProvider } from './types/source';
import { prepareWorkflowReview, type ReviewProjection } from './utils/review/inputs';
import { buildWorkflowReview, exportWorkflowReview } from './utils/review';
import './styles/index.css';
const categories = [
  'structure',
  'declarations',
  'mappings',
  'criteria',
  'actions',
  'sources',
  'metadata',
  'contracts',
];
type Side = 'baseline' | 'candidate';

function RevisionInspector({
  projection,
  location,
}: {
  projection: ReviewProjection;
  location: WorkflowLocation;
}) {
  const doc = projection.loaded.documents.find(
    (d) => d.uri === location.document && d.definition.revision === location.revision,
  );
  const provider: SourceDocumentProvider = {
    async load(request) {
      const documents = projection.loaded.documents.filter(
        (d) =>
          d.uri === request.uri &&
          (!request.revision || d.definition.revision === request.revision),
      );
      if (documents.length !== 1) throw new Error('Exact pinned review source unavailable');
      const source = documents[0];
      return {
        content: source.content,
        retrievalURI: source.uri,
        revision: source.definition.revision,
      };
    },
  };
  if (!doc) return <p>Semantic inspection unavailable. Authored content remains readable above.</p>;
  const pins = Object.fromEntries(
    [...doc.sources].flatMap(([name, value]) =>
      value instanceof Error ? [] : [[name, value.definition.revision]],
    ),
  );
  return (
    <div className="arazzo-review-inspector">
      <SourceRevisionContext.Provider value={pins}>
        <ArazzoUI
          key={`${doc.definition.id}:${doc.definition.revision}:${JSON.stringify(location)}`}
          document={JSON.stringify(
            projection.documents.find((d) => d.definition.id === doc.definition.id)!.raw,
          )}
          documentIdentity={doc.uri}
          documentRevision={doc.definition.revision}
          sourceProvider={provider}
          defaultLocation={location}
          view="docs"
        />
      </SourceRevisionContext.Provider>
    </div>
  );
}
function Evidence({ evidence }: { evidence?: WorkflowReviewEvidence }) {
  if (!evidence?.present) return <p>Absent in this revision</p>;
  return (
    <>
      <p>
        <code>{evidence.documentId}</code> / <code>{evidence.revision}</code> /{' '}
        <code>{evidence.pointer}</code>
      </p>
      <p>
        Authored digest: <code>{evidence.digest}</code>
      </p>
      <ReadingValue value={evidence.value} />
    </>
  );
}
function Impact({
  impact,
  open,
}: {
  impact: WorkflowReviewImpact;
  open: (location: WorkflowLocation) => void;
}) {
  return (
    <section aria-label="Potential usage exposure">
      <h4>Potential usage exposure</h4>
      <p>
        {impact.complete
          ? 'Indexed supplied scope only.'
          : 'Partial coverage; unknown consumers may exist.'}{' '}
        {impact.truncated && 'Traversal truncated at configured limits.'} Runtime effect
        undetermined.
      </p>
      <p>
        {impact.visitedRelationships} visited relationships · {impact.cycles.length} cycles
      </p>
      <ul>
        {impact.direct.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => open(r.location)}>
              Direct {r.kind}: {r.from.documentId} / {r.from.revision} / {r.from.workflowId} /{' '}
              {r.location.selection?.stepId ?? ''}
            </button>
          </li>
        ))}
      </ul>
      <ul>
        {impact.paths.map((p, i) => (
          <li key={i}>
            Potential entry: {p.entry.documentId} / {p.entry.revision} / {p.entry.workflowId}
            <ol>
              {p.relationships.map((r, j) => (
                <li key={j}>
                  <button type="button" onClick={() => open(r.location)}>
                    {r.kind}: {r.from.workflowId} / {r.location.selection?.stepId ?? r.reference}
                  </button>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
      {impact.cycles.length > 0 && (
        <details>
          <summary>Cycle provenance</summary>
          <ReadingValue value={impact.cycles} />
        </details>
      )}
    </section>
  );
}
/** Optional immutable two-revision review with isolated authored inspection. @public */
export function ArazzoWorkflowReview(props: ArazzoWorkflowReviewProps) {
  const { baseline, candidate, options } = props;
  const [state, setState] = useState<{
    baseline: typeof baseline;
    candidate: typeof candidate;
    options: typeof options;
    projections?: { baseline: ReviewProjection; candidate: ReviewProjection };
    result?: WorkflowReviewResult;
    error?: string;
  }>();
  const [category, setCategory] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [inspection, setInspection] = useState<{ side: Side; location: WorkflowLocation }>();
  useEffect(() => {
    let cancelled = false;
    setState({ baseline, candidate, options });
    setSelectedId(undefined);
    setInspection(undefined);
    const captured = structuredClone(options ?? {});
    prepareWorkflowReview(baseline, candidate, captured)
      .then((projections) => {
        const result = buildWorkflowReview(projections, captured);
        if (!cancelled) setState({ baseline, candidate, options, projections, result });
      })
      .catch((error) => {
        if (!cancelled) setState({ baseline, candidate, options, error: String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [baseline, candidate, options]);
  const current =
    state?.baseline === baseline && state.candidate === candidate && state.options === options
      ? state
      : undefined;
  if (current?.error)
    return (
      <div className="arazzo-review" role="alert">
        Review unavailable: {current.error}
      </div>
    );
  if (!current?.result || !current.projections)
    return <p role="status">Preparing supplied revisions…</p>;
  const result = current.result,
    projections = current.projections;
  const findings = result.findings.filter((f) => !category || f.category === category);
  const selected = findings.find((f) => f.id === selectedId);
  const open = (side: Side, location: WorkflowLocation) => {
    setInspection({ side, location });
    props.onLocationRequest?.(side, structuredClone(location));
  };
  const download = (format: 'json' | 'markdown') => {
    const content = exportWorkflowReview(result, format);
    if (props.onExport) {
      props.onExport(format, content);
      return;
    }
    const url = URL.createObjectURL(
      new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-review.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className={`arazzo-ui arazzo-review ${props.className ?? ''}`}>
      <h2>Workflow revision review</h2>
      <p>
        Baseline: {result.baseline.id} / {result.baseline.revision} · Candidate:{' '}
        {result.candidate.id} / {result.candidate.revision}
      </p>
      <p>Authored differences · potential usage exposure · runtime effect undetermined</p>
      <section aria-label="Review coverage">
        <h3>Supplied revision coverage</h3>
        {(['baseline', 'candidate'] as const).map((side) => (
          <div key={side}>
            <h4>
              {side} / {result[side].revision}
            </h4>
            <ul>
              {[
                ...new Map(
                  result[side].coverage.map((c) => [
                    JSON.stringify([c.uri, c.revision, c.state, c.message]),
                    c,
                  ]),
                ).values(),
              ].map((c) => (
                <li key={c.key}>
                  {c.uri} · {c.revision ?? 'revision unavailable'} · {c.state}
                  {c.message && ` · ${c.message}`}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <div className="arazzo-review-controls">
        <label>
          Finding category{' '}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setInspection(undefined);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => download('json')}>
          Export JSON
        </button>
        <button type="button" onClick={() => download('markdown')}>
          Export Markdown
        </button>
      </div>
      <p>
        {result.findings.length} authored findings · {findings.length} shown
      </p>
      <section aria-label="Review findings">
        <h3>Findings</h3>
        {!findings.length && <p>No findings in this category</p>}
        <ul>
          {findings.map((f) => {
            const e = f.before?.present ? f.before : f.after!;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  aria-pressed={f.id === selectedId}
                  onClick={() => {
                    setSelectedId(f.id);
                    setInspection(undefined);
                  }}
                >
                  {f.category} · {f.kind} · {e.documentId} / {e.workflowId ?? 'document'} /{' '}
                  {e.stepId ?? ''} / {e.pointer}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {selected && (
        <div className="arazzo-review-sides">
          {(['baseline', 'candidate'] as const).map((side) => {
            const e = side === 'baseline' ? selected.before : selected.after,
              label = side === 'baseline' ? 'Before' : 'After';
            return (
              <section key={side} aria-label={`${label} · ${result[side].revision}`}>
                <h3>
                  {label} · {result[side].revision}
                </h3>
                <Evidence evidence={e} />
                {e?.present && e.location && (
                  <button type="button" onClick={() => open(side, e.location!)}>
                    Open {label.toLowerCase()} location
                  </button>
                )}
                <Impact
                  impact={side === 'baseline' ? selected.baselineImpact : selected.candidateImpact}
                  open={(location) => open(side, location)}
                />
                {selected.effects
                  .filter((x) => x.side === side)
                  .map((effect, i) => (
                    <details key={i}>
                      <summary>
                        Applicable action use · {effect.location.root} /{' '}
                        {effect.location.selection?.stepId}
                      </summary>
                      <p>Declaration: {effect.declarationPointer}</p>
                      <ReadingValue value={effect.value} />
                      <button type="button" onClick={() => open(side, effect.location)}>
                        Open applicable use
                      </button>
                    </details>
                  ))}
                {inspection?.side === side && (
                  <>
                    <h4>Inspecting {result[side].revision}</h4>
                    <RevisionInspector
                      projection={projections[side]}
                      location={inspection.location}
                    />
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
