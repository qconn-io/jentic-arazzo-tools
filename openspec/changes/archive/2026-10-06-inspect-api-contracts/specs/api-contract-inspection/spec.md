## Purpose

Connect authored workflow uses to optionally supplied API contracts and external workflow sources with explicit resolution status and inspectable provenance.

## ADDED Requirements

### Requirement: Explicit source acquisition
Without a source provider or explicit source-loading action, the viewer SHALL retain its current no-source-fetch behavior. An enabled provider SHALL receive the resolved source URI and cancellation context and return source content with retrieval/revision identity. Relative URIs SHALL resolve against the declaring document's base; missing bases and provider failures SHALL remain inspectable without failing an otherwise readable primary document.

#### Scenario: Relative sibling contract
- **WHEN** the reader explicitly loads the payment source of the URL-loaded small example
- **THEN** it resolves relative to that Arazzo document and becomes available in the viewer without navigating the browser away to YAML

#### Scenario: Unavailable source
- **WHEN** a source fails to load or an uploaded document has no base for its relative source
- **THEN** the source has a contextual unavailable state and the authored workflow and locator remain accessible

### Requirement: Scoped operation resolution
Supported inspection SHALL cover OpenAPI 3.0/3.1 HTTP operations and AsyncAPI 3 operations. Resolution SHALL honor explicit source qualification and supported operation references, preserve document-scoped identity, and distinguish not loaded, loading, located, missing, ambiguous, unsupported, and failed states. A located operation SHALL NOT imply that the entire contract is valid or executable.

#### Scenario: HTTP operation located
- **WHEN** a scoped payment operation locator resolves uniquely in its loaded OpenAPI contract
- **THEN** the viewer identifies the exact source revision, operation, method, and path with a located status

#### Scenario: Partial unqualified operation lookup
- **WHEN** the diagnostic pack's unqualified `getLicenseByKey` is inspected before all relevant declared API sources have been checked
- **THEN** the viewer retains its authored locator and incomplete candidate coverage without claiming that a unique operation has been established

#### Scenario: Duplicate supplied operation IDs
- **WHEN** two supplied contracts declare the same unqualified operation ID
- **THEN** the relevant candidates remain distinguishable and no first-match operation is presented as authoritative

### Requirement: Readable contract details
HTTP contract inspection SHALL expose declared parameters, request media types/schemas, response alternatives, servers, and applicable security requirements. Event contract inspection SHALL expose declared send/receive direction, channel/address, message alternatives, headers/payload schemas, and correlation declarations. Workflow-supplied values and runtime expressions SHALL remain distinct from contract declarations; contract responses SHALL be labeled as alternatives rather than observations.

#### Scenario: Payment evidence and declaration
- **WHEN** the reader inspects capture-payment with its contract loaded
- **THEN** the request/response declarations can be viewed beside the workflow's CAPTURED and matching-evidence criteria without displaying a fabricated successful payment

#### Scenario: Receive declaration
- **WHEN** the reader inspects await-ready with its AsyncAPI source loaded
- **THEN** the operation's receive/channel/message declarations are readable beside the workflow's timeout and correlation expression

### Requirement: Reference and profile limitations
Supported local references SHALL be inspectable with provenance and finite handling of recursive schemas. External references SHALL use the same explicit provider policy and loading bounds; unsupported dialects or unresolved references SHALL retain their authored value and targeted explanation. Unsupported contract versions SHALL offer raw source inspection without guessed semantic details.

#### Scenario: Recursive or unsupported schema
- **WHEN** a schema is recursive or uses an unsupported dialect
- **THEN** inspection terminates, preserves the relevant authored schema/reference, and describes the specific limitation without marking unrelated operations invalid

### Requirement: Supplied external workflow navigation
A loaded Arazzo source SHALL expose uniquely located workflows with document-scoped identity and allow an explicit new-document/root navigation request. Existing external call rows SHALL remain external; source availability SHALL NOT silently inline them or turn them into local calls. Missing local targets SHALL NOT be replaced by namesakes in another document.

#### Scenario: Commerce source supplied
- **WHEN** the event worker's declared commerce source is supplied and fulfil-item is found
- **THEN** the viewer offers navigation to that external workflow with its source identity while preserving the authored external call classification

### Requirement: Bounded and current source state
Source loading SHALL be deduplicated within a viewer session, cancellable on replacement/unmount, and constrained by declared source/reference limits. Results from an obsolete document or provider revision SHALL NOT update the current view. Reload SHALL refresh explicit source provenance, and status details SHALL identify what has and has not been checked.

#### Scenario: Document changes during loading
- **WHEN** a payment contract response arrives after the primary document was replaced
- **THEN** it cannot attach its operation facts or located status to the replacement document
