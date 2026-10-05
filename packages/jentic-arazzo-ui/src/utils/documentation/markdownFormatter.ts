import { unified } from 'unified';
import remarkParse from 'remark-parse';

import type {
  DocumentationMetadata,
  DocumentationPrerequisite,
  StepDocumentation,
  WorkflowDocumentation,
} from '../../types/viewer';
import type { EffectiveAction } from '../model/viewerModel';
import type { InspectionDiagnostic, PlainObject } from '../inspection';

export interface FormatOptions {
  includeMetadata?: boolean;
  includeDiagrams?: boolean;
}
type InspectionDetails = { authored?: PlainObject; diagnostics?: InspectionDiagnostic[] };
type InspectedStep = StepDocumentation &
  InspectionDetails & { actionDetails?: Record<'onSuccess' | 'onFailure', EffectiveAction[]> };

export function escapeHTML(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const descriptionParser = unified().use(remarkParse);
interface MarkdownNode {
  type: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}
function safeDescriptionMarkdown(value: string): string {
  const htmlSpans: { start: number; end: number }[] = [];
  const visit = (node: MarkdownNode) => {
    if (node.type === 'html') {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) htmlSpans.push({ start, end });
    }
    node.children?.forEach(visit);
  };
  visit(descriptionParser.parse(value));
  // Escape only parsed HTML, preserving CommonMark autolinks, code and authored formatting.
  for (const { start, end } of htmlSpans.sort((a, b) => b.start - a.start))
    value = value.slice(0, start) + escapeHTML(value.slice(start, end)) + value.slice(end);
  return value;
}
function valueText(value: unknown): string {
  return typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? '');
}
function rawDetails(title: string, value: unknown): string {
  return `<details class="step-detail"><summary>${escapeHTML(title)}</summary><pre>${escapeHTML(valueText(value))}</pre></details>`;
}
function safeURL(value: string): string {
  const compact = Array.from(value)
    .filter((character) => character.charCodeAt(0) > 32)
    .join('');
  return /^[a-z][a-z\d+.-]*:/i.test(compact) && !/^https?:/i.test(compact)
    ? '#'
    : escapeHTML(value);
}
function warnings(diagnostics?: InspectionDiagnostic[]): string {
  return (diagnostics ?? [])
    .map(
      (diagnostic) =>
        `<div class="inspection-warning">${escapeHTML(diagnostic.phase)}: ${escapeHTML(diagnostic.message)}${diagnostic.declarationPath ? ` (declaration /${escapeHTML(diagnostic.declarationPath.join('/'))})` : ''}</div>`,
    )
    .join('\n');
}
function prerequisites(entries?: DocumentationPrerequisite[]): string {
  if (!entries?.length) return '';
  const rows = entries.map((target) => {
    const label = escapeHTML(target.reference);
    if (target.kind === 'local' && target.workflowId) {
      const destination = {
        workflowId: target.workflowId,
        ...(target.stepId ? { stepId: target.stepId } : {}),
      };
      return `<li><a href="#arazzo-target=${encodeURIComponent(JSON.stringify(destination))}" data-target-workflow-id="${escapeHTML(target.workflowId)}"${target.stepId ? ` data-target-step-id="${escapeHTML(target.stepId)}"` : ''}>${label}</a> (prerequisite)</li>`;
    }
    return `<li>${label} (${escapeHTML(target.kind)}${target.sourceName ? ` source ${escapeHTML(target.sourceName)}` : ''})${target.message ? ` — ${escapeHTML(target.message)}` : ''}</li>`;
  });
  return `<div class="doc-section"><h3>Prerequisites</h3><ul>${rows.join('\n')}</ul></div>`;
}
function parameters(values?: PlainObject[]): string {
  if (!values?.length) return '';
  return `<details class="step-detail"><summary>Parameters (${values.length})</summary><table><thead><tr><th>Name / reference</th><th>Location</th><th>Authored value</th></tr></thead><tbody>${values.map((parameter) => `<tr><td>${escapeHTML(parameter.name ?? parameter.reference ?? parameter.$ref)}</td><td>${escapeHTML(parameter.in)}</td><td><pre>${escapeHTML(JSON.stringify(parameter.value, null, 2) ?? '')}</pre></td></tr>`).join('')}</tbody></table></details>`;
}
function actions(step: InspectedStep, workflow: WorkflowDocumentation): string {
  const channels = ['onSuccess', 'onFailure'] as const;
  return channels
    .map((channel) => {
      const collection = step.actionDetails?.[channel];
      const entries: PlainObject[] = collection?.map((action) => action.value) ?? [
        ...(step[channel] ?? []),
        ...(channel === 'onSuccess'
          ? (workflow.successActions ?? [])
          : (workflow.failureActions ?? [])),
      ];
      if (!entries.length) return '';
      return `<details class="step-detail"><summary>${channel === 'onSuccess' ? 'Success' : 'Failure'} actions (${entries.length})</summary><div>Viewer inspection order: step entries, then unmatched workflow defaults. This is not an execution trace.</div>${entries
        .map((action, index) => {
          const fact = collection?.[index];
          return `<div class="step-row"><strong>${escapeHTML(action.name ?? action.reference ?? action.$ref)}</strong> ${escapeHTML(action.type ?? 'unresolved')} ${escapeHTML(action.workflowId ?? action.stepId ?? '')}${fact ? ` (${escapeHTML(fact.origin)}${fact.isOverride ? ', overrides default' : ''}; occurrence /${escapeHTML(fact.path.join('/'))}${fact.declarationPath ? `; declaration /${escapeHTML(fact.declarationPath.join('/'))}` : ''})` : ''}</div>${parameters(action.parameters)}${rawDetails('Authored action and criteria', action)}${fact ? warnings(fact.diagnostics) + fact.parameters.map((parameter) => warnings(parameter.diagnostics) + (parameter.status === 'unresolved' ? rawDetails('Unresolved parameter', parameter.authored) : '')).join('') : ''}`;
        })
        .join('\n')}</details>`;
    })
    .join('\n');
}

