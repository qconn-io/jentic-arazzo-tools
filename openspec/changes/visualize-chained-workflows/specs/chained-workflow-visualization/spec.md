## Purpose

Enables consistent, version-aware inspection, reference/capability diagnostics, documentation, and navigation of composed Arazzo workflows, including prerequisites, action parameters, recovery loops, transport-neutral source bindings, and document-level relationships. Inspection does not certify schema conformance or execution support.

## ADDED Requirements

### Requirement: Versioned Inspection and Honest Capability Reporting
The viewer SHALL distinguish the document's declared Arazzo feature version from its author-provided description version. It SHALL inspect Arazzo 1.0 features and the explicitly supported subset of 1.1 features, treating patch versions as the same major/minor feature set. It SHALL report semantic inspection and reference-expansion limitations without claiming schema validation, source-version verification, or execution compatibility from successful loading. Unsupported semantics SHALL NOT produce guessed transitions.

#### Scenario: Patch version and description version
- **WHEN** two documents differ only in Arazzo patch version or info.version
- **THEN** their common features receive equivalent inspection and the exact authored version values remain visible and retrievable

#### Scenario: Selected Arazzo 1.1 inspection
- **WHEN** a 1.1 document uses step prerequisites, action parameters, querystring values, or asynchronous step metadata
- **THEN** those selected features are inspectable consistently in the viewer and documentation, with a visible statement that full 1.1 validation and execution support have not been established

#### Scenario: New feature in an older feature version
- **WHEN** a 1.0 document contains a 1.1-only step prerequisite or asynchronous field
- **THEN** the authored field remains available in generic details with an unsupported-feature warning and does not acquire guessed 1.1 relationship semantics

#### Scenario: Parseable unsupported Arazzo version
- **WHEN** the parser can represent a document whose Arazzo major/minor feature version is not understood
- **THEN** the viewer and documentation expose raw authored content and an unsupported-version diagnostic, without guessing workflow/action semantics or generating a semantic graph or Mermaid flowchart

#### Scenario: Unsupported parsing capability
- **WHEN** the installed parser cannot represent the submitted specification version
- **THEN** the viewer reports a parsing load error distinctly from an unsupported-inspection warning and leaves caller input unchanged

#### Scenario: Unsupported action kind
- **WHEN** a known-version document contains an action kind the viewer does not understand
- **THEN** its authored object and unsupported-feature warning remain visible, recognized defaults are retained, and no control transition is invented for that action

### Requirement: Transport-Neutral Operation Inspection
The viewer and documentation SHALL preserve and describe authored operation/workflow/channel locators, declared source kind, asynchronous send/receive intent, correlation expressions, timeouts, and querystring values without imposing an HTTP operation shape. An unfetched source SHALL remain unverified; its version, protocol, operation details, and execution behavior SHALL NOT be inferred.

#### Scenario: Asynchronous send and receive
- **WHEN** a 1.1 workflow declares an AsyncAPI send or receive step using an operation or channel locator, timeout, correlation expression, and explicit prerequisites
- **THEN** cards, documentation, and Mermaid labels retain that authored intent and metadata, prerequisite edges remain prerequisites, and no HTTP method, message-delivery prediction, or additional call/retry edge is invented

#### Scenario: Opaque source locators
- **WHEN** an operation locator addresses a webhook, a channel, or a source operation outside an HTTP paths layout
- **THEN** it is retained as the authored locator without being rewritten into an assumed HTTP path/method pair

#### Scenario: Unknown or ambiguous source
- **WHEN** a source is declared but not fetched, its kind is unknown, or a bare operation ID could belong to several sources
- **THEN** its kind/locator remain inspectable with an unverified or ambiguous status, no source version or arbitrary candidate is selected, and no source document is fetched

#### Scenario: Conflicting locators
- **WHEN** a step supplies conflicting operation, workflow, or channel locator fields
- **THEN** the viewer preserves all authored locators and displays an ambiguity diagnostic instead of silently selecting one destination

#### Scenario: Querystring value preservation
- **WHEN** a 1.1 parameter uses querystring with a literal or expression-containing string
- **THEN** every view preserves the location and complete authored value without splitting it into individual query parameters or evaluating expressions

### Requirement: Unknown Content and Document Provenance Preservation
Inspection and document retrieval SHALL preserve unknown authored fields, extensions, identifiers, schema dialect declarations, and unevaluated expressions. Reference diagnostics SHALL distinguish declaration and use-site ownership and retain available document/occurrence provenance. Supported reference expansion SHALL honor native resolution context; an unsupported identity/dialect rule SHALL preserve its affected references with a limitation instead of substituting semantics or resolving against a known-wrong base.

