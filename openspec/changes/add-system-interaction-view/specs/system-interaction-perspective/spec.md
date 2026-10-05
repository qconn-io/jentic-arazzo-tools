## Purpose

Provide an explicitly configured system perspective connecting business participants, API contracts, and workflow implementations while preserving authored provenance and semantic distinctions.

## ADDED Requirements

### Requirement: Explicit participant and association profile
The Systems perspective SHALL consume optional, versioned participant and association metadata with stable document-scoped references and provenance. It SHALL distinguish workflow actors, API source owners, and organizational owners. Missing or contradictory associations SHALL be visible and SHALL NOT be inferred from names, prose, or similar operations. Existing workflow views SHALL work without a profile.

#### Scenario: Small purchase participants
- **WHEN** the supplied digital-product profile identifies Client, Coordinator, Inventory, Payment, and License
- **THEN** the Systems view exposes those five business participants and presents reserve-and-capture as workflow control rather than an extra business system

#### Scenario: Unknown actor
- **WHEN** an operation has no explicit actor or source-owner association
- **THEN** the view identifies the unknown association and preserves the operation rather than assigning a convenient participant

### Requirement: Descriptive implementation nesting
An explicit operation-to-workflow implementation association SHALL be rendered as descriptive implementation content within that exchange. It SHALL be visibly distinct from standard workflow calls and SHALL NOT create executable Arazzo relationships or an extra client request. Association recursion and scene budgets SHALL terminate with inspectable markers.

#### Scenario: Coordinator purchase implementation
- **WHEN** the profile associates client-journey.purchase with fulfil-purchase
- **THEN** its associated implementation is inspectable within the purchase exchange, with reserve-and-capture retained as the separate standard local call, without depicting a second purchase transaction

### Requirement: Contract and event relationship precision
Requests, contract response alternatives, send/receive operations, and explicit event associations SHALL remain visually distinguishable. Contract identity plus a declared association SHALL support producer/consumer navigation; matching channel/message names alone SHALL NOT assert delivery, subscription, correlation success, or a single execution order. Receive timeout and correlation expressions SHALL remain accessible.

#### Scenario: Event completion relationship
- **WHEN** loaded AsyncAPI contracts and a supplied profile associate publish-ready with await-ready
- **THEN** the view provides a navigable declared event relationship with source/message provenance and correlation details without claiming the worker has delivered an event

#### Scenario: Several response alternatives
- **WHEN** an HTTP contract declares success and failure responses
- **THEN** they are available as contract alternatives and no response is presented as an observed outcome

### Requirement: Selected mapping and dependency overlay
The view SHALL allow inspection of selected input/output mappings and explicit prerequisites without filling the default scene with complete expressions. Identifiable producer/consumer references SHALL be scoped to their authored workflow and call path. Opaque, unresolved, or ambiguous expressions SHALL remain exact authored text without evaluated values or guessed edges.

#### Scenario: Repeated fulfilment amount
- **WHEN** the reader inspects second-item's amount mapping
- **THEN** the overlay and details retain that occurrence's 2499 mapping and do not substitute the first item's input mapping

### Requirement: Cross-perspective navigation and bounded presentation
System interactions SHALL link to their exact workflow location and contract details, retain the selected occurrence across supported perspectives, and support keyboard inspection. At desktop and 480-pixel widths the scene SHALL offer contained pan/scroll and readable selected details. Helper collapsing SHALL preserve inspectable authored interactions and visible limits.

#### Scenario: System to workflow and back
- **WHEN** the reader selects the payment exchange, opens its workflow occurrence, and returns
- **THEN** the original system context and scoped selection can be restored without changing the underlying authored document