export function formatHeaderAsMarkdown(
  metadata: DocumentationMetadata,
  options: FormatOptions = {},
): string {
  const details = metadata as DocumentationMetadata & InspectionDetails;
  const sections = [
    `<h1>${escapeHTML(metadata.title)}</h1>`,
    `<span class="version-badge doc-version">${escapeHTML(metadata.version)}</span> <span class="version-badge spec-version">Arazzo ${escapeHTML(metadata.arazzoVersion)}</span>`,
  ];
  if (metadata.documentURL)
    sections.push(
      `<a href="${safeURL(metadata.documentURL)}">${escapeHTML(metadata.documentURL)}</a>`,
    );
  if (metadata.summary) sections.push(`<p>${escapeHTML(metadata.summary)}</p>`);
  // Keep CommonMark outside generated HTML blocks; authored HTML remains literal data.
  if (metadata.description) sections.push(`\n${safeDescriptionMarkdown(metadata.description)}\n`);
  if (metadata.support)
    sections.push(
      `<div class="inspection-support">Semantic inspection: ${metadata.support.semanticInspection ? `profile ${escapeHTML(metadata.support.profile ?? 'selected')}` : 'unsupported version; raw content only'}. Schema validation and execution support are not established. Source documents and versions are unverified.</div>`,
      ...(metadata.support.limitations ?? []).map(
        (limit) => `<div class="inspection-warning">${escapeHTML(limit)}</div>`,
      ),
    );
  if (metadata.provenance) sections.push(rawDetails('Document provenance', metadata.provenance));
  if (options.includeMetadata !== false)
    sections.push(
      '<div class="sources-section"><h2>Source Descriptions</h2>',
      ...metadata.sourceDescriptions.map(
        (source) =>
          `<div class="source-card"><strong>${escapeHTML(source.name)}</strong> <span>${escapeHTML(source.type ?? 'unknown')} — unverified</span> <a href="${safeURL(source.url)}">${escapeHTML(source.url)}</a></div>`,
      ),
      '</div>',
    );
  sections.push(warnings(details.diagnostics));
  if (details.authored)
    sections.push(
      rawDetails(
        metadata.support?.semanticInspection === false
          ? 'Raw authored document'
          : 'Authored document and generic details',
        details.authored,
      ),
    );
  return sections.join('\n');
}

