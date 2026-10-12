# workflow-reading Specification

## Purpose

Help API Owners and Developers locate and understand authored workflow interactions through readable details, accessible navigation, and responsive views.

## Requirements

### Requirement: Structured interaction details
Selecting an interaction SHALL show its owning workflow and occurrence context followed by applicable parameters, request body or message payload, criteria, outputs, prerequisites, and recovery actions in readable sections. Exact authored expressions and structured values SHALL remain accessible without requiring raw document navigation. Authored absence SHALL be distinguished from an authored empty or falsy value.

#### Scenario: Inspect a mapped purchase
- **WHEN** the reader selects the second `fulfil-item` call in `batch-fulfilment`
- **THEN** details identify `second-item`, show its own purchase/product/amount and output mappings, and distinguish caller values from declared callee inputs and outputs

#### Scenario: Falsy and nested values
- **WHEN** the reader inspects the metadata-heavy fixture
- **THEN** `0`, `false`, `null`, an empty string, and nested values remain distinguishable and available in full

### Requirement: Understandable recovery and provenance
Details SHALL distinguish success criteria, possible conditional actions, one-way goto, recovery before retrying the source step, and prerequisite dependence. Inspection ordering SHALL NOT be presented as evaluated action selection. Inherited, overridden, unresolved, and authored action provenance SHALL be inspectable without duplicating complete objects in every default section.

#### Scenario: Unknown capture outcome
- **WHEN** the reader inspects `capture-authorized-payment.capture-payment`
- **THEN** the reader can identify the UNKNOWN/503 criteria, reconcile-payment recovery, source-step retry, limit three, delay 0.5, and the separate DECLINED abort path from the displayed details

#### Scenario: Asynchronous timeout
- **WHEN** the reader inspects the event purchase receive step
- **THEN** correlation, timeout, receive retry limits, and polling fallback are readable while their exact authored declarations remain available

### Requirement: Search all authored workflow content
Document-local search SHALL match workflow and step IDs, titles/summaries, and authored operation locators without being restricted to currently rendered sequence rows. Results SHALL expose scoped ownership, retain authored order within a workflow, and navigate to inspectable content. A search result SHALL NOT select a guessed call occurrence when several exist.

#### Scenario: Content beyond the row limit
- **WHEN** the reader searches for `observation-250` in the 250-step fixture
- **THEN** the result opens that authored step's details or documentation even though its sequence interaction is outside the 200-row scene

#### Scenario: Duplicate step identity
- **WHEN** search matches the same step ID in different workflows or repeated calls
- **THEN** results identify the owning workflow, and an authored-step destination is distinguished from an occurrence-specific destination

### Requirement: Readable sequence context
Sequence scrolling SHALL retain access to participant identity and root/call context. The numbered list SHALL enumerate authored steps, including workflow-call steps, with nested callee steps visually subordinate to their exact call occurrence. Possible actions and recovery SHALL be subordinate disclosures at their owning step with a visible indication of their presence; structural continuations, prerequisites and display boundaries SHALL be distinct unnumbered annotations rather than additional operations. The diagram SHALL use corresponding compact action cues with expansion on demand. Collapsing action content SHALL NOT imply a successful path, evaluate conditions, remove dependency cues, conceal unavailable targets or hide recursion/depth/row limits. Exact authored action details, provenance, long labels and distinct accessible names SHALL remain available.

#### Scenario: Five Petstore operations
- **WHEN** the reader opens unchanged Petstore's sequence
- **THEN** its five authored steps have five primary numbers, each applicable retry remains discoverable beneath its owning step, and neither a retry nor a structural annotation is numbered as a sixth operation

#### Scenario: Dense expanded sequence
- **WHEN** the reader expands the stress journey and scrolls vertically and horizontally
- **THEN** participant and call context remain accessible, repeated captures are distinguishable by occurrence, and nested step numbering is consistent between diagram labels and the ordered list without changing authored IDs

#### Scenario: Inspect conditional recovery
- **WHEN** the reader reveals capture-payment recovery or an asynchronous receive timeout
- **THEN** authored criteria, one-way fallback, retry destination/limit/delay and correlation remain inspectable with their existing meanings and are not represented as outcomes known to occur

#### Scenario: Selected hidden content or coverage boundary
- **WHEN** a restored location targets a collapsed action, or expansion reaches recursion, depth or row limits
- **THEN** the selected action is revealed in its exact occurrence, and visible boundary explanations still provide access to available authored content without claiming the workflow ends there