#### Scenario: Unknown fields and extensions
- **WHEN** a known-version document contains unknown fields and x-extension payloads at document, source, workflow, step, action, parameter, or schema locations
- **THEN** document retrieval retains their authored content, generic details make unknown unsupported fields inspectable, and opaque extensions are not interpreted as references/actions or warned merely for being extensions

#### Scenario: Reused declaration provenance
- **WHEN** an unresolved reference in a component declaration is reused by multiple steps
- **THEN** each using step receives its own occurrence-scoped diagnostic linked to the common declaration, with the document URI and occurrence path retained when available

#### Scenario: Authored identity differs from retrieval location
- **WHEN** a document declares $self that differs from its retrieval URI
- **THEN** both values remain distinct and retrievable, and relative references use supported native identity rules or remain authored with an unsupported-resolution warning rather than using a known-wrong base

#### Scenario: Unsupported schema dialect
- **WHEN** reference expansion depends on a dialect or identity rule not supported by installed resolution capabilities
- **THEN** affected authored references and dialect identifiers remain intact, inspection reports the limitation, and the viewer does not replace the dialect with a familiar one or claim full resolution

#### Scenario: No injected source metadata
- **WHEN** a caller supplies an already-materialized document without retrieval or source-map metadata
- **THEN** inspection uses occurrence paths and scoped identity without fabricating a source URI or source position

#### Scenario: Authored field resembles viewer bookkeeping
- **WHEN** raw input contains an authored _internalId field or an extension resembling a recovery marker
- **THEN** document retrieval preserves that content, selection remains uniquely scoped independently of it, and only bookkeeping created by the viewer is excluded from the returned document

### Requirement: Document Overview Access and Navigation Compatibility
For workflows inspected under a supported profile, the viewer SHALL provide an "All workflows" tab with bidirectional overview/workflow navigation. An uncontrolled viewer SHALL initially select the first workflow; an explicit null active-workflow prop SHALL select overview immediately. Existing public callback signatures SHALL remain compatible.

#### Scenario: Uncontrolled initial view
- **WHEN** a multi-workflow document is mounted without an active-workflow prop
- **THEN** its first workflow diagram is selected and the "All workflows" tab is available

#### Scenario: Explicit overview and round-trip navigation
- **WHEN** a viewer is mounted with an explicit null active-workflow prop, and a user subsequently selects a workflow node and returns through "All workflows"
- **THEN** the initial and final views show the overview and the intermediate view shows that workflow

#### Scenario: Controlled workflow selection
- **WHEN** a user requests a different workflow while the active-workflow prop is controlled
- **THEN** the workflow callback is emitted once and the displayed destination changes when the controlling prop changes

#### Scenario: Overview callback compatibility
- **WHEN** an uncontrolled user switches from a workflow to overview
- **THEN** the workflow callback is emitted once with the existing empty-string overview value

### Requirement: Deterministic Loading and Authored Reference Preservation
The loader SHALL recover from syntactically valid missing reusable components while resolving valid references supported by the existing resolver. Recovery SHALL preserve complete unresolved reusable objects and caller input, without exposing temporary placeholders, fabricated component definitions, or private diagnostic fields through document retrieval.

#### Scenario: Missing component before or after valid references
- **WHEN** a document contains a missing failure-action reference and another workflow with valid input schema references and reusable actions, in either workflow order
- **THEN** both workflows load with equivalent resolved inputs/actions/parameters and warning content when compared by workflow and occurrence, while authored workflow order is retained

#### Scenario: Missing component collection
- **WHEN** a reusable parameter or action references an absent components collection or bucket
- **THEN** the document loads and displays the original missing reference with a warning

#### Scenario: Reused action contains a missing parameter
- **WHEN** a valid reusable action used by multiple steps contains a missing reusable parameter with occurrence value 0
- **THEN** each using step shows the missing reference, value 0, and warning, and unrelated valid references resolve

#### Scenario: Document retrieval after recovery
- **WHEN** the caller retrieves a loaded document containing missing reusable references
- **THEN** original unresolved reference objects and their authored values/extensions are present, valid dereferencing remains present, no temporary components/markers are added, and the caller's original input is unchanged

#### Scenario: Reference-shaped literal data
- **WHEN** a parameter value, criterion, schema example, description, or extension payload contains a string resembling a components expression
- **THEN** it is preserved as authored data without being treated as a missing reusable object

