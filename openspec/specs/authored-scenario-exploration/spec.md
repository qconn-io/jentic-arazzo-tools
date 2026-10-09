# authored-scenario-exploration Specification

## Purpose

Turn explicitly authored scenario descriptions into navigable workflow reading guides without simulating execution or treating expected outcomes as measured evidence.

## Requirements

### Requirement: Explicit manifest and evidence classification
The viewer SHALL accept an explicitly supplied scenario manifest with stable IDs, document/workflow references, expected outcome text, and evidence descriptions. Every guide SHALL identify its content as authored expectations. Existing array entries with id/document/workflow/expected/evidence SHALL remain usable. Scenario content SHALL NOT be inferred by crawling arbitrary sibling files or parsing prose into workflow behavior.

#### Scenario: Existing stress manifest
- **WHEN** the supplied current stress scenarios.json is loaded
- **THEN** all 27 scenarios are discoverable with their exact expectations and authored-inspection evidence classification

### Requirement: Structured authored waypoints
An enriched manifest SHALL support ordered waypoints naming explicit scoped workflow locations and, where relevant, an authored action, criterion, parameter, payload, or output. A waypoint SHALL open the indicated content and show its narrative assumption without evaluating criteria or selecting a branch automatically. Prose-only scenarios SHALL navigate to their declared workflow and disclose the absence of a more precise authored path.

#### Scenario: Unknown capture reading guide
- **WHEN** the reader opens capture-uncertain-then-confirmed and advances through explicitly supplied waypoints
- **THEN** the guide exposes the UNKNOWN/503 condition, reconciliation, retry of the original capture step, and required CAPTURED evidence as authored expectations

#### Scenario: Legacy prose-only guide
- **WHEN** an entry lacks waypoints
- **THEN** its expected text and workflow are available without invented action highlights or a synthesized execution trace

### Requirement: Recovery and business outcome precision
Guides SHALL preserve distinctions between definite decline and unknown outcome, retry and goto, compensation guards, received audit evidence and successful activation, and event receive retry and command republishing. Scenario labels or highlights SHALL NOT authorize a business outcome absent the authored required evidence.

#### Scenario: Failed activation receipt
- **WHEN** the reader opens failed-device-activation
- **THEN** the guide distinguishes FAILED activation from the RECORDED receipt and does not label the receipt as successful activation

#### Scenario: Completion timeout
- **WHEN** the reader opens completion-timeout
- **THEN** the guide identifies the 12-second receive timeout, two receive retries, and one-way polling fallback without highlighting a republished purchase command

### Requirement: Navigation, reset, and sharing
Readers SHALL be able to search scenarios, advance/back through waypoints, open referenced details, return to the guide, and leave scenario mode without losing ordinary document navigation. Addressable scenario manifests and IDs SHALL support shareable locations including the current waypoint. Scenario state SHALL remain separate from authored workflow content.

#### Scenario: Shared guide waypoint
- **WHEN** a link to an addressable timeout guide's polling waypoint is reopened
- **THEN** its manifest, scenario, narrative context, and exact valid workflow location are restored

### Requirement: Invalid and bounded content
Manifest errors, unavailable documents, stale waypoints, missing actions, and display-limit targets SHALL produce localized explanations while valid guides remain available. Viewing guides SHALL invoke no business operations, evaluate no workflow expressions, and generate no pass/fail test status. Guide visits SHALL NOT be reported as executed scenario coverage.

#### Scenario: Missing waypoint target
- **WHEN** a waypoint's step was removed from the supplied document
- **THEN** the guide identifies the stale reference and retains its authored expectation without selecting a namesake step or marking the scenario failed

### Requirement: Benefit-first guided walkthrough discovery
Optional scenario guides SHALL be presented as Guided walkthroughs with an adjacent explanation that they contain author-provided descriptions and links through a workflow. Supplied guides SHALL be selectable directly. Optional setup SHALL use Load guides from a URL with format help and an explicitly loadable compatible example; understanding a manifest or prior README reading SHALL NOT be required to identify the feature's purpose. Legacy array and versioned manifests, scenario selections, query parameters and restored waypoints SHALL remain supported. Guide visits SHALL remain authored inspection rather than execution or test results.

#### Scenario: No guides supplied
- **WHEN** a new reader opens a plain workflow with no guide configuration
- **THEN** the viewer briefly explains what a guided walkthrough offers and exposes optional loading without requiring setup to read the workflow or acquiring sibling files

#### Scenario: Supplied guide discovery
- **WHEN** guide content is explicitly supplied by the host or selected example configuration
- **THEN** the reader can choose a named walkthrough directly without entering another URL and sees its authored narrative and supported step navigation

#### Scenario: Format help and explicit example
- **WHEN** a reader opens guide-loading help
- **THEN** the help explains the separate guide file and accepted format with a concrete example and performs no acquisition until the reader chooses an explicit load action

### Requirement: Recoverable guide setup states
Guide loading, empty content, malformed content, unavailable URLs, incompatible document identities and stale waypoints SHALL produce feature-local explanations and applicable retry, replacement or return-to-workflow actions. Restored optional context SHALL reveal its relevant status without reopening unrelated setup. At desktop and 480-pixel widths, guide setup and details SHALL preserve keyboard operation, focus containment when covering, and valid dismissal origins.

#### Scenario: Unavailable restored guide
- **WHEN** a shared guide URL cannot be loaded
- **THEN** the guide area explains the unavailable guide and offers recovery while the valid base workflow location stays readable

#### Scenario: Empty or mismatched guide file
- **WHEN** a supplied guide file has no usable guides or refers to another document
- **THEN** the viewer explains that state without fabricating guides, selecting namesake steps or reporting an executed failure
