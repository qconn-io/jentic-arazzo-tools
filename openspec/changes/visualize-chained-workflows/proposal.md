## Why

The viewer cannot expose its document overview through normal navigation, and chained workflow relationships are interpreted inconsistently across diagrams and documentation. Missing reusable components can also abort loading after partially resolving the document. Selected Arazzo 1.1 composition and asynchronous fields need consistent inspection without mistaking generic parsing for semantic support. Version interpretation and HTTP assumptions must stay out of presentation so future Arazzo, OpenAPI, and AsyncAPI support has a defined extension boundary.

## What Changes

- Add an "All workflows" tab and round-trip overview navigation, preserving the first workflow as the uncontrolled initial view and explicit `null` as overview selection.
- Isolate missing reusable references temporarily during loading, use the existing resolver for valid references, and restore authored unresolved objects without synthetic components or caller-input mutation.
- Introduce private Arazzo 1.0 and selected 1.1 inspection profiles over native document snapshots, preserving document identity, URI/occurrence provenance, and unsupported authored content; keep specification facts separate from viewer policy.
- Introduce a shared viewer model with document/workflow-scoped step identities, separate success/failure action lists, contextual target classification, relationship provenance, and phase-specific diagnostics.
- Define a viewer display policy: step actions first in authored order, then unmatched workflow defaults in authored order; matching remains by name and type within the same success/failure channel.
- Support `step.dependsOn` and action `parameters`, including reusable parameter occurrence overrides and authored expressions/literal values.
- Inspect transport-neutral source bindings, including authored AsyncAPI send/receive, operation/channel locators, correlation expressions, timeouts, and querystring parameter values, without fetching source documents or predicting execution.
- Report inspection limitations separately from parsing, reference expansion, schema validation, and execution; provide raw inspection for parseable unknown versions and generic details for unsupported features instead of guessed semantic edges.
- Render a cycle-safe workflow relationship graph preserving parallel edges and self-loops. Warn on prerequisite cycles independently of call/recovery loops and retain a grid for unlinked workflows.
- Preserve step array order in single-workflow diagrams while overlaying prerequisite edges.
- Navigate with a workflow-and-step destination, cancel stale selection requests, and distinguish external and missing targets from local navigation.
- Correct calling-workflow ownership and scoped step selection in documentation, and use the shared model for documentation and Mermaid output.
- Establish profile-contract, semantic, loader, component, and rendering verification with representative fixtures created before implementation, including a synthetic future profile using existing fact kinds with unchanged consumers.

## Capabilities

### New Capabilities

- `chained-workflow-visualization`: Version-aware inspection, documentation, relationship layout, capability/reference diagnostics, and navigation for composed Arazzo workflows, with transport-neutral source descriptions.

### Modified Capabilities

None; this is the repository's initial OpenSpec capability.

## Impact

- `@jentic/arazzo-ui`: loading adapter, private snapshot/inspection profiles, viewer model/layout/target utilities, context, converters, node/edge components, documentation generators, styles, and package-local test configuration. No dependency on runner executors or new public plugin API.
- Public additions: source type `asyncapi`, root `$self`, step prerequisites and asynchronous fields, querystring location, action parameters, documentation support/source-binding/prerequisite details, and the calling `workflowId` on `WorkflowRefNodeData`. Align reusable occurrence values with parameter values. Preserve existing component/ref signatures and the callback's existing empty-string representation of overview selection.
- **Behavior change:** inherited unmatched actions appear after step actions consistently in all views, labeled as viewer inspection order. The current runner uses whole-list replacement; this change neither claims parity with that behavior nor changes execution.
- Test-only dependencies: Vitest compatible with the installed Vite, React Testing Library, and the existing jsdom tooling. Direct ApiDOM dependencies used by the loading adapter must be declared in the UI package rather than relied on transitively.
- Boundaries: parser/validator schema modernization, runner execution, external source-document fetching, source operation/schema expansion, and AsyncAPI transports remain outside this change. Native reference resolution remains authoritative where supported; unsupported identity/dialect semantics preserve authored references with explicit limitations. Future support requires a tested profile and any necessary parser/resolver upgrade, rather than automatic compatibility with unknown standards.