#### Scenario: Fatal load failure
- **WHEN** input has invalid JSON/YAML or an unusable root, or a known-profile document has duplicate workflow IDs, duplicate step IDs within a workflow, a malformed supported reusable expression, or a fatal supported schema dereferencing error
- **THEN** the viewer displays a load error instead of rendering a partially resolved document

### Requirement: Consistent Semantics and Scoped Step Identity
Diagrams and documentation SHALL display the same actions, parameter values, targets, and warnings for each owning workflow and step. Identical step IDs in different workflows SHALL remain distinct in selection, diagnostics, and reference resolution.

#### Scenario: Identical step IDs with different actions
- **WHEN** flowA.init and flowB.init define different failure actions and parameters
- **THEN** each step displays only its own effective actions/parameters in diagrams and documentation

#### Scenario: Bare local prerequisite is context dependent
- **WHEN** two workflows refer to a prerequisite named prepare and only one workflow contains that local step
- **THEN** that workflow resolves its prerequisite locally and the other displays a missing-step warning without linking to the first workflow

#### Scenario: Replacement changes only shared components
- **WHEN** a loaded document is replaced with one changing only a reusable action or parameter definition
- **THEN** diagrams, overview, documentation, and diagnostics update to the new definition even if the selected workflow is unchanged or overview is active

### Requirement: Action Precedence and Channel Separation
The viewer SHALL display effective actions separately for success and failure. Within each channel it SHALL use the viewer policy of step entries first in authored order, followed by unmatched workflow defaults in authored order. A recognized resolved step action SHALL override a default only when name and type match in that channel. Effective order SHALL be labeled as viewer inspection order rather than predicted runner execution.

#### Scenario: Inspection ordering is not execution prediction
- **WHEN** an effective action listing merges step actions with unmatched workflow defaults
- **THEN** diagram details and documentation identify the order as viewer inspection policy, retain authored provenance, and do not claim that the runner uses that same merge or will execute a particular branch

#### Scenario: Step action precedes an overlapping default
- **WHEN** a step action and an unmatched workflow default have overlapping criteria
- **THEN** all views list the step action before the default, retain both criteria, and make no claim that either branch will execute

#### Scenario: Partial override and additional action
- **WHEN** a step replaces one default by matching name/type and adds another action
- **THEN** its authored step actions precede retained unmatched defaults, and the overridden default does not appear as a separate effective action

#### Scenario: Empty step action list
- **WHEN** a step omits or supplies an empty success/failure list
- **THEN** all defaults in that channel remain in authored order

#### Scenario: Equal names across channels or types
- **WHEN** success and failure actions share a name, or two failure actions share a name but differ in type
- **THEN** the channels remain separate and differing types do not override one another

#### Scenario: Unresolved action alongside defaults
- **WHEN** a step contains a missing reusable action and its workflow has valid default actions
- **THEN** the missing action is shown as an unresolved entry, valid defaults remain visible, and the warning does not invent an action or transition

### Requirement: Reusable Action Parameter Overrides
The viewer SHALL resolve reusable action parameters and apply occurrence value overrides by property presence without mutating shared definitions. Expressions, selector objects, and literal values SHALL be displayed without evaluation.

#### Scenario: Override and omitted override
- **WHEN** two actions reference the same parameter and only one occurrence supplies a value override
- **THEN** one displays its override, the other displays the component default, and the shared definition retains its original value

#### Scenario: Falsy and structured literals
- **WHEN** action parameter occurrences specify 0, false, an empty string, null, arrays, or objects
- **THEN** each supplied value is retained and displayed instead of falling back to the component value

#### Scenario: Authored expressions
- **WHEN** an action parameter contains a runtime expression or selector
- **THEN** diagrams and documentation display the authored content without attempting runtime evaluation

### Requirement: Complete Document Relationship Graph
The overview SHALL render workflow prerequisites, sub-workflow calls, and effective action workflow transitions with source-step/action provenance, preserving distinct parallel relationships and explicit self-loops.

#### Scenario: Workflow prerequisite direction
- **WHEN** orderWorkflow depends on authWorkflow
- **THEN** a dashed prerequisite arrow points from authWorkflow to orderWorkflow with a prerequisite label

#### Scenario: Sub-workflow and action transitions
- **WHEN** a checkout step calls paymentWorkflow and an effective failure action targets refreshTokenWorkflow with mapped parameters
- **THEN** distinct directed call and action edges show the calling step, action details, and mapped parameter count

