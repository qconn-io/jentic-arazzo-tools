import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Compile a downstream consumer of each rolled entry, rather than source types.
const directory = await mkdtemp(join(tmpdir(), 'arazzo-public-declarations-'));
try {
  for (const entry of ['arazzo-ui', 'arazzo-ui-standalone']) {
    const declaration = fileURLToPath(new URL(`../types/${entry}.d.ts`, import.meta.url));
    const file = join(directory, `${entry}-consumer.ts`);
    await writeFile(
      file,
      `
import type { ArazzoEdge, ArazzoEdgeType, ArazzoUIProps, RelationshipEdgeData, WorkflowRefNodeData } from ${JSON.stringify(declaration)};
// @ts-expect-error Private inspection models must not become public exports.
import type { WorkflowRelationship } from ${JSON.stringify(declaration)};
// @ts-expect-error Private effective actions must not become public exports.
import type { EffectiveAction } from ${JSON.stringify(declaration)};
// @ts-expect-error Private native snapshots must not become public exports.
import type { DocumentSnapshot } from ${JSON.stringify(declaration)};
// @ts-expect-error Private sequence scenes must not become public exports.
import type { SequenceScene } from ${JSON.stringify(declaration)};
// @ts-expect-error Private occurrence paths must not become public exports.
import type { CallPath } from ${JSON.stringify(declaration)};
// @ts-expect-error Private caller navigation must not become public exports.
import type { CallerFrame } from ${JSON.stringify(declaration)};
// @ts-expect-error Private detail projections must not become public exports.
import type { OccurrenceDetails } from ${JSON.stringify(declaration)};
// @ts-expect-error Private session presentation must not become public exports.
import type { Session } from ${JSON.stringify(declaration)};
const variant: ArazzoEdgeType = 'relationship';
const legacy: WorkflowRefNodeData = { type: 'workflowRef', step: { stepId: 'call', workflowId: 'child' }, targetWorkflowId: 'child', isValid: true };
export const onEdgeSelect: NonNullable<ArazzoUIProps['onEdgeSelect']> = (id, edge) => {
  if (edge.data?.type === 'relationship') {
    const relationship: RelationshipEdgeData = edge.data;
    const kind: 'prerequisite' | 'call' | 'action' = relationship.kind;
    const label: string = relationship.label;
    // @ts-expect-error The full model is private, even when the callback narrows.
    relationship.relationship;
    return [id, kind, label];
  }
};
export function inspect(edge: ArazzoEdge) {
  if (edge.data?.type === 'relationship') return edge.data.kind;
}
`,
    );
    const program = ts.createProgram([file], {
      noEmit: true,
      strict: true,
      skipLibCheck: false,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) {
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(diagnostics, {
          getCurrentDirectory: () => process.cwd(),
          getCanonicalFileName: (name) => name,
          getNewLine: () => '\n',
        }),
      );
    }
    console.log(`PASS ${entry}: relationship callback narrowing and private-model boundary`);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
