## Why

Users need to understand who calls whom, follow a workflow into its downstream interactions, and return to the caller without reading YAML; the implemented inspection foundation does not yet deliver that experience because overview navigation is hidden in Docs mode, sequence diagrams reduce workflow calls to notes, and repeated limitations and raw metadata obscure the interactions. This change retains its version-aware inspection, reference recovery, and shared semantic model while extending the visual UX scope to discoverable navigation, connected sequences, and details available on demand, with comprehension demonstrated on representative documents.

## What Changes

- Expose "All workflows" and workflow selection in Docs, Diagram, and Split views, with clear navigation from an overview to a workflow and back, and from a called workflow to its calling occurrence. Preserve the first workflow as the uncontrolled initial selection and explicit `null` as overview selection.
- Add connected sequence expansion as additional scope: render standard local workflow calls as expandable groups showing downstream interactions and structural call/return boundaries. Bound recursive expansion, retain distinct call occurrences, and distinguish calls, prerequisites, one-way transfers, and retry recovery without evaluating outcomes.
- Make the default diagrams readable through concise workflow, participant, step, and relationship labels. Expose full parameters, criteria, mappings, provenance, and diagnostics through selection and detail controls; consolidate general inspection limitations into a compact status control rather than repeating them throughout the sequence.
- Isolate missing reusable references temporarily during loading, use the existing resolver for valid references, and restore authored unresolved objects without synthetic components or caller-input mutation.
- Introduce private Arazzo 1.0 and selected 1.1 inspection profiles over native document snapshots, preserving document identity, URI/occurrence provenance, and unsupported authored content; keep specification facts separate from viewer policy.
- Introduce a shared viewer model with document/workflow-scoped step identities, separate success/failure action lists, contextual target classification, relationship provenance, and phase-specific diagnostics.
- Define a viewer display policy: step actions first in authored order, then unmatched workflow defaults in authored order; matching remains by name and type within the same success/failure channel.
- Support `step.dependsOn` and action `parameters`, including reusable parameter occurrence overrides and authored expressions/literal values.
- Inspect transport-neutral source bindings, including authored AsyncAPI send/receive, operation/channel locators, correlation expressions, timeouts, and querystring parameter values, without fetching source documents or predicting execution.
- Report inspection limitations separately from parsing, reference expansion, schema validation, and execution, using plain language that explains the effect on the displayed content. Keep actionable missing/ambiguous relationships discoverable at their occurrences; provide raw inspection for parseable unknown versions and generic details for unsupported features instead of guessed semantic edges.
- Render a cycle-safe workflow relationship graph preserving parallel edges and self-loops. Warn on prerequisite cycles independently of call/recovery loops and retain a grid for unlinked workflows.
- Preserve step array order in single-workflow diagrams while overlaying prerequisite edges.
- Navigate with a workflow-and-step destination, cancel stale selection requests, and distinguish external and missing targets from local navigation.
- Correct calling-workflow ownership and scoped step selection in documentation, and use the shared model for documentation and Mermaid output.
- Establish profile-contract, semantic, loader, component, and rendering verification with representative fixtures created before implementation, including a synthetic future profile using existing fact kinds with unchanged consumers.
- Add visual UX acceptance using the D1 standard sample and a reproducible nested-call fixture: a reader can discover the overview from the default view, identify caller and callee, follow downstream interactions, inspect input/output mappings, and return to the parent without reading YAML. Browser walkthroughs must demonstrate these tasks; semantic assertions and successful Mermaid parsing alone do not establish usability. The D1 sample's client/API-to-implementation associations remain descriptive and must not be turned into inferred call edges.

## Capabilities

### New Capabilities

- `chained-workflow-visualization`: Understandable overview and connected sequence visualization, discoverable navigation, details on demand, and version-aware inspection of composed Arazzo workflows, with transport-neutral source descriptions and contextual capability/reference diagnostics.

### Modified Capabilities

None; this is the repository's initial OpenSpec capability.

## Impact

- `@jentic/arazzo-ui`: loading adapter, private snapshot/inspection profiles, viewer model/layout/target utilities, context, converters, node/edge components, documentation generators, styles, and package-local test configuration. No dependency on runner executors or new public plugin API.
- Public additions: `RelationshipEdgeData` and the additive `relationship` edge variant with a public callback projection; source type `asyncapi`, root `$self`, step prerequisites and asynchronous fields, querystring location, action parameters, documentation support/source-binding/prerequisite details, and the calling `workflowId` on `WorkflowRefNodeData`. Align reusable occurrence values with parameter values. Preserve existing component/ref signatures and the callback's existing empty-string representation of overview selection.
- **Behavior change:** inherited unmatched actions appear after step actions consistently in all views, labeled as viewer inspection order. The current runner uses whole-list replacement; this change neither claims parity with that behavior nor changes execution.
- **UX behavior change:** overview navigation becomes available in every view mode, local calls can be expanded in sequences, and verbose metadata moves from the default diagram into inspectable details. Existing completed technical work remains the foundation; revised UX requirements need additional implementation and acceptance work before the change is considered complete.
- Test-only dependencies: Vitest compatible with the installed Vite, React Testing Library, and the existing jsdom tooling. Direct ApiDOM dependencies used by the loading adapter must be declared in the UI package rather than relied on transitively.
- Boundaries: parser/validator schema modernization, runner execution, external source-document fetching, source operation/schema expansion, AsyncAPI transports, `$self` resolver modernization, and custom `x-internal-processing` interpretation remain outside this change. Do not infer client/server implementation links from prose, extension fields, matching operation names, or diagram layout. Native reference resolution remains authoritative where supported; unsupported identity/dialect semantics preserve authored references with explicit limitations. Future support requires a tested profile and any necessary parser/resolver upgrade, rather than automatic compatibility with unknown standards.
