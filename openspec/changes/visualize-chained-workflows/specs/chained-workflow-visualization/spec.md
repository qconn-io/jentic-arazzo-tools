## Purpose

Enables readers to discover workflow relationships, follow connected sequences into downstream interactions, inspect mappings and details, and return to the caller without reading YAML. Version-aware inspection preserves prerequisites, actions, recovery loops, transport-neutral source bindings, and document provenance while presenting limitations in context; inspection does not certify schema conformance or execution support.

## ADDED Requirements

### Requirement: Versioned Inspection and Honest Capability Reporting
The viewer SHALL distinguish the document's declared Arazzo feature version from its author-provided description version. It SHALL inspect Arazzo 1.0 features and the explicitly supported subset of 1.1 features, treating patch versions as the same major/minor feature set. It SHALL report semantic inspection and reference-expansion limitations without claiming schema validation, source-version verification, or execution compatibility from successful loading. Unsupported semantics SHALL NOT produce guessed transitions.

#### Scenario: Patch version and description version
- **WHEN** two documents differ only in Arazzo patch version or info.version
- **THEN** their common features receive equivalent inspection and the exact authored version values remain visible and retrievable

#### Scenario: Selected Arazzo 1.1 inspection
- **WHEN** a 1.1 document uses step prerequisites, action parameters, querystring values, or asynchronous step metadata
- **THEN** those selected features are inspectable consistently in the viewer and documentation, with a compact visible inspection-status control whose details explain that full 1.1 validation and execution support have not been established, without repeating that statement on each interaction

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
- **THEN** cards, documentation, and sequence interactions show the authored intent and direction, retain the metadata in accessible details, keep prerequisites distinguishable from calls, and invent no HTTP method, message-delivery prediction, or additional call/retry edge

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
- **THEN** every view exposes the location and complete authored value through its details without splitting it into individual query parameters or evaluating expressions; the default diagram need not print the full value

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
For workflows inspected under a supported profile, the viewer SHALL provide a visible "All workflows" control and workflow selection in Docs, Diagram, and Split modes, with bidirectional overview/workflow navigation. Selecting overview SHALL display a document overview in the current mode rather than only changing hidden diagram state. An uncontrolled viewer SHALL initially select the first workflow; an explicit null active-workflow prop SHALL select overview immediately. Existing public callback signatures SHALL remain compatible.

#### Scenario: Uncontrolled initial view
- **WHEN** a multi-workflow document is mounted without an active-workflow prop
- **THEN** its first workflow is selected in the current mode and the "All workflows" control and workflow selection are visible without switching modes

#### Scenario: Explicit overview and round-trip navigation
- **WHEN** a viewer is mounted with an explicit null active-workflow prop, and a user subsequently selects a workflow from the overview and returns through "All workflows"
- **THEN** the initial and final views show the overview and the intermediate view shows that workflow, in each supported view mode

#### Scenario: Overview from default Docs mode
- **WHEN** a user loads a supported multi-workflow document in the default Docs mode and selects "All workflows"
- **THEN** the user sees the workflows and their classified relationships, can select an entry workflow, and does not need to discover or switch to Diagram or Split mode first

#### Scenario: Switching view modes
- **WHEN** a user switches between Docs, Diagram, and Split while viewing an overview or selected workflow
- **THEN** the selected destination and visible overview/workflow navigation remain consistent, with one shared selection in Split mode

#### Scenario: Many workflows and limited width
- **WHEN** a document contains many long workflow names or the viewer has limited horizontal space
- **THEN** "All workflows" remains discoverable and workflow selection remains operable with keyboard and pointer without hiding navigation behind an offscreen diagram tab strip

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
Diagrams and documentation SHALL expose the same actions, parameter values, targets, and warnings for each owning workflow and step through concise summaries and inspectable details. Semantic parity SHALL NOT require duplicating full metadata or general limitations on the default canvas. Identical step IDs in different workflows SHALL remain distinct in selection, diagnostics, and reference resolution.

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
- **THEN** distinct directed call and action edges identify their kind and calling step, with action details and mapped parameter counts available through selection

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

#### Scenario: Return to the calling occurrence
- **WHEN** a user follows a local call from flowA.callPayment into flowB and activates the visible return-to-caller control
- **THEN** navigation returns to flowA.callPayment with its context and selection restored, rather than to an arbitrary caller or the first step; the same behavior is available in Docs, Diagram, and Split

