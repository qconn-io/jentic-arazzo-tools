import React from 'react';
import type { ReadingSection } from '../utils/sequence/occurrenceDetails';

// preserve types and exact expressions, including empty containers and falsy leaves.
export function ReadingValue({ value }: { value: unknown }) {
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return <code>{Array.isArray(value) ? '[]' : '{}'}</code>;
    return (
      <dl className="arazzo-value-tree">
        {entries.map(([key, child]) => (
          <div key={key}>
            <dt>{Array.isArray(value) ? `[${key}]` : key}</dt>
            <dd>
              <ReadingValue value={child} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <>
      <code className="arazzo-exact-value">
        {typeof value === 'string'
          ? value === ''
            ? '"" (empty string)'
            : value
          : value === undefined
            ? 'undefined'
            : JSON.stringify(value)}
      </code>
      <small className="arazzo-value-type"> · {value === null ? 'null' : typeof value}</small>
    </>
  );
}
function PresentValue({ present, value }: { present: boolean; value?: unknown }) {
  return present ? (
    <ReadingValue value={value} />
  ) : (
    <span className="arazzo-absent">Not declared</span>
  );
}
function ValueRows({
  rows,
  present = false,
  value,
}: {
  rows: Extract<ReadingSection, { kind: 'values' }>['rows'];
  present?: boolean;
  value?: unknown;
}) {
  if (!rows.length) return <PresentValue present={present} value={value} />;
  return (
    <dl className="arazzo-value-rows">
      {rows.map((row, index) => (
        <div key={index}>
          <dt>
            {row.label}
            {row.location && <small> · {row.location}</small>}
            {row.status && row.status !== 'resolved' && <small> · {row.status}</small>}
          </dt>
          <dd>
            <PresentValue {...row} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function ReadingDetails({ sections }: { sections: ReadingSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <section
          key={section.title}
          data-reading-section={section.title}
          className="arazzo-reading-section"
        >
          <h3>{section.title}</h3>
          {section.kind === 'values' && <ValueRows {...section} />}
          {section.kind === 'tree' && <PresentValue {...section} />}
          {section.kind === 'prerequisites' &&
            (section.entries.length ? (
              <ul>
                {section.entries.map((entry, index) => (
                  <li key={index}>
                    <code>{entry.target.reference}</code> · {entry.target.kind}
                    {entry.stepId
                      ? ` · step ${entry.workflowId}.${entry.stepId}`
                      : ` · workflow ${entry.workflowId}`}
                    {entry.target.reason && <p>{entry.target.reason}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>None declared</p>
            ))}
          {section.kind === 'recovery' && (
            <>
              <p>
                Possible conditional actions. Inspection order does not evaluate criteria or select
                an outcome.
              </p>
              {!section.cards.length && <p>None declared</p>}
              {section.cards.map((card, index) => (
                <article key={index} className="arazzo-recovery-card">
                  <h4>{card.name}</h4>
                  <p>
                    {card.channel} · {card.origin}
                    {card.isOverride ? ' · overrides workflow default' : ''} · {card.status} ·
                    inspection position {card.index + 1}
                  </p>
                  <p>{card.semantics}</p>
                  {card.target && (
                    <p>
                      Target: <code>{card.target.reference}</code> · {card.target.kind}
                      {card.target.reason && ` · ${card.target.reason}`}
                    </p>
                  )}
                  {card.criteria.present && (
                    <>
                      <strong>Conditional criteria (not evaluated)</strong>
                      <PresentValue {...card.criteria} />
                    </>
                  )}
                  <ValueRows rows={card.parameters} {...card.parameterContainer} />
                  {(card.retryLimit.present || card.retryAfter.present) && (
                    <ValueRows
                      rows={[
                        { label: 'Retry limit', ...card.retryLimit },
                        { label: 'Retry delay', ...card.retryAfter },
                      ]}
                    />
                  )}
                </article>
              ))}
            </>
          )}
        </section>
      ))}
    </>
  );
}