### Requirement: Readable workflow overview
Overview SHALL initially present concise workflow entries with readable authored summaries and exact IDs, using the same typography, spacing, interactive states and focus treatment as single-workflow reading. Each entry SHALL offer direct workflow selection and a separately operable relationship disclosure. Classified incoming/outgoing calls, prerequisites, one-way transfers and retry recovery, their scoped origins and relationship filters SHALL remain available on demand alongside the graph alternative. The initial list SHALL NOT expand all relationship links or repeat empty incoming/outgoing sections for every workflow. Unavailable relationships SHALL remain discoverable through a concise visible indication. An unreadable fit-to-view graph SHALL NOT be the only way to understand a dense document.

#### Scenario: Eighteen-workflow overview
- **WHEN** the reader opens All workflows in the HTTP stress example
- **THEN** all eighteen workflows are available as concise entries with relationships initially collapsed, and the reader can open a workflow without navigating its relationship list first

#### Scenario: Inspect and filter relationships
- **WHEN** the reader reveals an entry's relationships or the overview's relationship filters
- **THEN** incoming and outgoing directions, call/prerequisite/goto/retry classifications, parallel relationships and scoped navigation remain available without reclassifying a prerequisite as a call

#### Scenario: Missing targets and narrow controls
- **WHEN** an overview contains an unavailable target or long workflow labels at 480 pixels
- **THEN** the affected entry visibly indicates the limitation, its explanation and complete label are accessible, and styled controls wrap without overlapping or widening the page

### Requirement: Responsive and keyboard-operable inspection
At desktop and 480-pixel viewport widths, header and navigation controls SHALL remain operable without overlap or whole-page horizontal scrolling. In plain workflow reading at 1440 by 1000 and 480 by 900 pixels with no inspector or optional context open, persistent controls SHALL leave at least 60 percent of viewport height for reading. Unchanged Petstore's first sequence interaction SHALL be visible on initial load without scrolling past document metadata. Long descriptions, source declarations and optional setup SHALL be available on demand rather than preceding the diagram as mandatory reading. Two-dimensional diagrams SHALL use contained scroll/zoom; the default presentation SHALL NOT shrink text below 12 displayed pixels to fit more content. Escape SHALL close details and restore focus to the initiating control or a visible fallback. A covering narrow inspector SHALL contain focus and make covered background controls unavailable; a desktop nonmodal inspector SHALL retain access to the main view.

#### Scenario: Plain entry at both widths
- **WHEN** Petstore opens at 1440 by 1000 or 480 by 900 with the default reading settings
- **THEN** the first interaction is visible, the reading region meets the height budget, participant labels remain readable, and no empty guide or unavailable Systems panel consumes persistent space

#### Scenario: Narrow covering inspector
- **WHEN** a keyboard user opens details at 480 pixels, cycles focus and presses Escape
- **THEN** focus stays within the covering inspector until dismissal and returns to its initiating interaction or a visible fallback

#### Scenario: Long document information
- **WHEN** a reader reveals lengthy authored descriptions, sources or provenance
- **THEN** complete content is readable in a scrollable or dismissible area and closing it returns to the same workflow without changing its semantic content

### Requirement: Shared facts and comprehension evidence
Docs, Sequence, Diagram and Split SHALL use consistent scoped interaction facts while avoiding repeated full detail sections in default reading. Acceptance SHALL include fresh production-browser walkthroughs of unchanged default Petstore and all nine existing digital-product/stress documents, all inventoried workflow sequences, and explicit core-reading tasks for an unfamiliar API Owner and Developer (closed either by recorded unassisted protocol sessions or by explicit user-confirmed API Owner/Developer feedback recorded in `human-results.md`). Core tasks SHALL assess explaining a workflow, following a chained call and returning, selecting an interaction, identifying a guard or recovery, and distinguishing repeated mappings. Optional guide/Systems discovery and specialist catalog/review tasks SHALL be evaluated separately from core reading, with their own results visible. Automated navigation success SHALL NOT be reported as human comprehension.

#### Scenario: Change view while inspecting
- **WHEN** the reader changes supported presentation while inspecting a scoped interaction
- **THEN** authored values, target classifications, warnings and occurrence context remain consistent

