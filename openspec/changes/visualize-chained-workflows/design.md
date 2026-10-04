## Context

See proposal.md for motivation and specs/chained-workflow-visualization/spec.md for observable requirements.

The UI already has a document converter, workflow-prefixed node identities, sequential layout, documentation generators, and a provider that represents overview with null. It lacks an overview tab and a shared source of resolved relationships. The resolver mutates its tree and stops at a missing reusable component, even with continueOnError enabled. Installed ApiDOM preserves selected 1.1 fields as ordinary objects but does not fully dereference action parameters. Recognizing a field as generic data does not establish semantic or schema support for its specification version.

The monorepo separates parsing, reference resolution, validation, execution, and visualization. The runner retains native ApiDOM documents and document URIs, indexes entities, and delegates OpenAPI normalization through version-specific normalizers. The viewer should follow those boundaries without depending on runner executors or importing a server-oriented document registry into the browser. Validator diagnostics establish conformance; viewer inspection diagnostics establish what could be understood and displayed.

Standards grounding uses pinned [Arazzo 1.0.1](https://spec.openapis.org/arazzo/v1.0.1.html) and [Arazzo 1.1.0](https://spec.openapis.org/arazzo/v1.1.0.html) for feature versions, workflow composition, identity, and asynchronous intent; [OpenAPI 3.2.0](https://spec.openapis.org/oas/v3.2.0.html) for operation locations and schema dialect boundaries; and [AsyncAPI 3.0.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0) for the distinction between operations, channels, and protocol bindings. These references inform the extension contract, not a claim that the installed packages support every feature in them.

Read-only probes established that replacing a missing reusable occurrence with a neutral ObjectElement before dereferencing, then restoring it from private metadata, resolves valid input schemas in either workflow order. Restoration also survives a valid reusable action containing a missing parameter and preserves the occurrence value 0. This is a feasibility result; task 2 adds permanent regression tests.

## Goals / Non-Goals

**Goals:** Version-aware specification interpretation separated from viewer policy; one pure presentation model for all views; preservation of native document context and unknown content; transport-neutral source bindings; reference recovery that preserves authored unresolved content; scoped identities and navigation; deterministic layouts whose edges retain provenance; verified extension seams without promising automatic support for unknown standards.

**Non-Goals:** Changes to runner execution, parser/validator schemas, full Arazzo 1.1 conformance, external source-document fetching, OpenAPI/AsyncAPI operation-schema expansion, protocol execution, implicit output-dependency inference, a new shared package, or a public plugin/model API. Selected 1.1 inspection is explicitly in scope; accepting an input does not certify it for execution.

## Decisions

### 1. Specification interpretation and capability boundary

Introduce a private inspection facade in src/utils/inspection, with a synchronous inspect(documentSnapshot) -> InspectionResult boundary. A snapshot retains the isolated authored ApiDOM tree, restored resolved ApiDOM tree, declared specification version, retrieval URI, resolver-established base URI when available, authored $self, and a per-document identity. InspectionResult contains read-only domain facts, provenance, feature support, and diagnostics; it contains no React Flow nodes, coordinates, colors, callbacks, or action display ordering. The asynchronous loading adapter owns parsing/resolution; inspection owns no network activity. Plain-document injected providers and synchronous documentation helpers create a snapshot once from supplied data without re-dereferencing it. Missing source-map/URI metadata is recorded as unavailable rather than invented.

Use a private, explicit version selector with two Arazzo profiles: 1.0 and selected 1.1. Each profile declares understood features, inventories structural reusable occurrences before dereferencing, and extracts domain facts from the restored native snapshot. Shared helpers implement identical rules; profiles override only actual version differences. The existing resolver continues to handle references it supports; the profile handles the selected generic fields it does not normalize. Arazzo patch versions select the same major/minor feature profile, while the exact authored version is retained. Do not dispatch on info.version, which is the author's description version. An unknown major/minor must not silently select the latest known profile. This mirrors the runner's version-specific normalizer facade while keeping the browser dependency graph small.

Domain facts retain authored workflow/step order, declared action lists and parameter occurrences, classified references, source bindings, and pointers into the snapshot. Reusable expansion records both declaration and use-site provenance. The viewer model applies the documented action inspection policy afterward; it must not become the canonical representation used by a future executor. Native ApiDOM elements stay inside the inspection/loading boundary; renderer payloads and public document retrieval use plain projections. Preserve unknown fields, x-extensions, expressions, selectors, and schema dialect identifiers through those projections rather than rebuilding the document from the closed public TypeScript interfaces. Schema keywords and extension payloads remain opaque to UI feature detection; unknown vocabulary is not automatically an invalid-schema diagnosis.

The support contract distinguishes representation/parsing, semantic inspection, reference expansion, schema validation, and execution. It is evaluated from actual installed capabilities, not inferred from successful parsing:

| Input/feature | Support introduced by this change | Explicit limit |
| --- | --- | --- |
| Arazzo 1.0.x | Existing composition inspection through the 1.0 profile | No new validator or executor guarantees |
| Arazzo 1.1.x | Common composition plus step prerequisites, action parameters, querystring values, and authored asynchronous step intent/metadata | Selected inspection only; installed parser/resolver limitations remain visible |
| OpenAPI source, including a URI pointing to 3.2 or a later description | Declared source type and opaque operation locator | Source version/content is unverified because its document is not fetched |
| AsyncAPI source | Declared source type, operation/channel locator, authored send/receive, timeout, and correlation expression | No source-version detection, message/channel expansion, or transport execution |
| Unknown Arazzo major/minor | Raw inspection if the parser can represent the document | No guessed workflow/action semantics, relationship graph, or semantic Mermaid output |
| Unsupported feature in a known profile | Generic authored details plus an inspection warning | No invented transitions or implication of conformance |

For an unrecognized profile, bypass semantic dereferencing and identity assumptions that depend on known workflows; display raw parsed content and the unsupported-version diagnostic. If parsing itself cannot represent the input, show a distinct parsing load error and leave caller input unchanged. In a known profile, unsupported action kinds cannot override recognized defaults or generate executable-looking edges. A known feature used in an older profile is preserved with an unsupported-feature diagnostic rather than backported by accident. Extension fields remain opaque data and are not warnings merely because they are extensions. Support information is visible in the viewer and generated documentation; it is sidecar information and is never injected into getDocument().

Diagnostics carry phase (parsing, resolution, inspection), category (missing reference, malformed target, ambiguous binding, unsupported version/feature/resolution, or prerequisite cycle), severity, owner occurrence, and declaration provenance. A missing external document that was deliberately not fetched is unverified/external, not an invalid-reference assertion. Do not reuse validator success/error wording for these warnings. No automatic runtime prediction or full-conformance badge is introduced.

**Alternative:** A renderer-switch per version scatters semantics across views. Parsing everything as 1.0 and widening public interfaces erases feature boundaries. A public registry or shared package is premature: there is one consumer of these inspection facts, and the real variation is confined to two private profiles.

### 2. Shared viewer model and identity boundaries

Build a private ArazzoViewerModel in src/utils/model/viewerModel.ts from InspectionResult domain facts and an explicit viewer policy. The provider computes the inspection result and model once per loaded document revision and supplies the same model to graph converters, node cards, documentation, and navigation. Tab or selection changes reuse them; replacement documents or changed components rebuild them. Injected-provider consumers remain compatible without new required public context fields. Standalone documentation generation uses the same snapshot/inspection/model path synchronously; it must not implement a second semantic interpretation.

Use nested maps for workflows and steps within the document identity. Effective actions are indexed by workflowId, then stepId, with separate onSuccess and onFailure collections. Each collection contains recognized resolved actions, explicit unresolved entries, or unsupported authored entries; each entry retains origin, authored index, effective display index, and override status. Unsupported/unresolved entries are visible but cannot suppress recognized defaults. An inherited action's applicable source step and workflow declaration origin are separate facts.

A target classification belongs to a reference occurrence, including its owning workflow/step and reference role; bare step references cannot be cached globally by their string value. Diagnostics retain owner, occurrence path, original reference, code, and message. Project component-definition diagnostics onto each using step as well as retaining their declaration location.

Use the existing internal IDs for React Flow selection, with an explicit model lookup from (documentIdentity, workflowId, stepId) to the generated node ID. Semantic identities and edge IDs use structured, serialized tuples rather than delimiter concatenation or random UUIDs. A resolver-established canonical document URI identifies a document when available; otherwise use an explicit per-load identity, never an invented URL. Retrieval location and authored $self remain separate provenance fields. No document-identity comparison enables external navigation in this change. Known-profile input with duplicate workflow IDs or duplicate step IDs within one workflow is rejected with a load error; identical step IDs across workflows are supported.

Keep UI tracking IDs in a private sidecar and the decorated render projection, never in the native export snapshot. Retain the current generated node-ID format and controlled-selection behavior. Raw authored _internalId values are opaque content, not trusted unique selection keys; already-decorated injected-provider IDs can be retained when verified unique in their document. getDocument() serializes the restored native snapshot directly, so it needs no name-based deletion of authored fields. For injected-provider snapshots, remove only IDs known to have been assigned by that provider; preserve other content. Metadata unavailable from that route cannot be reconstructed from a plain value.

**Alternative:** Renderer-specific helpers require repeated resolution and allow views to disagree. A global step-ID map fails the duplicate-step requirement.

### 3. Loading adapter: isolate, dereference, restore

Keep the recovery algorithm in a testable private loading adapter; ArazzoUI.tsx manages asynchronous load state and cancellation.

1. Parse the complete input with parseArazzo, retaining native metadata and an isolated authored snapshot so the caller's object remains unchanged. Select the profile by arazzo before semantic traversal. For known profiles, check the minimum root/identity structure needed for viewing; this is not full schema validation. Apply the unsupported-profile fallback from decision 1 instead of treating an unknown document as malformed 1.0.
2. Use the selected profile to inventory structurally valid reusable-object locations: workflow/step parameters and action lists, component action definitions, and parameters inside inline or reusable actions. The 1.1 profile inspects action parameters even when ApiDOM represents them as generic objects; unsupported locations remain opaque. Strings inside values, criteria, schemas, descriptions, or extension payloads are data, not references to replace. Parse the exact components prefix and retain the full component key, including dots.
3. For a missing reusable component, record its complete original object and declaration location in a per-load ledger. Replace that occurrence with a neutral ObjectElement carrying a private ApiDOM metadata token owned by the ledger. Preserve the transformed root returned by traversal. The placeholder contains no reference field and no invented action name/type/value; it is not added to components. Inventory all definitions before resolver traversal so a missing reference inside a reused action is isolated too.
4. Before invoking dereferenceArazzoElement, form a resolution plan from the selected profile and a private capability table verified against installed resolver versions. Preserve retrieval/base-URI handling and leave JSON Schema dereferencing to the resolver. Retain $self, $id, $schema, and dialect metadata as authored; do not substitute a familiar dialect or manually reinterpret base URIs. Unsupported expansion is a preflight decision, not an exception-recovery path. Use safe selective skipping only when the resolver supplies that facility; otherwise bypass the entire dereference phase on that isolated load, keep its authored tree, and report the explicit limitation. Local supported reusable lookup can still occur in inspection without changing exported content. For supported plans, run the existing resolver with source-description expansion disabled and the existing circular-schema policy. Ordinary failures of supported expansion remain fatal; never resolve against a known-wrong base or return a partially mutated tree from a broad catch.
5. Traverse the returned ApiDOM tree before toValue and restore every ledger-owned placeholder to a fresh copy of its original reusable object, including occurrence value and extensions. Cloned occurrences retain their token and are all restored. Emit sidecar diagnostics; private tokens never enter returned JSON.
6. Retain the restored native tree in the snapshot and inspect it through the selected profile before building the viewer model. Resolve supported generic action parameters by component lookup in inspection; retain missing ones as unresolved entries. Keep original occurrence paths from the authored snapshot even after transclusion. getDocument() projects the restored native tree with existing valid supported dereferencing; renderer-only IDs, placeholders, synthetic components, and diagnostic fields never enter that tree. Serialization does not discard unknown fields or extension payloads.

Syntax/root errors, duplicate IDs, malformed reusable expressions, failed JSON Schema resolution, and circular-schema errors remain fatal load errors. A syntactically valid missing reusable component or missing navigation target is recoverable. Unresolved entries render warnings and original references/overrides; they do not invent executable actions, suppress defaults, or create fabricated transitions.

**Alternative:** Component-wide stubs contaminate exports and lose occurrence identity. Catch-and-return is order dependent. Reimplementing JSON Schema resolution duplicates the resolver. The adapter confines the workaround to UI loading and can be removed when upstream tolerant resolution covers this case.

### 4. Action and parameter semantics

For each success/failure channel independently, resolve reusable actions, keep step entries in authored order, and append workflow defaults that have no resolved step action matching both name and type. Preserve the ordering of unmatched defaults. Unresolved entries occupy their authored display position and cannot count as an override. Provenance includes channel, origin, authored index, and effective index.

This step-first merge is the viewer's documented inspection policy. The [Arazzo step rules](https://spec.openapis.org/arazzo/v1.1.0.html#step-object) establish first-match ordering and retained workflow defaults, but do not explicitly define this interleaving. Label the effective listing as viewer inspection order in diagram details and documentation, retaining the separate authored lists in inspection facts. The current runner StepExecutor replaces the corresponding default list wholesale whenever a step declares its own list, including an empty list; that is a concrete divergence, not established standards parity. Do not copy that behavior into the inspector or change the runner in this change. Do not evaluate criteria or claim a branch will execute. Preserve every authored transition, including potentially shadowed ones, and display criteria and ordering.

For action parameters, clone the component before applying an occurrence override using property presence, not truthiness: 0, false, empty string, null, arrays, and objects remain intact. Omitted value keeps the component value. Keep expressions and selector objects unevaluated. Reuse existing native step-parameter resolution; do not mutate shared definitions or the restored document while computing the model.

**Alternative:** Default-first ordering can hide step-specific handling. Whole-list replacement discards defaults. Folding success and failure together conflates independent channels.

### 5. Target classification and transport-neutral source bindings

Resolve references using indexed workflows/steps/source descriptions and the occurrence role:

- Workflow target: a local workflow ID or an external $sourceDescriptions.<source>.<workflowId> reference.
- Step prerequisite: a bare local step ID, $workflows.<workflowId>.steps.<stepId>, or $sourceDescriptions.<source>.<workflowId>.steps.<stepId>.
- Action stepId: a step in the owning workflow.
- Missing: malformed/absent target or invalid source description (external workflows require an arazzo source type).

The classification retains raw reference, destination kind, source name, document identity, workflow/step IDs, and navigability. Reference grammar belongs to the profile and occurrence role, not to renderers. External references are displayed without fetching or assuming a local workflow with the same ID. Missing local steps remain visible as warnings just like missing workflows. External/missing nodes use a tagged structured identity including the raw reference; they never become local navigation destinations.

API step inspection uses a SourceBinding fact rather than an HTTP operation assumption: declared source kind (openapi, asyncapi, arazzo, or unknown), source name/URI when identifiable, locator kind (operationId, operationPath, channelPath, workflowId, or unknown), raw locator, authored message intent, correlation expression, timeout, and verification state. A bare operationId with several candidate sources is ambiguous/unverified; do not invent the first source. External source version, protocol, method, and channel contents remain unknown when they were not loaded. Preserve every supplied locator if the document contains conflicting fields and diagnose the ambiguity instead of silently choosing one.

For selected 1.1 fields, cards and documentation display asyncapi/send/receive labels and authored correlation/timeout data without inferring HTTP methods or converting receive to a retry/call. Display querystring as its authored parameter location and value without parsing it into query parameters. An operationPath is an opaque locator, not a guaranteed /paths/{path}/{method} tuple. OpenAPI can describe webhooks and callbacks; AsyncAPI 3 places operations separately from channels, and other versions differ. Actual source-operation expansion would therefore require a separate source-family/version adapter returning SourceBinding enrichment; it is not implemented here. Keep workflow control actions and asynchronous message intent as separate concepts even though both use a field named action/type.

**Alternative:** Splitting every target on dots or matching only workflowId loses role, source, and local step scope.

### 6. Relationship extraction and cycle diagnostics

Extract semantic relationships before positions:

- Workflow prerequisite: prerequisite workflow -> dependent workflow.
- Sub-workflow call: calling workflow -> called workflow, with the calling step and effective step parameters.
- Action transition: applicable step's workflow -> a goto/retry workflow target, with channel, action type, criteria, effective parameters, and declaration origin. End actions do not create target edges; local step targets remain in the single-workflow graph.

A cross-workflow step prerequisite is represented in the step view and navigation model; this change does not infer extra document-level workflow prerequisites from it. Retry without another workflow remains a single-workflow self-retry edge; explicit retry to the same workflow is a document self-loop.

Each edge ID serializes a tuple containing document identity, owner workflow, applicable step (or workflow prerequisite occurrence), relationship kind, success/failure channel, action type, authored origin/index, and classified target identity. Distinct occurrences retain parallel edges even when their labels match. Never deduplicate by source/target alone. Only understood relationship kinds produce edges; unknown features remain inspectable data. An async receive, timeout, correlation expression, or runtime output reference does not imply an extra call, dependency, or scheduling edge.

Run Tarjan on the local workflow-prerequisite subgraph. Flag edges inside an SCC of size > 1, and prerequisite self-loops, as invalid prerequisite cycles. Do not mark edges entering/leaving a cyclic SCC. Run a separate SCC analysis over all local relationships for layout; a mixed or call-only cycle is not evidence of a prerequisite cycle. Avoid claiming all recursion is operationally valid: execution validation belongs elsewhere.

**Alternative:** A single cycle flag on the full graph generates false prerequisite warnings; DFS back-edge removal loses visible relationships.

### 7. Layout and edge rendering

Condense SCCs of the full graph to a DAG, rank condensation nodes by longest path in topological order, and retain authored workflow order as the tie-breaker. Overview cards use explicit fixed bounds with long content available through their details/navigation rather than expanding the layout bounds. Lay out each SCC as a bounded local grid of its member workflows, then pack SCC bounding boxes within their rank using those bounds and fixed gaps; no member nodes share a position. Place disconnected components deterministically. With zero relationships use the existing multi-column grid.

External/missing references are supplementary nodes placed beside their owning local workflows after local ranking, with space reserved so their bounds do not overlap local cards. A prerequisite points from the referenced entity to its dependent owner; a call/action points from the owner to its referenced destination. Preserve their edges, but exclude supplementary nodes from local cycle analysis. Route parallel edges in separate lanes and self-loops outside node bounds; rank calculation never drops, reverses, or merges semantic edges. Workflow nodes need inbound/outbound handles for all relationship kinds. Smooth-step routing alone is insufficient for parallel edges or self-loops; use routing data and a dedicated relationship edge component.

Prerequisites use dashed blue arrows and a text badge; calls use solid purple arrows and a call label; action transitions label action name, channel/type, criteria, and parameter count, with green/red/amber accents. Warnings and relationship classes remain understandable without color.

For single workflows, retain the array order and call convertWorkflowToFlow followed by applySequentialLayout. Add side-routed prerequisite edges without reordering main nodes. Update height estimation for new content and keep supplementary targets separate from the main chain. Conditional goto is a one-way transfer; retry-to-workflow returns to retry the source step. Neither prerequisite arrows nor the diagram's authored-order backbone assert that a runtime branch will execute.

**Alternative:** Applying the workflow sequential layout to the overview destroys its hierarchy. Arbitrary cycle breaking and generic paths hide self-loops and coincident transitions.

### 8. Navigation and ownership

Add optional calling workflowId to the public WorkflowRefNodeData type for existing consumer compatibility, and always populate it in convertWorkflowToFlow. Internally require an owner in normalized node facts. Keep targetWorkflowId for the call destination. For legacy injected nodes lacking workflowId, resolve ownership through the scoped node-identity lookup; if no unambiguous owner exists, show a diagnostic rather than using the target as owner. DocsView expands the owner workflow for card selection and uses escaped, owner-scoped DOM queries.

Use one internal navigation handler for tabs, overview nodes, action chips, and prerequisite links. In uncontrolled mode, undefined initial activeWorkflowId selects the first workflow; explicit null selects overview from the first render. Preserve existing public callback types: overview emits the existing empty string, once per user workflow change. Controlled props are authoritative; user interactions request changes through callbacks and do not override an unchanged controlled value. Node-selection callbacks similarly report a resolved selection request. Imperative methods follow the same state policy. Because onNodeSelect has no null payload, clearing a controlled selection cancels pending work but the caller must supply selectedNodeId = null to remove its controlled highlight; add no new callback signature.

Store pendingSelection as { documentRevision, requestId, workflowId, stepId }. A later navigation/node selection, clear selection, overview selection, document replacement, or unrelated controlled destination/selection change cancels the previous request. A controlled prop update accepting the requested workflow or node advances the same request instead of cancelling it; an unchanged controlling prop never forces a local state override. Consume only the newest request matching the current document and destination graph. If already at the destination, resolve against current nodes immediately; otherwise wait for generated destination nodes. A missing step cancels with a diagnostic rather than leaving a request to leak into later navigation. Consume once after node generation; diagram centering waits for React Flow readiness. Default start-node centering cannot run afterward and overwrite requested step focus.

Model and graph effects depend on the document revision/model as well as destination, so changing only components or replacing an overview document refreshes the views. Documentation focus works in docs-only mode as well as split view.

**Alternative:** A pending stepId alone can select an identically named step after a superseding workflow switch. Independent handlers duplicate events and bypass target validation.

### 9. Documentation and verification

docGenerator, markdownFormatter, mermaidFlowchartGenerator, and mermaidGenerator's sequence output consume the same ordered actions, parameters, classified prerequisites, source bindings, support limitations, and diagnostics as diagrams. Documentation carries dependsOn, owner identities, action provenance, and unresolved/unsupported objects. Flowcharts emit all understood effective transitions, use generated safe node identifiers, escape labels, and distinguish one-way goto from retry/call return behavior. Unknown features remain in documentation without fabricated Mermaid control edges; an unknown profile does not produce semantic diagrams. Test generated syntax with the installed Mermaid parser, not string snapshots alone.

Sequence output is a schematic authored interaction view, not an execution trace. Use collision-safe participant IDs from classified source identities and explicit unverified-source participants for ambiguous bindings; never choose the first source. Async send/receive use their authored direction without an invented synchronous Response or activation lifetime. Correlation/timeout and prerequisites appear as authored notes; action notes follow the same inspection ordering and include supported inherited actions. Criteria notes do not use a success checkmark implying evaluation. Workflow-call targets remain workflow calls, not API sources. Preserve existing helper signatures with internal optional model inputs. Converter-local structural checks likewise use profile facts so channelPath-only steps are not incorrectly rejected; existing public isValid fields must not be presented as full schema validation.

Use a package-local Vitest runner with dedicated Vite/React test configuration, node environment for pure semantics, and jsdom plus React Testing Library for component integration. npm test runs vitest run and fails on an empty suite. Existing Mocha packages and the repository Babel config remain unchanged; the UI's unused Mocha bootstrap is excluded from Vitest discovery. This avoids adding TSX/CSS loader work to the shared Babel/Mocha pipeline. See [Vitest configuration](https://vitest.dev/guide/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

Loader integration tests use real parser/resolver calls and local fixtures with mocked network only at the fetch boundary. Model tests assert semantic tuples, not random internal IDs. Layout tests check final coordinates and node bounds; edge-component tests exercise actual lane/self-loop paths because applySequentialLayout does not calculate edge paths. Component tests cover controlled/uncontrolled modes, callback counts, rapid navigation, duplicate IDs, and input replacement. Final browser smoke covers overview, self-loops/parallel edges, split-view scroll, and step centering; jsdom cannot prove actual geometry.

### 10. Evolution contract and design acceptance

The extension seam is a small private profile contract: version match and capabilities, structural reusable inventory, and pure domain-fact extraction from a DocumentSnapshot. Loading, viewer policy, layout, navigation, and documentation do not switch on specification versions. A new Arazzo minor/major adds or changes a profile and parser/resolver capabilities only where required; a patch-only clarification retains the feature profile but can still require corrected behavior/tests. Source operation expansion, when separately authorized, adds family/version enrichment at the inspection boundary rather than teaching cards or layout about OpenAPI paths or AsyncAPI channel structures. Unknown new concepts can use generic details until a deliberate domain-fact extension is specified. Future standards that change semantics cannot be supported safely by mere passthrough.

Each profile must pass a contract suite for exact-version preservation and profile selection, input immutability, provenance, supported/unsupported feature classification, reusable inventory, and absence of renderer state/network effects. Shared-feature 1.0/1.1 fixtures must produce equivalent domain facts and viewer output; 1.1-only fields in 1.0 must remain visible but unsupported. A synthetic future profile, injected only into private test construction, must express existing fact kinds and drive the unchanged model/diagram/docs pipeline. This tests the seam, not a claim of future-spec compatibility. Unknown-version fallback, source-version uncertainty, unknown action kinds, extension preservation, and custom dialect/base-URI handling need dedicated regression coverage.

Design acceptance requires: (1) parser/resolver/validator/runner/viewer responsibilities remain distinct; (2) native context and authored data survive projection; (3) specification facts and inspection ordering remain separate; (4) operation inspection does not require an HTTP shape; (5) unsupported semantics are visible without guessed edges; and (6) a profile can provide known fact kinds without changing renderers. Implementation readiness alone does not satisfy these criteria; the contract tests and browser verification establish them during implementation.

**Alternative:** Versionless permissiveness makes unsupported data look valid. A generalized plugin platform adds lifecycle/API commitments without a second consumer. Moving UI policy into the runner would couple inspection to execution and conceal their present divergence.

The acceptance coverage below links each behavior contract to implementation and verification work; task 8.1 additionally maps individual scenarios to named tests when implementation exists.

| Spec requirement | Tasks providing implementation and verification |
| --- | --- |
| Versioned Inspection and Honest Capability Reporting | 1.2-1.5, 2.1, 2.5, 3.1, 3.6, 5.1, 7.1-7.2 |
| Transport-Neutral Operation Inspection | 1.3, 3.7, 5.2-5.3, 7.1-7.4 |
| Unknown Content and Document Provenance Preservation | 2.1-2.3, 2.5, 3.5-3.6, 7.2 |
| Document Overview Access and Navigation Compatibility | 5.1, 6.1, 6.3 |
| Deterministic Loading and Authored Reference Preservation | 2.1-2.4 |
| Consistent Semantics and Scoped Step Identity | 3.1, 3.5, 5.1-5.2, 7.1 |
| Action Precedence and Channel Separation | 3.2, 5.2, 7.1 |
| Reusable Action Parameter Overrides | 3.3, 7.2 |
| Complete Document Relationship Graph | 4.1, 4.4 |
| Cycle Discrimination and Readable Layout | 4.2-4.4, 8.3 |
| Step Prerequisites and Authored Order | 3.4, 5.3 |
| Classified Target Navigation | 3.4, 6.1, 6.4 |
| Destination-Aware Step Focus | 6.2-6.3 |
| Documentation Prerequisites and Ownership | 6.4, 7.1-7.2 |
| Mermaid Relationship Semantics | 5.4, 7.3 |
| Mermaid Inspection Sequence | 3.7, 7.4 |

## Risks / Trade-offs

- **[ApiDOM metadata copying]** -> Loader regression tests cover placeholders copied through reusable definitions and multiple occurrences. Recognize only ledger-owned metadata and restore before toValue; authored extension fields cannot masquerade as recovery markers.
- **[Dense cyclic graphs]** -> SCC grids and explicit edge lanes prioritize completeness over minimum crossings. Verify finite, non-overlapping positions with a representative dense fixture; no optimal-crossing promise or new production layout dependency.
- **[Display policy differs from an executor]** -> Label authored actions and precedence without evaluating expressions; the runner is outside this change.
- **[Generic parsing mistaken for version support]** -> Explicit profiles, feature support, raw fallback, and separate diagnostics prevent claims of schema/execution compatibility.
- **[Unsupported identity/dialect semantics]** -> Preserve authored identifiers and native metadata; capability-gate affected expansion and test that wrong-base resolution never occurs. Do not patch the resolver inside the UI.
- **[Overbuilding for hypothetical standards]** -> Two concrete Arazzo profiles and a transport-neutral fact shape justify the seam. Keep it private; add source enrichment or shared packages only with an actual second use case.
- **[New test runner]** -> Scope Vitest to the UI with explicit discovery and test-only dependencies, avoiding changes to other package suites.

## Migration Plan

Implement the snapshot/profile contract and loader first, then pure inspection and viewer policy, then wire diagram/navigation/documentation consumers. Public additions describe only the selected fields: source type asyncapi, root $self, step dependsOn/channelPath/action/timeout/correlationId, querystring parameter location, action parameters, documentation support/source-binding details, and calling workflow ownership. Reusable value typing must accept the same literal/selector values as Parameter.value while retaining existing callers. Update the misleading v1.0.1-only type header to describe selected supported fields; do not claim complete 1.1 types or rely on these interfaces as a lossless parser. Existing entry points and callback signatures remain compatible; private snapshots/profiles/recovery/model types stay out of exported declarations. Verify both ESM and UMD entries, declarations, and the standalone app. No persistent data migration is needed. Rollback reverts this UI change; it requires no document rewrite or changes to other packages.
