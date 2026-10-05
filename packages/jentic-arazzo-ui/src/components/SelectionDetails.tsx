import React, { useEffect, useRef, useState } from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import { CopyLocationControl } from '../context/CopyLinkContext';
import { ReadingDetails } from './ReadingDetails';
import { projectOccurrenceDetails } from '../utils/sequence/occurrenceDetails';

function useCoveringInspector() {
  const [covering, setCovering] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 600px)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 600px)');
    if (!media) return;
    const update = () => setCovering(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return covering;
}
function focusableControls(panel: HTMLElement): HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary, [tabindex]',
    ),
  ).filter((element) => {
    if (element.getAttribute('tabindex') === '-1' || element.matches(':disabled')) return false;
    let ancestor: HTMLElement | null = element;
    while (ancestor && ancestor !== panel) {
      if (ancestor.hidden || getComputedStyle(ancestor).display === 'none') return false;
      if (
        ancestor.tagName === 'DETAILS' &&
        !ancestor.hasAttribute('open') &&
        !(element.tagName === 'SUMMARY' && element.parentElement === ancestor)
      )
        return false;
      ancestor = ancestor.parentElement;
    }
    return true;
  });
}

export function SelectionDetails() {
  const { model } = useArazzoViewer();
  const session = useViewerSession();
  const selection = session.details;
  const closeControl = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const covering = useCoveringInspector();
  const latest = useRef(session);
  latest.current = session;
  const open = !!selection;
  useEffect(() => {
    const element = panel.current;
    if (!open || !element) return;
    const scope =
      element.closest('.arazzo-ui-standalone') ??
      element.closest('.arazzo-ui') ??
      element.parentElement;
    const fallback = element
      .closest('.arazzo-viewer-shell')
      ?.querySelector<HTMLElement>('.arazzo-workflow-navigation select');
    const background: { element: HTMLElement; inert: boolean; hidden: string | null }[] = [];
    if (covering) {
      let child: HTMLElement = element;
      while (child !== document.body && child.parentElement) {
        for (const sibling of Array.from(child.parentElement.children)) {
          if (
            sibling === child ||
            !(sibling instanceof HTMLElement) ||
            ['STYLE', 'SCRIPT'].includes(sibling.tagName)
          )
            continue;
          background.push({
            element: sibling,
            inert: sibling.hasAttribute('inert'),
            hidden: sibling.getAttribute('aria-hidden'),
          });
          sibling.setAttribute('inert', '');
          sibling.setAttribute('aria-hidden', 'true');
        }
        child = child.parentElement;
      }
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && scope?.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
        latest.current.closeDetails();
      } else if (covering && event.key === 'Tab') {
        const controls = focusableControls(element);
        const first = controls[0] ?? closeControl.current!;
        const last = controls.at(-1) ?? first;
        if (
          !element.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    };
    const focusin = (event: FocusEvent) => {
      if (covering && !element.contains(event.target as Node)) closeControl.current?.focus();
    };
    document.addEventListener('keydown', keydown);
    if (covering) document.addEventListener('focusin', focusin);
    closeControl.current?.focus();
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusin);
      for (const entry of background) {
        if (!entry.inert) entry.element.removeAttribute('inert');
        if (entry.hidden === null) entry.element.removeAttribute('aria-hidden');
        else entry.element.setAttribute('aria-hidden', entry.hidden);
      }
      if (!latest.current.details) latest.current.restoreDetailsFocus(fallback ?? undefined);
    };
  }, [open, covering]);
  const details =
    selection &&
    projectOccurrenceDetails(model, selection.workflowId, selection.stepId, selection.row);
  if (!details) return null;
  return (
    <aside
      ref={panel}
      role={covering ? 'dialog' : 'region'}
      aria-modal={covering ? true : undefined}
      aria-label="Selection details"
      className="arazzo-selection-details"
    >
      <button ref={closeControl} onClick={session.closeDetails}>
        Close details
      </button>
      <CopyLocationControl />
      <h2>{details.title}</h2>
      {session.locationStatus &&
        (session.locationStatus.state !== 'restored' ||
          !!session.locationStatus.notices?.length) && (
          <p role="status">
            {session.locationStatus.message} {session.locationStatus.notices?.join(' ')}
          </p>
        )}
      <section aria-label="Owning context">
        <h3>Context</h3>
        <dl className="arazzo-value-rows">
          <div>
            <dt>Owning workflow</dt>
            <dd>{details.reading.context.owningWorkflow}</dd>
          </div>
          <div>
            <dt>Step</dt>
            <dd>{details.reading.context.step ?? 'Workflow context'}</dd>
          </div>
          <div>
            <dt>Call path</dt>
            <dd>
              {details.reading.context.callPath.length
                ? details.reading.context.callPath
                    .map(([workflow, step]) => `${workflow}.${step}`)
                    .join(' → ')
                : 'Authored location (no call occurrence selected)'}
            </dd>
          </div>
          {details.reading.context.callee && (
            <div>
              <dt>Callee</dt>
              <dd>
                {details.reading.context.callee} · {details.reading.context.classification}
              </dd>
            </div>
          )}
        </dl>
      </section>
      <ReadingDetails sections={details.reading.sections} />
      <details data-advanced>
        <summary>Advanced authored content and provenance</summary>
        {details.sections.map((section) => (
          <details key={section.title}>
            <summary>{section.title}</summary>
            <pre>
              {typeof section.value === 'string'
                ? section.value
                : JSON.stringify(section.value, null, 2)}
            </pre>
          </details>
        ))}
      </details>
    </aside>
  );
}