#### Scenario: Browser acceptance record
- **WHEN** the change is verified
- **THEN** identified current builds and reviewed screenshots record core reading, optional discovery, exact second-item mappings, timeout fallback, boundary access, long labels and error/focus recovery at both viewport widths

#### Scenario: Core reading without feature training
- **WHEN** unfamiliar readers start with the plain entry and receive core workflow-reading tasks
- **THEN** they are not first required to discover guide setup or Systems availability, and assistance, interpretations and outcomes are recorded before separate optional-feature tasks begin

#### Scenario: Missing or user-confirmed human evidence
- **WHEN** automated checks pass
- **THEN** engineering results are reported independently, and final UX acceptance is closed only by recorded protocol sessions or explicit user-confirmed API Owner/Developer feedback in `human-results.md` (without inventing session timings or transcripts)

### Requirement: Reader-facing layout and representation hierarchy
The viewer SHALL present Sequence diagram and Step descriptions as the primary reading choices for a selected workflow, with Workflow diagram, Flowchart and Side by side available through a keyboard-operable More views disclosure. The selected presentation SHALL remain understandable without simultaneously exposing separate layout and representation toolbars. A fresh viewer with no explicit view, location or prior reading choice SHALL open the first workflow's sequence. Explicit host view settings, initial views, restored locations and existing public mode/subview values SHALL retain their supported meaning and precedence. Explicit overview selection SHALL remain an overview without an invented document-wide sequence.

#### Scenario: First sequence discovery
- **WHEN** a reader opens unchanged Petstore without view/location configuration
- **THEN** its sequence is selected immediately, Step descriptions is directly available, and alternative presentations are available through More views without first learning a Docs mode

#### Scenario: Old link and controlled host
- **WHEN** a host explicitly selects a layout or initial view, or a saved location supplies a layout and reading representation
- **THEN** that explicit intent is honored ahead of the implicit sequence default, including legacy locations without a subview retaining their existing interpretation

#### Scenario: Controlled view request
- **WHEN** a reader requests a presentation whose layout is controlled by the host
- **THEN** the viewer issues the existing callback value once, waits for host acceptance, and cancels a stale request after document or conflicting selection replacement

#### Scenario: Keyboard and overview selection
- **WHEN** a keyboard or screen-reader user opens More views, changes presentation or selects All workflows
- **THEN** selected and expanded states are exposed, focus remains applicable, and overview exposes no fabricated sequence or selected workflow reading controls

#### Scenario: Return from an alternative presentation
- **WHEN** the reader turns off Side by side or chooses Sequence diagram from Systems
- **THEN** the requested ordinary reading presentation becomes visible through the existing controlled-state authority, without requiring a detour through another view or losing the supported return context

### Requirement: Meaningful workflow and interaction labels
Workflow navigation SHALL include readable authored summaries when available alongside exact scoped IDs. Sequence operations SHALL expose authored operation identity as well as the step ID when they differ; send/receive intent, calls, transfers and continuations SHALL remain distinguishable. Generated participant IDs SHALL NOT be visible headings. Full long labels and exact locators SHALL remain accessible without making the default canvas unreadable.

#### Scenario: Petstore step differs from operation name
- **WHEN** findAvailablePets refers to findPetsByStatus
- **THEN** the default operation presentation exposes both identities and the full locator remains available in details

#### Scenario: Long or duplicate summaries
- **WHEN** workflows have equal or lengthy summaries or lack a summary
- **THEN** navigation remains distinguishable through exact workflow IDs, uses the ID as a fallback, and offers the full readable label at desktop and 480-pixel widths

#### Scenario: Genuine unresolved participant
- **WHEN** an interaction has a genuinely unresolved destination
- **THEN** its visible label states the specific uncertainty, its details explain applicable next actions, and generated P-number identifiers do not appear as user-facing headings

### Requirement: Consistent compact detail controls
An operation or call's visible identity SHALL be its primary detail control in diagram cards, sequence diagrams, numbered interactions and step descriptions. Pointer and keyboard activation SHALL inspect the exact owning step or call occurrence, using consistent typography, hover and visible-focus treatment. A separate View details action SHALL NOT duplicate the same identity action, and step descriptions SHALL NOT require a detached bank of detail buttons. Independent expansion and navigation actions SHALL remain separately operable without accidentally opening details. Existing node-selection callbacks SHALL remain compatible and fire no duplicate selection events. Dismissal SHALL restore focus to a valid initiating identity control or visible fallback.

