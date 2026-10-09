## MODIFIED Requirements

### Requirement: Transport-Neutral Operation Inspection
The viewer and documentation SHALL preserve and describe authored operation/workflow/channel locators, declared source kind, asynchronous send/receive intent, correlation expressions, timeouts, and querystring values without imposing an HTTP operation shape. A source's identity established by an explicit locator or the supported single-source operation-ID rule SHALL remain distinct from operation verification. An unfetched source's contract SHALL remain unverified; its version, protocol, operation details, and execution behavior SHALL NOT be inferred.

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

### Requirement: Mermaid Inspection Sequence
Generated sequence diagrams SHALL distinguish identifiable source destinations from unverified operation declarations and SHALL use the same classified source bindings, supported actions, parameter values, and inspection limitations as other views. They SHALL present connected schematic authored interactions with concise labels and relevant participants, retaining complete metadata in associated inspectable details. They SHALL NOT predict evaluated outcomes or guess source ownership and message delivery behavior. Local workflow calls SHALL follow the connected sequence requirements below rather than appearing only as notes.

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

#### Scenario: Single-source static and interactive parity
- **WHEN** the unchanged Petstore document is viewed interactively or exported as a static sequence without supplied contract facts
- **THEN** both sequences contain one workflow participant and one petstoreAPI destination rather than five unknown destination lanes, without asserting a successful response or verified operation

#### Scenario: Different supplied evidence scopes
- **WHEN** interactive inspection has explicitly loaded contracts but static export has no supplied current contract evidence
- **THEN** each presentation identifies its evidence scope and the static export does not claim the interactive lookup was performed
