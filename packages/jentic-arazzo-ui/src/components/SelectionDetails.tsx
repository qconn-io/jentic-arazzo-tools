import { ScenarioFocusDetails } from './ScenarioPanel';
import { SystemsDetails } from './SystemsDetails';
import React, { useEffect, useRef, useState, type RefObject } from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { useViewerSession } from '../context/ViewerSessionContext';
import { CopyLocationControl } from '../context/CopyLinkContext';
import { ReadingDetails } from './ReadingDetails';
import { ContractPanel } from './ContractPanel';
import { projectOccurrenceDetails } from '../utils/sequence/occurrenceDetails';

function useCoveringInspector(panel: RefObject<HTMLElement>, open: boolean) {
  const [covering, setCovering] = useState(false);
  useEffect(() => {
    const element = panel.current;
    const viewer = element?.closest('.arazzo-viewer-shell') ?? element?.parentElement;
    if (!open || !element || !viewer) return;
    const update = () => {
      const bounds = viewer.getBoundingClientRect();
      const inspector = element.getBoundingClientRect();
      const overlap = Math.max(
        0,
        Math.min(bounds.right, inspector.right) - Math.max(bounds.left, inspector.left),
      );
      setCovering(bounds.width > 0 && bounds.width - overlap < 320);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    observer?.observe(viewer);
    observer?.observe(element);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [panel, open]);
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
  const covering = useCoveringInspector(panel, !!selection);
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
    const shell = element.closest('.arazzo-viewer-shell');
    const fallback =
      shell?.querySelector<HTMLElement>('.arazzo-scenario-controls button:not(:disabled)') ??
      shell?.querySelector<HTMLElement>('.arazzo-workflow-navigation select');
    const background: { element: HTMLElement; inert: string | null; hidden: string | null }[] = [];
    if (covering) {
      let child: HTMLElement = element;
      while (child !== scope && child !== document.body && child.parentElement) {
        for (const sibling of Array.from(child.parentElement.children)) {
          if (
            sibling === child ||
            !(sibling instanceof HTMLElement) ||
            ['STYLE', 'SCRIPT'].includes(sibling.tagName)
          )
            continue;
          background.push({
            element: sibling,
            inert: sibling.getAttribute('inert'),
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
        if (entry.inert === null) entry.element.removeAttribute('inert');
        else entry.element.setAttribute('inert', entry.inert);
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
      data-covering={covering}
    >
      <button ref={closeControl} onClick={session.closeDetails}>
        Close details
      </button>
      <CopyLocationControl />
      <h2>{details.title}</h2>
      <section aria-label="Supplied system information">
        <SystemsDetails />
      </section>
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
      <section aria-label="Authored guide">
        <ScenarioFocusDetails />
      </section>
      <section aria-label="Workflow declaration">
        <h3>Workflow declaration</h3>
        <ReadingDetails sections={details.reading.sections} />
      </section>
      {selection?.stepId && (
        <section aria-label="API description">
          <ContractPanel workflowId={selection.workflowId} stepId={selection.stepId} />
        </section>
      )}
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