#### Scenario: Same callee reached from different calls
- **WHEN** the same workflow is called from multiple steps or through nested call paths
- **THEN** the visible caller context identifies the followed occurrence and returning follows that path, while replacement documents or unrelated controlled navigation cannot restore a stale caller

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
For supported inspection profiles, generated Mermaid flowcharts SHALL include every understood effective action transition and explicit prerequisite with concise authored labels, safe identifiers, and correct transfer semantics. Complete authored parameters SHALL remain available in associated details or an explicitly requested detailed rendering rather than being mandatory text on the default diagram. Unsupported content SHALL remain inspectable without fabricated semantic edges.

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
Generated sequence diagrams SHALL use the same classified source bindings, supported actions, parameter values, and inspection limitations as other views. They SHALL present connected schematic authored interactions with concise labels and relevant participants, retaining complete metadata in associated inspectable details. They SHALL NOT predict evaluated outcomes or guess source ownership and message delivery behavior. Local workflow calls SHALL follow the connected sequence requirements below rather than appearing only as notes.

#### Scenario: Authored asynchronous interaction
- **WHEN** an inspected workflow has AsyncAPI send/receive steps with prerequisites, correlation expressions, and timeouts
- **THEN** the sequence shows authored message direction and concise prerequisite annotations, exposes correlation, timeout, and other metadata through details, and invents no synchronous response, activation lifetime, or successful criterion result

#### Scenario: Ambiguous source participant
- **WHEN** an operation has no identifiable declared source assignment or several candidate sources
- **THEN** its sequence uses an explicitly unknown or ambiguous destination and exposes the original locator and explanation without arbitrarily selecting the first source description

#### Scenario: Declared source has not been fetched
- **WHEN** an operation explicitly identifies a declared source whose document has not been fetched
- **THEN** the sequence names that declared source as its destination and exposes the source-not-checked status in details, without treating the known declaration as an ambiguous destination or asserting that the operation has been verified

#### Scenario: Action and parameter parity
- **WHEN** steps inherit or override actions and reusable parameters
- **THEN** selection exposes the same effective action order and full parameter details as documentation, labeled as inspection policy rather than an execution trace, without filling the default sequence with repeated parameter or action-object notes

#### Scenario: Participant identity and escaped labels
- **WHEN** distinct source names collide under punctuation removal or contain Mermaid delimiters
- **THEN** generated participants remain distinct and the diagram stays parseable with readable authored labels

#### Scenario: Unsupported version sequence
- **WHEN** the document has no supported semantic inspection profile
- **THEN** raw documentation and the limitation remain available without generating a guessed sequence diagram

### Requirement: Connected Local Workflow Sequences
For a selected workflow under a supported inspection profile, the sequence view SHALL show standard local workflow calls as identifiable call interactions and expandable groups containing the callee's authored interactions. Direct local calls SHALL initially be expanded within visible display limits; deeper calls SHALL offer explicit expansion controls. Each occurrence SHALL retain its caller, call step, callee, and authored input/output mappings. Structural call and return boundaries SHALL distinguish workflow composition from API exchanges and SHALL NOT imply a successful execution or fabricate an API response.

#### Scenario: Direct call contains downstream interactions
- **WHEN** checkout calls payment and payment contains an operation targeting a declared payment API
- **THEN** the initial checkout sequence shows the checkout-to-payment call, a labeled payment group containing that API interaction, and the structural return to checkout's continuation, rather than only a call note or a disconnected payment diagram

#### Scenario: Deeper call expansion and collapse
- **WHEN** payment calls another local workflow and the reader expands that call, then collapses the payment group
- **THEN** the deeper interactions appear within the correct call path and collapse restores a concise call summary without losing the reader's root workflow or inventing a new execution order

#### Scenario: Repeated callee with distinct mappings
- **WHEN** two steps call the same local workflow with different parameter values
- **THEN** the sequence retains two distinct call occurrences whose selection exposes their respective values, callee inputs, and authored output expressions without evaluating them or merging their identities

#### Scenario: Structural return is not an outcome assertion
- **WHEN** a local call group displays a return boundary
- **THEN** its presentation identifies workflow-control continuation, does not label it as an evaluated success or HTTP response, and keeps conditional transfers distinguishable from the ordinary structural continuation

#### Scenario: Goto, retry, and prerequisite distinctions
- **WHEN** a workflow contains a conditional goto, retry recovery targeting another workflow, and a prerequisite
- **THEN** the sequence distinguishes possible one-way transfer, recovery returning to retry the source step, and prerequisite dependence; it does not depict them as ordinary calls returning to the next step or as branches known to execute

#### Scenario: Recursion and bounded expansion
- **WHEN** expansion encounters a call already on the current path or exceeds a depth or displayed-interaction limit
- **THEN** it stops at a visible marker identifying the target and reason, offers inspection or navigation to available local content, and neither hangs nor silently drops the relationship or claims that the workflow ends at the display boundary

#### Scenario: External or missing callee
- **WHEN** a call targets an unfetched external workflow or an absent local workflow
- **THEN** the sequence retains the call and its external or missing status, explains why expansion is unavailable, and does not fetch content, substitute a same-named local workflow, or fabricate the callee's interactions