#### Scenario: Details across presentations
- **WHEN** a reader activates the loginUser identity in a card, sequence label, numbered row or description heading
- **THEN** the same scoped step details open without requiring a separate View details button

#### Scenario: Repeated call and keyboard selection
- **WHEN** a keyboard reader activates the second fulfil-item call identity and closes details
- **THEN** the inspector retains second-item's own mappings, including 2499, and focus returns to that occurrence's identity rather than the first call

#### Scenario: Independent call actions
- **WHEN** the reader expands, collapses or follows a call using its secondary action
- **THEN** the requested action occurs once, does not also trigger detail selection, and collapsing a selected descendant retains a valid visible focus destination

#### Scenario: Narrow controls and long step name
- **WHEN** the viewer is 480 pixels wide and the card or sequence has long labels
- **THEN** identity controls and secondary actions remain readable and operable without overlapping text, page-wide scrolling or focus loss, and the full scoped label is accessible

### Requirement: Localized diagram rendering recovery
A failed flowchart render SHALL produce a visible localized explanation with Retry diagram and an action to open step descriptions. Authored content, workflow navigation and other representations SHALL remain usable. Retry and later source changes SHALL exclude obsolete renders and SHALL clear the error only after a current successful render.

#### Scenario: Rejected diagram rendering
- **WHEN** rendering rejects for the selected workflow
- **THEN** the reader sees a rendering error rather than a blank canvas and can retry or read that workflow's steps

#### Scenario: Retry and document replacement
- **WHEN** a render fails, retry starts, and the document changes before it finishes
- **THEN** the late result cannot replace the new document's diagram or error state and keyboard focus remains in the valid current view

### Requirement: Readable contained flowcharts
Flowcharts SHALL retain readable label size, at least 12 displayed pixels,
at 1440 and 480 pixels without page-wide overflow. Large graphs SHALL expose
their full content through a contained keyboard-accessible scroll region
rather than shrinking labels to fit the reading pane. Other representations,
render recovery, exact selection and current-generation rendering SHALL remain
available.

#### Scenario: Default Petstore at both widths
- **WHEN** a reader selects Flowchart for unchanged Petstore at 1440 or 480 pixels
- **THEN** its labels remain readable and the reader can scroll to off-screen content with the keyboard inside the flowchart without widening the page

#### Scenario: Long-label graph and replacement
- **WHEN** a long-label graph is displayed or replaced during rendering
- **THEN** current content retains readable labels and contained navigation and obsolete content cannot alter the replacement

### Requirement: Continuous sequence navigation through calls
Following a supported local workflow call from a sequence SHALL open the callee in sequence reading, including when that callee was previously viewed as step descriptions. Returning SHALL restore the exact caller occurrence, expansion, reading representation and applicable focus. An explicit host/location replacement SHALL take precedence and cancel incompatible pending navigation. Display numbers SHALL NOT replace stable occurrence identity in shared locations.

#### Scenario: Follow reserve-and-pay
- **WHEN** the reader follows fulfil-purchase.reserve-and-pay from its sequence
- **THEN** reserve-and-capture opens as a sequence and Back to caller restores the original fulfil-purchase call context

#### Scenario: Host supersedes call navigation
- **WHEN** a host declines or replaces a pending workflow selection, or the document changes before it is accepted
- **THEN** no stale callee view, occurrence or caller trail is applied to the replacement

### Requirement: Understandable origin of displayed information
Details and optional-feature explanations SHALL distinguish authored Arazzo content, explicitly loaded API-contract content, and supplied viewer metadata using concise reader-facing labels. Standard 1.1 asynchronous/dependency facts SHALL NOT be relabelled as proprietary extensions. Participant profiles, descriptive implementation associations and guide narratives SHALL NOT be presented as standard Arazzo fields or inferred execution. General source-checking and execution limitations SHALL be consolidated; genuine missing/ambiguous facts SHALL remain visible at the affected interaction. Exact authored extensions, falsy values, expressions and provenance SHALL remain inspectable without silently discarding unsupported content or claiming full 1.1 conformance.

#### Scenario: Standard async fields and supplied associations
- **WHEN** a reader inspects a receive step and a Systems implementation association
- **THEN** correlation/timeout/dependencies are identified as workflow declarations and the implementation association is identified as supplied viewer metadata with its source

