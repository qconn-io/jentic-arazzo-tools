## MODIFIED Requirements

### Requirement: Transport-Neutral Operation Inspection
The viewer and documentation SHALL preserve and describe authored operation/workflow/channel locators, declared source kind, asynchronous send/receive intent, correlation expressions, timeouts, and querystring values without imposing an HTTP operation shape. A source's identity established by an explicit locator or the supported single-source operation-ID rule SHALL remain distinct from operation verification. An explicitly identified source whose declared kind cannot support the locator SHALL retain its authored identity and locator with an unsupported-binding diagnostic; it SHALL NOT be presented as a supported declared interaction. An unfetched source's contract SHALL remain unverified; its version, protocol, operation details, and execution behavior SHALL NOT be inferred.

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

#### Scenario: Unchanged single-source Petstore
- **WHEN** the original Arazzo 1.0.1 Petstore document declares only petstoreAPI as its API source and uses bare operation IDs
- **THEN** the viewer identifies petstoreAPI as the destination of all five operations without fetching it, preserves the exact authored IDs, and reports that operation declarations have not been checked

#### Scenario: Profile-sensitive source uncertainty
- **WHEN** there are several relevant non-Arazzo source descriptions, an unsupported source kind, conflicting locators, or unsupported asynchronous semantics
- **THEN** single-source binding is not used to conceal that uncertainty or promote unsupported semantics, and no arbitrary first source is assigned

#### Scenario: Explicit channel locator names an OpenAPI source
- **WHEN** a 1.1 step's channelPath explicitly names a declared OpenAPI source
- **THEN** the original locator and source declaration remain inspectable with a source-kind mismatch diagnostic, and sequence and documentation do not present the channel as a supported declared interaction

#### Scenario: Explicit operation locator names an Arazzo source
- **WHEN** a step's operationPath explicitly names a declared Arazzo source
- **THEN** the original locator and source declaration remain inspectable with a source-kind mismatch diagnostic, and no operation is attributed to that source as a supported declared interaction

### Requirement: Consistent Semantics and Scoped Step Identity
Diagrams and documentation SHALL expose the same actions, applicable parameter values, targets, and warnings for each owning workflow and step through concise summaries and inspectable details. Each step's applicable parameters SHALL include workflow parameters not overridden by a step parameter with the same name and location, followed by its step parameters, with inherited, overridden, unresolved, and authored provenance retained. Semantic parity SHALL NOT require duplicating full metadata or general limitations on the default canvas. Identical step IDs in different workflows SHALL remain distinct in selection, diagnostics, and reference resolution.

#### Scenario: Identical step IDs with different actions
- **WHEN** flowA.init and flowB.init define different failure actions and parameters
- **THEN** each step displays only its own effective actions/parameters in diagrams and documentation

#### Scenario: Bare local prerequisite is context dependent
- **WHEN** two workflows refer to a prerequisite named prepare and only one workflow contains that local step
- **THEN** that workflow resolves its prerequisite locally and the other displays a missing-step warning without linking to the first workflow

#### Scenario: Replacement changes only shared components
- **WHEN** a loaded document is replaced with one changing only a reusable action or parameter definition
- **THEN** diagrams, overview, documentation, and diagnostics update to the new definition even if the selected workflow is unchanged or overview is active

#### Scenario: Workflow parameters apply to a step without its own parameters
- **WHEN** a workflow declares a header parameter and a querystring parameter while an operation step has no parameter list
- **THEN** that step's selected details and documentation expose both applicable values and their workflow provenance without evaluating expressions or splitting the querystring

#### Scenario: Call mapping inherits workflow inputs
- **WHEN** a workflow declares an input-mapping parameter and a local call step has no parameter list
- **THEN** the call's selected details, documentation, and relationship mapping expose the inherited value as a caller-supplied mapping with workflow provenance

#### Scenario: Step parameter overrides one inherited value
- **WHEN** a step declares a parameter with the same name and location as one workflow parameter and the workflow has another unmatched parameter
- **THEN** the step value replaces only the matching workflow value in the applicable list, the unmatched workflow value remains, and both authored declarations remain inspectable

#### Scenario: Reusable and unresolved parameter provenance
- **WHEN** a workflow or step parameter uses a reusable declaration or has an unresolved reference
- **THEN** applicable details retain the use-site and declaration provenance or unresolved diagnostic without mutating the authored declarations or claiming an unknown name/location override
