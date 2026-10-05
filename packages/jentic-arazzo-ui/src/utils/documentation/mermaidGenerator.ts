import type { Workflow, ArazzoDocument } from '../../types/arazzo';
import { createSnapshot, inspect } from '../inspection';
import { buildViewerModel, type ArazzoViewerModel } from '../model/viewerModel';
import { buildSequence } from '../sequence/sequenceModel';
import { mermaidLabel } from './mermaidFlowchartGenerator';

export function generateMermaidSequence(
  workflow: Workflow,
  document: ArazzoDocument,
  suppliedModel?: ArazzoViewerModel,
): string {
  const model = suppliedModel ?? buildViewerModel(inspect(createSnapshot(document)));
  if (model.support.semanticInspection === 'unsupported') return '';
  const scene = buildSequence(model, workflow.workflowId);
  if (!scene.participants.length) return '';
  const lines = ['sequenceDiagram'];
  for (const participant of scene.participants)
    lines.push(
      `    participant ${participant.id} as ${mermaidLabel(`${participant.name} (${participant.kind})`)}`,
    );
  lines.push(
    `    Note over ${scene.participants[0].id}: ${mermaidLabel('Schematic authored interactions; bounded to eight call levels and 200 rows. Full metadata in documentation.')}`,
  );
  const rowMap = new Map(scene.rows.map((row) => [row.id, row]));
  const lastRows = new Map<string, number>();
  scene.rows.forEach((row, index) => {
    let parent = row.parentId;
    while (parent) {
      lastRows.set(parent, index);
      parent = rowMap.get(parent)?.parentId;
    }
  });
  const groups: { id: string; end: number }[] = [];
  for (const [index, row] of scene.rows.entries()) {
    if (row.kind === 'call' && row.expanded) {
      lines.push('    rect rgb(245, 243, 255)');
      groups.push({ id: row.id, end: lastRows.get(row.id) ?? index });
    }
    const label = mermaidLabel(row.label);
    if (row.kind === 'operation' || row.kind === 'call')
      lines.push(`    ${row.from}->>${row.to}: ${label}`);
    else if (row.kind === 'continuation') lines.push(`    ${row.from}-->>${row.to}: ${label}`);
    else if (row.kind === 'transfer') {
      lines.push(
        `    opt ${label}`,
        `    ${row.from}->>${row.to}: ${mermaidLabel(`${row.action?.value.name} (${row.action?.value.type})`)}`,
      );
      if (
        row.returnTo === 'source-step' &&
        (row.target?.navigable || row.target?.kind.startsWith('external'))
      )
        lines.push(
          `    ${row.to}-->>${row.from}: Recovery returns to retry ${mermaidLabel(row.step?.stepId)}`,
        );
      lines.push('    end');
    } else
      lines.push(
        `    Note over ${row.from}: ${mermaidLabel(row.reason === 'collapsed' ? `${row.target?.reference}: deeper call omitted in static view; open that workflow to inspect` : row.label)}`,
      );
    while (groups.at(-1)?.end === index) {
      lines.push('    end');
      groups.pop();
    }
  }
  return lines.join('\n');
}