#### Scenario: Same label across parallel action channels
- **WHEN** a step has success and failure goto actions with the same name and workflow target, and another step targets that workflow too
- **THEN** all relationships remain distinct, expose their channels and source steps, and are individually inspectable

#### Scenario: Explicit self-loop
- **WHEN** an action targets its own workflow
- **THEN** the overview preserves and visibly routes the self-loop

#### Scenario: Unlinked document
- **WHEN** workflows have no prerequisite, call, or action workflow relationships
- **THEN** the overview shows a tidy multi-column grid without invented edges

### Requirement: Cycle Discrimination and Readable Layout
The graph SHALL preserve all relationships in cyclic documents, provide finite non-overlapping workflow positions, and flag invalid prerequisite cycles using workflow prerequisite relationships alone.

#### Scenario: Runtime and mixed relationships
- **WHEN** workflows form a call/recovery loop or a cycle containing both prerequisite and call edges without a prerequisite-only cycle
- **THEN** all edges remain visible and no invalid-prerequisite-cycle warning is emitted

#### Scenario: Prerequisite cycle and unrelated edges
- **WHEN** wfA and wfB depend on one another and another prerequisite edge enters or leaves that cycle
- **THEN** cyclic prerequisite edges receive warnings while the entering/leaving edge is not incorrectly flagged

#### Scenario: Prerequisite self-loop
- **WHEN** a workflow depends on itself
- **THEN** its prerequisite self-loop remains visible with a cycle warning

#### Scenario: Dense and disconnected relationships
- **WHEN** a document has several workflows in a cycle, parallel edges, and disconnected workflows
- **THEN** workflow cards do not overlap, self-loops/parallel edges have distinct visible routes, and repeated layout of the same document produces the same positions

### Requirement: Step Prerequisites and Authored Order
Single-workflow diagrams SHALL retain authored step order and overlay explicit prerequisite arrows without treating a prerequisite as an invocation. Missing or external step prerequisites SHALL remain visible with their target classification.

#### Scenario: Multiple local prerequisites
- **WHEN** processPayment depends on validateCard and checkInventory
- **THEN** the diagram retains array order and draws labeled side-routed prerequisite arrows from those steps to processPayment

#### Scenario: Cross-workflow prerequisite
- **WHEN** a step depends on $workflows.orderWorkflow.steps.validateCart
- **THEN** its diagram displays the owning target workflow and step as a navigable prerequisite

#### Scenario: Missing or external prerequisite step
- **WHEN** a prerequisite names an absent local step or $sourceDescriptions.remote.orderWorkflow.steps.validateCart
- **THEN** the diagram displays a missing-step warning or external-source badge respectively, without inventing a local step or invoking it

### Requirement: Classified Target Navigation
The viewer SHALL distinguish local workflows, scoped steps, external references, and missing targets. External targets SHALL be displayed without fetching their documents or performing a local workflow switch; missing targets SHALL display warnings without invalid navigation.

#### Scenario: Local workflow navigation
- **WHEN** a user activates a valid local workflow chip or node
- **THEN** the viewer requests that workflow through the normal selection policy

#### Scenario: External source versus local name collision
- **WHEN** an external workflow has the same workflow ID as a local workflow
- **THEN** its reference retains the source badge and does not navigate to the local workflow

#### Scenario: Invalid external source or missing target
- **WHEN** a reference names an absent source, a non-arazzo workflow source, a malformed target, or a missing workflow/step
- **THEN** the original target remains visible with a warning and activation leaves the active workflow unchanged

### Requirement: Destination-Aware Step Focus
Step navigation SHALL retain the full destination until its nodes are available, honor controlled selection, and cancel stale requests. Focus SHALL land on the newest valid request for the current document and workflow, including when the destination is already active.

#### Scenario: Cross-workflow step focus
- **WHEN** a user requests orderWorkflow.validateCart from a different workflow
- **THEN** the workflow is selected under the control policy and the target step is highlighted and centered once its diagram is ready, without later start-node centering overriding it

#### Scenario: Already-active destination
- **WHEN** a user activates a prerequisite to a step in the active workflow
- **THEN** that step receives focus without requiring a workflow change

#### Scenario: Superseding navigation with duplicate IDs
- **WHEN** a pending request for flowB.init is superseded by navigation to flowC containing another init
- **THEN** the stale request does not select flowC.init

#### Scenario: Cancellation or replacement
- **WHEN** the user clears selection, selects overview, supplies an unrelated controlled destination/selection, or replaces the document before focus completes
- **THEN** the prior request cannot select a step in the later state

