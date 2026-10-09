import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let renderId = 0;

export function MermaidDiagram({
  source,
  onReadDescriptions,
}: {
  source: string;
  onReadDescriptions: () => void;
}) {
  const generation = useRef(0);
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    source: string;
    svg?: string;
    width?: number;
    error?: string;
    loading: boolean;
  }>({ source, loading: true });
  useEffect(() => {
    const current = ++generation.current;
    const sandbox = document.createElement('div');
    sandbox.style.cssText =
      'position:absolute;left:-9999px;top:-9999px;visibility:hidden;overflow:hidden;width:0;height:0';
    document.body.appendChild(sandbox);
    setResult((previous) => ({
      source,
      loading: true,
      error: previous.source === source ? previous.error : undefined,
    }));
    const id = `mermaid-diagram-${++renderId}`;
    Promise.resolve()
      .then(() => mermaid.render(id, source, sandbox))
      .then(
        ({ svg }) => {
          if (generation.current === current) {
            const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
            const width = Number(
              root
                .getAttribute('viewBox')
                ?.trim()
                .split(/[\s,]+/)[2],
            );
            setResult({
              source,
              svg,
              width: Number.isFinite(width) && width > 0 ? width : undefined,
              loading: false,
            });
          }
        },
        (error: unknown) => {
          if (generation.current === current)
            setResult({
              source,
              error: error instanceof Error ? error.message : String(error),
              loading: false,
            });
        },
      )
      .finally(() => sandbox.remove());
    return () => {
      ++generation.current;
    };
  }, [source, attempt]);
  const active = result.source === source ? result : { source, loading: true };
  return (
    <div
      ref={container}
      className="arazzo-mermaid-diagram"
      role="region"
      aria-label="Flowchart"
      tabIndex={0}
      style={{ overflowX: 'auto', maxWidth: '100%' }}
    >
      {active.loading && <p role="status">Drawing flowchart…</p>}
      {active.error && (
        <div className="arazzo-diagram-error" role="alert">
          <p>Unable to draw this flowchart</p>
          <button
            className="arazzo-detail-action"
            disabled={active.loading}
            onClick={(event) => {
              if (document.activeElement === event.currentTarget) container.current?.focus();
              setAttempt((value) => value + 1);
            }}
          >
            Retry diagram
          </button>
          <button className="arazzo-detail-action" onClick={onReadDescriptions}>
            Read step descriptions
          </button>
          <details>
            <summary>Rendering details</summary>
            <p>{active.error}</p>
          </details>
        </div>
      )}
      {active.svg && (
        <div
          className="mermaid-rendered"
          style={{ width: active.width }}
          dangerouslySetInnerHTML={{ __html: active.svg }}
        />
      )}
    </div>
  );
}