#### Scenario: Unloaded contract and opaque extension
- **WHEN** a known-source operation has no loaded API description and contains an unrecognized extension
- **THEN** source-checking status and complete authored extension content remain accessible in details without repeated generic warnings on every operation or inferred extension semantics

### Requirement: Prerequisites precede their owning interactions in sequence reading
The sequence diagram and its accessible ordered reading list SHALL present a workflow's prerequisites before that workflow's first numbered step, and each step's prerequisites before the owning numbered interaction. Prerequisites SHALL remain unnumbered, classified dependencies with their authored target and exact workflow/call occurrence available for inspection. They SHALL NOT be presented as completed operations, calls, or evaluated execution order.

#### Scenario: Root workflow and step prerequisites
- **WHEN** a selected workflow declares a workflow prerequisite and its first step declares a step prerequisite
- **THEN** both are encountered before the first numbered interaction in the visual and accessible reading order, each remains attached to its correct scope, and neither receives a step number

#### Scenario: Repeated nested callee
- **WHEN** two call occurrences expand the same callee with different mappings and that callee declares prerequisites
- **THEN** each callee's prerequisites precede that occurrence's steps, remain distinguishable by call path, and inspection opens the target and mapping context for the selected occurrence

#### Scenario: Unavailable prerequisite target
- **WHEN** a step prerequisite is external or missing
- **THEN** it remains visible before its step with the existing external or missing classification and explanation, without a guessed local link or source fetch

### Requirement: Step descriptions retain the Jentic timeline
Step descriptions SHALL display authored steps with a connected, numbered timeline using the viewer's established Jentic visual language. The timeline SHALL preserve a clear heading and direct keyboard-operable detail control for each step, readable long labels, and visible focus at desktop and narrow widths. Timeline styling SHALL NOT change authored step order, IDs, or inspection content.

#### Scenario: Unchanged Petstore descriptions
- **WHEN** the reader opens Step descriptions for unchanged Petstore at 1440 or 480 pixels
- **THEN** the five authored steps appear in order with legible numbered markers and connecting progression, and each heading opens its exact step details by pointer or keyboard

#### Scenario: Long step title and focus
- **WHEN** a step title wraps on a narrow viewer and receives keyboard focus
- **THEN** its complete label, marker, connection, and focus indication remain legible without overlapping the detail content or widening the page

### Requirement: Narrow sequence entry shows a readable path start
In the plain, untouched Petstore entry at 480×900 pixels, the first authored sequence interaction SHALL be completely visible without scrolling and the next authored interaction or an unambiguous continuation cue SHALL also be visible. The viewer SHALL achieve this with compact first-use hierarchy while retaining workflow identity, participant labels, navigation, accessible controls, and at least 12-pixel displayed diagram text. Long document information and optional setup SHALL remain available on demand.

#### Scenario: First screen at narrow width
- **WHEN** unchanged Petstore opens in the default viewer at 480×900 with no optional context or inspector open
- **THEN** the reader can identify the workflow and participants, see the complete first interaction plus the start of the next interaction path, and reach Step descriptions without scrolling past document metadata

#### Scenario: Explicit reading context
- **WHEN** a host supplies an explicit view or a restored location
- **THEN** that intent retains precedence and the compact entry does not replace the requested presentation or omit authored content

### Requirement: Inspector modality follows the occupied viewer area
An inspector that covers the usable reading area SHALL expose dialog modality, contain focus, and make the covered viewer background unavailable, regardless of browser viewport width. An inspector that leaves a usable side-by-side reading area SHALL remain nonmodal. The state SHALL follow changes to the viewer's available size while open; dismissal SHALL restore focus to the exact initiating control or a visible fallback and restore prior background accessibility state.

#### Scenario: Narrow embed in a wide browser
- **WHEN** a 400-pixel-wide embedded viewer opens details inside a 1440-pixel browser viewport
- **THEN** the covering inspector has dialog semantics, focus remains inside it, and covered controls cannot receive focus until dismissal

#### Scenario: Wide host and live resize
- **WHEN** a wide embedded viewer opens details and is then resized until the remaining reading area is unusable
- **THEN** the inspector changes from nonmodal to covering behavior while open, and reverses that behavior if usable side-by-side space returns

#### Scenario: Close after covering state
- **WHEN** the reader dismisses a covering inspector after resizing the host
- **THEN** focus returns to the initiating occurrence or visible fallback and any pre-existing background inert or hidden state is preserved
