## Purpose

Help API Owners and Developers locate and understand authored workflow interactions through readable details, accessible navigation, and responsive views.

## ADDED Requirements

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
