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
Sequence scrolling SHALL retain access to participant identity and the root/call context. Long labels SHALL offer their full readable value, and operation, action, boundary, and repeated-call controls SHALL have distinguishable accessible names. Existing recursion, depth, and row markers SHALL remain visible and navigable.

#### Scenario: Dense expanded sequence
- **WHEN** the reader expands the full stress journey and scrolls vertically and horizontally
- **THEN** participant identity remains accessible, the selected occurrence's caller path remains readable, and the two capture operations can be distinguished

### Requirement: Readable workflow overview
Overview SHALL offer a readable workflow and relationship list with filters for standard calls, prerequisites, one-way transfers, and retry recovery alongside its graph. Incoming and outgoing relationships SHALL retain their distinct classifications and scoped origins. A fit-to-view graph with unreadable labels SHALL NOT be the only means of understanding a dense document.

#### Scenario: Eighteen-workflow overview
- **WHEN** the reader opens All workflows in the HTTP stress example
- **THEN** readable titles and classified incoming/outgoing relationships can be explored without zooming a whole-document graph until its labels become readable

### Requirement: Responsive and keyboard-operable inspection
At desktop and 480-pixel viewport widths, header and navigation controls SHALL remain operable without overlap or whole-page horizontal scrolling. Two-dimensional diagrams SHALL use a contained scroll/zoom area. Escape SHALL close details and restore focus to a valid initiating control or destination fallback. A covering narrow-width inspector SHALL contain focus and make covered background controls unavailable; a desktop nonmodal inspector SHALL retain intentional access to the main view.

#### Scenario: Narrow covering inspector
- **WHEN** a keyboard user opens details at 480 pixels, cycles focus, and presses Escape
- **THEN** focus stays within the covering inspector until dismissal and then returns to its originating interaction or a visible fallback

### Requirement: Shared facts and comprehension evidence
Docs, Sequence, Diagram, and Split SHALL use consistent scoped interaction facts while avoiding repeated full detail sections in the default documentation. Acceptance SHALL include fresh Playwright walkthroughs of all nine example documents and explicit Owner/Developer comprehension tasks; automated navigation success SHALL NOT be reported as measured human comprehension.

#### Scenario: Change view while inspecting
- **WHEN** the reader changes between supported modes while inspecting a scoped interaction
- **THEN** its authored values, target classifications, warnings, and occurrence context remain consistent

#### Scenario: Browser acceptance record
- **WHEN** the change is verified
- **THEN** screenshots and observations record success or failure for explaining the small purchase, locating the capture guard, inspecting second-item mappings, understanding timeout fallback, and reaching boundary content at both viewport widths

### Requirement: Reader-facing layout and representation hierarchy
The viewer SHALL distinguish document layout controls from the selected workflow's reading representations using understandable names and scoped selected-state semantics. Workflow diagram, Read workflow, and Side by side SHALL describe layout choices; Step descriptions, Sequence diagram, and Flowchart SHALL describe reading representations. A direct Sequence diagram action SHALL be available for a selected workflow without requiring prior knowledge of a Docs mode. Public mode/subview values, existing URLs, controlled callbacks, overview behavior and occurrence restoration SHALL remain compatible.

#### Scenario: First sequence discovery
- **WHEN** a reader opens the default Petstore document
- **THEN** a visible Sequence diagram action opens its sequence, the active layout and representation are clear, and returning to step descriptions requires no hidden mode knowledge

#### Scenario: Old link and controlled host
- **WHEN** an existing docs/sequence link is restored or a controlled host receives a layout-change request
- **THEN** the same supported destination is requested or restored with existing callback values and history ownership, and reader-facing names describe the resulting content

#### Scenario: Keyboard and overview selection
- **WHEN** a keyboard or screen-reader user changes layout, reading representation, or selects All workflows
- **THEN** each control exposes its scope and selected state, overview is not given a fabricated sequence, and focus remains applicable to the visible content

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
Step-card, step-description and sequence detail actions SHALL use consistent typography, spacing, hover, disabled and visible-focus states. A step-card's action SHALL be placed with its identity in the header and SHALL NOT obscure locators or alter node-selection callbacks. Keyboard and pointer activation SHALL open the exact owning step or occurrence and dismissal SHALL restore valid focus.

#### Scenario: Details across presentations
- **WHEN** a reader opens the same step from its card, descriptions or sequence
- **THEN** the control has a consistent readable appearance and the inspector retains that presentation's scoped ownership and occurrence context

#### Scenario: Narrow controls and long step name
- **WHEN** the viewer is 480 pixels wide and the card or sequence has long labels
- **THEN** detail actions remain visible and operable inside the contained view without overlapping text, page-wide scrolling or focus loss

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
