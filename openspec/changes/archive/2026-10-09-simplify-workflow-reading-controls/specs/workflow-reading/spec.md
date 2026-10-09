## MODIFIED Requirements

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

## ADDED Requirements

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