#### Scenario: Controlled destination accepts the request
- **WHEN** a user requests flowB.init in a controlled viewer and the caller updates the active workflow to flowB in response
- **THEN** the pending request survives that matching update and resolves specifically to flowB.init under the controlled selection policy

#### Scenario: Missing destination step
- **WHEN** a requested step is absent from the destination
- **THEN** a warning is displayed and the request is discarded without leaking into later navigation

#### Scenario: Controlled node selection
- **WHEN** focus requests a node while selected-node state is controlled
- **THEN** the selection callback reports the resolved request and highlighting follows the controlling prop

#### Scenario: Clearing a controlled highlight
- **WHEN** selection is controlled and the clear-selection operation is invoked
- **THEN** pending focus is cancelled, the supplied selected-node prop remains authoritative, and supplying null removes the highlight without changing the existing node-selection callback signature

### Requirement: Documentation Prerequisites and Ownership
Documentation SHALL show workflow/step prerequisites, ordered effective actions and parameter values, and unresolved warnings consistently with diagrams. Selecting a call-step card SHALL identify its calling workflow, and step scrolling SHALL be scoped to that owner.

#### Scenario: Workflow and step prerequisites in documentation
- **WHEN** workflows or steps declare prerequisites
- **THEN** their documentation lists classified prerequisites with local jump links, external badges, or missing-target warnings as appropriate

#### Scenario: Calling workflow owns the card
- **WHEN** flowA contains a step calling flowB and the user selects that step
- **THEN** documentation expands flowA and scrolls to the authored call-step card

#### Scenario: Legacy call-node ownership
- **WHEN** an existing consumer supplies a call node without the new optional calling-workflow field
- **THEN** the viewer resolves its owner through scoped node identity or reports unavailable ownership, without interpreting the called workflow as its owner or breaking the existing node-data type contract

#### Scenario: Duplicate step IDs in documentation
- **WHEN** flowA and flowB both contain init and the user requests flowB.init
- **THEN** documentation expands and scrolls specifically to flowB.init in docs-only and split modes

#### Scenario: Effective action details
- **WHEN** an inherited or overridden action has mapped parameters or a missing reusable parameter
- **THEN** its documentation shows effective values, source provenance, and original unresolved content/warnings matching the diagram

### Requirement: Mermaid Relationship Semantics
For supported inspection profiles, generated Mermaid flowcharts SHALL include every understood effective action transition and explicit prerequisite with authored labels/parameters, safe identifiers, and correct transfer semantics. Unsupported content SHALL remain inspectable without fabricated semantic edges.

#### Scenario: Prerequisites and multiple transitions
- **WHEN** a workflow contains step prerequisites, inherited actions, and several action workflow targets
- **THEN** its generated diagram represents all those relationships and parameter counts rather than only the first action

#### Scenario: Goto versus retry recovery
- **WHEN** success/failure actions use goto or retry targeting a workflow
- **THEN** goto is shown as a one-way transfer and retry recovery returns to retry the source step, without an invented goto return to the next step

#### Scenario: Labels requiring escaping
- **WHEN** IDs, names, criteria, or values contain quotes, brackets, delimiters, or newlines
- **THEN** generated Mermaid remains parseable and retains readable authored labels

### Requirement: Mermaid Inspection Sequence
Generated sequence diagrams SHALL use the same classified source bindings, supported actions, parameter values, and inspection limitations as other views. They SHALL be presented as schematic authored interactions, without predicting evaluated outcomes or guessing source ownership and message delivery behavior.

#### Scenario: Authored asynchronous interaction
- **WHEN** an inspected workflow has AsyncAPI send/receive steps with prerequisites, correlation expressions, and timeouts
- **THEN** the sequence shows authored message direction and metadata/prerequisite notes without inventing a synchronous response, activation lifetime, or successful criterion result

#### Scenario: Ambiguous source participant
- **WHEN** an operation has no verified source assignment or several candidate sources
- **THEN** its sequence participant is explicitly unverified rather than arbitrarily selecting the first source description

#### Scenario: Action and parameter parity
- **WHEN** steps inherit or override actions and reusable parameters
- **THEN** the sequence's notes retain the same effective action order and parameter details as documentation, labeled as inspection policy rather than an execution trace

#### Scenario: Participant identity and escaped labels
- **WHEN** distinct source names collide under punctuation removal or contain Mermaid delimiters
- **THEN** generated participants remain distinct and the diagram stays parseable with readable authored labels

#### Scenario: Unsupported version sequence
- **WHEN** the document has no supported semantic inspection profile
- **THEN** raw documentation and the limitation remain available without generating a guessed sequence diagram
