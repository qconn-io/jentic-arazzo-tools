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
import type { WorkflowCatalogManifest, WorkflowCatalogSelection, WorkflowCatalogCoverage, ArazzoCatalogProps } from ${JSON.stringify(declaration)};
import { ArazzoCatalog, normalizeCatalogManifest } from ${JSON.stringify(declaration.replace(/\.d\.ts$/, '.js'))};
import type { WorkflowReviewSnapshot, WorkflowReviewMatch, WorkflowReviewResult, ArazzoWorkflowReviewProps } from ${JSON.stringify(declaration)};
import { ArazzoWorkflowReview, compareWorkflowRevisions, exportWorkflowReview } from ${JSON.stringify(declaration.replace(/\.d\.ts$/, '.js'))};
const snapshot: WorkflowReviewSnapshot = { version: 1, id: 'shop', revision: '1', documents: [] };
const match: WorkflowReviewMatch = { before: { documentId: 'flow', workflowId: 'buy' }, after: { documentId: 'flow', workflowId: 'purchase' } };
const reviewProps: ArazzoWorkflowReviewProps = { baseline: snapshot, candidate: { ...snapshot, revision: '2' }, options: { matches: [match] } };
const consumeReview = (result: WorkflowReviewResult) => [result.findings[0]?.baselineImpact.direct[0]?.kind, result.runtimeEffect];
void reviewProps; void consumeReview;
const reviewComponent: typeof ArazzoWorkflowReview = ArazzoWorkflowReview;
const compareResult: Promise<WorkflowReviewResult> = compareWorkflowRevisions(snapshot, { ...snapshot, revision: '2' });
void reviewComponent; void compareResult; void exportWorkflowReview;
// @ts-expect-error Private catalog indices are not review export types.
import type { ReviewProjection } from ${JSON.stringify(declaration)};
const catalog: WorkflowCatalogManifest = { version: 1, id: 'shop', revision: '1', documents: [{ id: 'payments', revision: 'r1', uri: 'https://example.test/payments', workflows: [{ workflowId: 'buy', role: 'entry' }] }] };
const validatedCatalog = normalizeCatalogManifest(catalog);
const catalogSelection: WorkflowCatalogSelection = { documentId: 'payments', revision: 'r1', workflowId: 'buy' };
const catalogProps: ArazzoCatalogProps = { manifest: validatedCatalog, selection: catalogSelection, onCoverageChange(coverage: readonly WorkflowCatalogCoverage[]) { void coverage; } };
const catalogComponent: typeof ArazzoCatalog = ArazzoCatalog;
const renderedCatalog = catalogComponent(catalogProps); void renderedCatalog;
void catalogProps; void catalogComponent;
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
import type { WorkflowLocation, WorkflowLocationStatus, WorkflowActionAddress } from ${JSON.stringify(declaration)};
import type { SourceDocumentProvider, SourceDocumentRequest, SourceDocumentContent, ExternalNavigationRequest } from ${JSON.stringify(declaration)};
import { createLocationAdapter, encodeLocation, decodeLocation } from ${JSON.stringify(declaration.replace(/\.d\.ts$/, '.js'))};
import type { WorkflowViewProfile, WorkflowEventAssociation, WorkflowPerspective, ViewerMode, DiagramType } from ${JSON.stringify(declaration)};
import { digitalProductProfile } from ${JSON.stringify(declaration.replace(/\.d\.ts$/, '.js'))};
const profile: WorkflowViewProfile = { version: 1, document: 'host:doc', participants: [{ id: 'client', name: 'Client', provenance: { kind: 'host', description: 'catalog' } }], actors: [], sourceOwners: [], implementations: [], events: [] };
const event: WorkflowEventAssociation = { id: 'ready', producer: { workflowId: 'worker', stepId: 'publish' }, consumer: { workflowId: 'client', stepId: 'await' }, channel: { uri: 'https://test/events', pointer: '#/channels/ready' }, message: { uri: 'https://test/events', pointer: '#/channels/ready/messages/ready', revision: 'r1' }, provenance: { kind: 'host', description: 'declared' } };
const perspective: WorkflowPerspective = 'systems';
const systemsProps: ArazzoUIProps = { document: '{}', viewProfile: profile, viewProfileAdapter: 'digital-product', perspective, onPerspectiveChange: p => p };
// @ts-expect-error Systems is a separate perspective, not a legacy mode.
const widenedMode: ViewerMode = 'systems';
// @ts-expect-error Systems is a separate perspective, not a diagram type.
const widenedDiagram: DiagramType = 'systems';
// @ts-expect-error Native system scenes remain private.
import type { SystemScene } from ${JSON.stringify(declaration)};
import type { ScenarioManifest, ScenarioWaypoint, ScenarioSelection, ScenarioControls, ScenarioFocus, AuthoredScenario } from ${JSON.stringify(declaration)};
const focus: ScenarioFocus = { kind: 'criterion', pointer: '/workflows/0/steps/0/successCriteria/0' };
const waypoint: ScenarioWaypoint = { id: 'evidence', narrative: 'Inspect authored evidence.', location: {version: 1, document: 'host:doc', root: 'root', view: 'docs', subview: 'docs'}, focus };
const authoredScenario: AuthoredScenario = { id: 'unknown', document: 'host:doc', workflow: 'root', expected: 'UNKNOWN requires reconciliation.', evidence: 'Authored inspection only.', waypoints: [waypoint] };
const manifest: ScenarioManifest = { version: 1, id: 'host:guide', scenarios: [authoredScenario] };
const selection: ScenarioSelection = { manifest: 'host:guide', scenarioId: 'unknown', waypointId: 'evidence' };
const scenarioControls: ScenarioControls = { scenarioManifest: manifest, scenarioSelection: selection, onScenarioSelectionChange: s => s?.scenarioId, onScenarioLocationRequest: (l, f) => [l.selection, f?.pointer] };
const scenarioProps: ArazzoUIProps = {document: '{}', ...scenarioControls};
// @ts-expect-error Guides never accept execution commands.
const executionFocus: ScenarioFocus = { kind: 'execute', pointer: '/workflows/0' };
const address: WorkflowActionAddress = { document: 'host:doc', pointer: '/workflows/0/onFailure/0', usePointer: '/workflows/0/onFailure/0', channel: 'onFailure', index: 0 };
const location: WorkflowLocation = { version: 1, document: 'host:doc', root: 'root', view: 'docs', subview: 'sequence', selection: { kind: 'action', workflowId: 'child', stepId: 'capture', occurrence: [{ workflowId: 'root', stepId: 'second-item' }], action: address } };
const props: ArazzoUIProps = { document: '{}', location, defaultLocation: location, documentIdentity: 'host:doc', onLocationChange: value => value.selection?.occurrence, onLocationStatus: (status: WorkflowLocationStatus) => status.state };
const sourceProvider: SourceDocumentProvider = {
  async load(request: SourceDocumentRequest): Promise<SourceDocumentContent> {
    const signal: AbortSignal | undefined = request.signal;
    signal?.throwIfAborted();
    return { content: { openapi: '3.1.0' }, retrievalURI: request.uri, revision: request.revision };
  },
};
const contractProps: ArazzoUIProps = {
  document: '{}', sourceProvider,
  onExternalNavigation(request: ExternalNavigationRequest) {
    const uri: string = request.documentUri;
    const workflow: string | undefined = request.workflowId;
    const revision: string | undefined = request.revision;
    return [uri, workflow, revision];
  },
};
// @ts-expect-error Providers must report the retrieved document URI.
const invalidContent: SourceDocumentContent = { content: '{}' };
const adapter = createLocationAdapter('example.guide', (value: unknown): value is { stage: number } => typeof value === 'object' && value !== null && 'stage' in value && typeof value.stage === 'number', value => value.stage.toFixed());
decodeLocation(encodeLocation(location));
// @ts-expect-error Generated sequence row indices are not public addresses.
location.rowIndex = 7;
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
    console.log(
      `PASS ${entry}: relationship callback, source provider, external navigation and private-model boundary`,
    );
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