export function formatWorkflowAsMarkdown(
  _metadata: DocumentationMetadata,
  workflow: WorkflowDocumentation,
): string {
  const sections: string[] = [];
  if (workflow.description)
    sections.push(`<p class="workflow-description">${escapeHTML(workflow.description)}</p>`);
  sections.push(prerequisites(workflow.prerequisites));
  if (workflow.inputs) sections.push(rawDetails('Inputs', workflow.inputs));
  sections.push('<div class="timeline">');
  workflow.steps.forEach((plain, index) => {
    const step = plain as InspectedStep;
    sections.push(
      `<div class="timeline-item" data-workflow-id="${escapeHTML(workflow.workflowId)}" data-step-id="${escapeHTML(step.stepId)}"><div class="timeline-marker">${index + 1}</div><div class="timeline-content"><div class="step-card"><h3>${escapeHTML(step.stepId)}</h3>`,
    );
    if (step.description) sections.push(`<p>${escapeHTML(step.description)}</p>`);
    for (const [key, locator] of Object.entries({
      operationId: step.operationId,
      operationPath: step.operationPath,
      workflowId: step.workflowId,
      channelPath: step.channelPath,
    }))
      if (locator !== undefined)
        sections.push(`<div>${key}: <code>${escapeHTML(locator)}</code></div>`);
    if (step.sourceBinding)
      sections.push(
        rawDetails('Source binding — unverified authored metadata', step.sourceBinding),
      );
    sections.push(
      prerequisites(step.prerequisites),
      parameters(step.parameters),
      actions(step, workflow),
      warnings(step.diagnostics),
    );
    if (step.successCriteria)
      sections.push(rawDetails('Authored success criteria (not evaluated)', step.successCriteria));
    if (step.outputs) sections.push(rawDetails('Outputs', step.outputs));
    if (step.provenance) sections.push(rawDetails('Occurrence provenance', step.provenance));
    if (step.authored)
      sections.push(rawDetails('Authored step and generic details', step.authored));
    sections.push('</div></div></div>');
  });
  sections.push('</div>');
  if (workflow.outputs) sections.push(rawDetails('Workflow outputs', workflow.outputs));
  const details = workflow as WorkflowDocumentation & InspectionDetails;
  sections.push(warnings(details.diagnostics));
  if (details.authored)
    sections.push(rawDetails('Authored workflow and generic details', details.authored));
  return sections.join('\n');
}

export function formatAsMarkdown(
  metadata: DocumentationMetadata,
  workflows: WorkflowDocumentation[],
  options: FormatOptions = {},
): string {
  return [
    formatHeaderAsMarkdown(metadata, options),
    workflows.length
      ? '<div class="workflows-header-row"><span>Workflows</span><button class="expand-all-btn">Expand All</button></div>'
      : '',
    ...workflows.map(
      (workflow) =>
        `<details class="workflow-details" data-workflow-id="${escapeHTML(workflow.workflowId)}"><summary class="workflow-summary-bar"><span class="step-count-badge">${workflow.steps.length} Steps</span><span class="workflow-summary-title">${escapeHTML(workflow.workflowId)}</span>${workflow.summary ? `<span class="workflow-summary-text">${escapeHTML(workflow.summary)}</span>` : ''}</summary><div class="workflow-details-content">${formatWorkflowAsMarkdown(metadata, workflow)}</div></details>`,
    ),
  ].join('\n');
}
