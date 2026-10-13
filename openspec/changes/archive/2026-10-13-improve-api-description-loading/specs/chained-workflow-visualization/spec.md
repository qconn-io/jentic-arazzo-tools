## MODIFIED Requirements

### Requirement: Transport-Neutral Operation Inspection
The viewer and documentation SHALL preserve and describe authored operation/workflow/channel locators, declared source kind, asynchronous send/receive intent, correlation expressions, timeouts, and querystring values without imposing an HTTP operation shape. A source's identity established by an explicit locator or the supported single-source operation-ID rule SHALL remain distinct from operation verification. An unfetched source's contract SHALL remain unchecked; its version, protocol, operation details, and execution behavior SHALL NOT be inferred. Source-binding inspection SHALL perform no acquisition itself; separately configured automatic or explicit manual API-description loading SHALL retain the applicable acquisition authority and scope.

#### Scenario: Asynchronous send and receive
- **WHEN** a 1.1 workflow declares an AsyncAPI send or receive step using an operation or channel locator, timeout, correlation expression, and explicit prerequisites
- **THEN** cards, documentation, and sequence interactions show the authored intent and direction, retain the metadata in accessible details, keep prerequisites distinguishable from calls, and invent no HTTP method, message-delivery prediction, or additional call/retry edge

#### Scenario: Opaque source locators
- **WHEN** an operation locator addresses a webhook, a channel, or a source operation outside an HTTP paths layout
- **THEN** it is retained as the authored locator without being rewritten into an assumed HTTP path/method pair

#### Scenario: Unknown or ambiguous source
- **WHEN** a source is declared but not fetched, its kind is unknown, or a bare operation ID could belong to several sources
- **THEN** its kind/locator remain inspectable with an unchecked or ambiguous status, no source version or arbitrary candidate is selected from the declaration alone, and source-binding inspection itself makes no request; separately enabled API-description acquisition can supply current evidence without concealing incomplete coverage

#### Scenario: Conflicting locators
- **WHEN** a step supplies conflicting operation, workflow, or channel locator fields
- **THEN** the viewer preserves all authored locators and displays an ambiguity diagnostic instead of silently selecting one destination

#### Scenario: Querystring value preservation
- **WHEN** a 1.1 parameter uses querystring with a literal or expression-containing string
- **THEN** every view exposes the location and complete authored value through its details without splitting it into individual query parameters or evaluating expressions; the default diagram need not print the full value

#### Scenario: Unchanged single-source Petstore
- **WHEN** the original Arazzo 1.0.1 Petstore document declares only petstoreAPI as its API source and uses bare operation IDs before any configured acquisition completes or in manual mode
- **THEN** authored source binding identifies petstoreAPI as the destination of all five operations without depending on contract fetching, preserves the exact authored IDs, and reports that operation declarations have not been checked until current lookup evidence is available

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
- **WHEN** interactive inspection has current contracts loaded under either manual or automatic policy but static export has no supplied current contract evidence
- **THEN** each presentation identifies its evidence scope and the static export does not claim the interactive lookup was performed

### Requirement: Contextual Inspection Status
The viewer SHALL consolidate general inspection limitations in one compact document-level status control whose details describe what was and was not checked. When API sources are declared, that shared control SHALL expose an API descriptions summary and current source details/actions without step selection. It SHALL distinguish not loaded, loading, successfully projected, failed, unsupported, and unavailable descriptions from contract validity and operation lookup, and explain how unsupported resolution affects displayed references. Once descriptions have loaded, it SHALL NOT retain a blanket sources-not-fetched claim. Without API sources, inspection scope SHALL remain accessible without an empty loading panel. Actionable missing or ambiguous relationships SHALL retain visible occurrence markers with accessible explanations. General limitations SHALL NOT be repeated on every diagram participant or interaction.

#### Scenario: Sources not checked
- **WHEN** source descriptions were not fetched
- **THEN** the compact status reports that source documents were not checked and its details explain that this does not establish invalidity or inaccessibility, without repeating a validation/execution disclaimer on each sequence step

#### Scenario: Reference expansion bypassed
- **WHEN** expansion is bypassed because of unsupported $self semantics, unavailable base URI, or an unsupported schema dialect
- **THEN** status details name the detected cause and explain that affected references remain authored, without listing unrelated possible causes as though they were all detected or implying that every understood local workflow call is unavailable

#### Scenario: Missing target needs attention
- **WHEN** one call has a missing or ambiguous target in an otherwise inspectable document
- **THEN** its occurrence has a visible marker and an explanation identifying the target and unavailable action, while general document status remains consolidated and unrelated interactions remain readable

#### Scenario: Loaded descriptions with independent inspection limits
- **WHEN** all current API descriptions have loaded while the selected Arazzo profile still has resolution or conformance limitations
- **THEN** API descriptions reports the current loaded coverage and the separately labeled inspection scope retains only applicable limits, without calling every source unfetched or implying full validation or execution
