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