#### Scenario: Descriptive implementation association
- **WHEN** an API operation's internal implementation is described only in prose or x-internal-processing, including the D1 sample's client/server association
- **THEN** the content remains inspectable but produces no inferred call edge or nested sequence group; separate standard adapter-to-ABT workflow calls remain expandable, and the absence of a standard relationship is explained without declaring the extension invalid

### Requirement: Readable Diagrams and Details on Selection
Default diagrams SHALL prioritize workflow, participant, step, and relationship identity over raw metadata. Full parameters, criteria, input/output mappings, provenance, unresolved authored content, and contextual diagnostics SHALL remain accessible through selection or explicitly labeled detail controls. Controls SHALL be operable by keyboard and pointer with understandable names and visible focus. Sequence participants SHALL be limited to the displayed interactions and necessary call context rather than all source descriptions in the document.

#### Scenario: Metadata-heavy workflow
- **WHEN** a workflow contains long criteria, structured parameters, multiple actions, and timeouts
- **THEN** the initial sequence remains focused on interactions without full JSON objects or repeated parameter/criteria notes, and selecting an interaction reveals its complete authored details without loading a different document

#### Scenario: Input and output mapping inspection
- **WHEN** a reader selects a workflow call
- **THEN** details distinguish caller-supplied parameter names and values, declared callee inputs and outputs, and caller-side output expressions; unavailable mappings are identified rather than fabricated

#### Scenario: Relevant participants and long labels
- **WHEN** the document declares unused sources or lengthy workflow and operation names
- **THEN** the sequence shows participants for its displayed interactions, concise distinguishable labels, and access to full names without overlapping labels that prevent following the call path

#### Scenario: Keyboard interaction
- **WHEN** a reader navigates the workflow selector, call expansion, details, and return-to-caller controls using a keyboard
- **THEN** each action is available with visible focus and an understandable accessible name, and closing details returns focus to the relevant interaction or its control

### Requirement: Contextual Inspection Status
The viewer SHALL consolidate general inspection limitations in one compact document-level status control whose details describe what was and was not checked. It SHALL distinguish unfetched sources from invalid sources and explain how unsupported resolution affects displayed references. Actionable missing or ambiguous relationships SHALL retain visible occurrence markers with accessible explanations. General limitations SHALL NOT be repeated on every diagram participant or interaction.

#### Scenario: Sources not checked
- **WHEN** source descriptions were not fetched
- **THEN** the compact status reports that source documents were not checked and its details explain that this does not establish invalidity or inaccessibility, without repeating a validation/execution disclaimer on each sequence step

#### Scenario: Reference expansion bypassed
- **WHEN** expansion is bypassed because of unsupported $self semantics, unavailable base URI, or an unsupported schema dialect
- **THEN** status details name the detected cause and explain that affected references remain authored, without listing unrelated possible causes as though they were all detected or implying that every understood local workflow call is unavailable

#### Scenario: Missing target needs attention
- **WHEN** one call has a missing or ambiguous target in an otherwise inspectable document
- **THEN** its occurrence has a visible marker and an explanation identifying the target and unavailable action, while general document status remains consolidated and unrelated interactions remain readable

### Requirement: Workflow Chaining Comprehension Acceptance
Acceptance SHALL include browser walkthrough evidence for the D1 standard sample and a reproducible nested-call fixture. The walkthrough SHALL demonstrate the reader tasks below from the default view without requiring raw YAML, hidden mode knowledge, or explanations from the implementer. Screenshots and observations SHALL record the relevant states and any failed tasks; semantic assertions and parseable diagram syntax alone SHALL NOT establish visual UX acceptance.

#### Scenario: Find and follow a chain
- **WHEN** a reader opens the nested-call fixture in the default view
- **THEN** the reader can find All workflows, select an entry workflow, identify caller and callee, follow the callee's downstream API interaction, inspect its mappings, and return to the original calling occurrence using visible controls

#### Scenario: D1 standard composition and its boundary
- **WHEN** a reader opens the D1 standard sample
- **THEN** the overview exposes its six standard adapter-to-ABT calls, an adapter implementation sequence exposes the called ABT workflow's API interactions, and the separate client workflows are not falsely connected through their descriptive implementation associations

#### Scenario: Usability across modes and difficult documents
- **WHEN** the walkthrough covers Docs, Diagram, and Split modes plus repeated calls, recursion, an external target, and a metadata-heavy workflow
- **THEN** navigation and details remain discoverable, call occurrences stay distinguishable, expansion boundaries and unavailable content are understandable, and the default diagrams remain usable without repeated general warnings or raw metadata dominating the interactions
