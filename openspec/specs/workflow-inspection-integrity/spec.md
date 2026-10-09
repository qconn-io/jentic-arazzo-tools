# workflow-inspection-integrity Specification

## Purpose

Make workflow inspection trustworthy across documents, business perspectives, catalog discovery, and revision review by preserving explicit acquisition authority, authored meaning, scoped identity, and known coverage.

## Requirements

### Requirement: Secondary acquisition obeys explicit authority

After acquiring the explicitly selected primary document, secondary documents and supported external references SHALL be acquired only through the supplied source authority in an explicitly enabled source-loading operation. Parsing supplied content SHALL NOT trigger a separate transport or reinterpret that content as a retrieval address. Without such authority or operation, references SHALL remain authored with an inspectable limitation. Denial or failure SHALL NOT trigger fallback acquisition or destroy otherwise readable workflow content. Supported local references SHALL remain inspectable without external acquisition.

#### Scenario: Rejecting authority for an external workflow schema
- **WHEN** an explicitly loaded external Arazzo workflow contains an HTTP input-schema reference and the supplied authority rejects that dependency
- **THEN** only that authority receives the dependency request, no alternate HTTP request occurs, the reference remains available with a contextual explanation, and the workflow remains inspectable

#### Scenario: Primary viewing has no secondary loading action
- **WHEN** a reader opens a primary workflow containing an external schema reference without enabling secondary source loading
- **THEN** the primary document is readable and no dependency request occurs merely because a provider is available

#### Scenario: Local reusable and schema references
- **WHEN** a supported document uses local reusable declarations or supported local schema references
- **THEN** their declarations and use-site provenance remain inspectable without invoking an external transport

### Requirement: Dependency acquisition retains bounds and freshness

Every secondary acquisition SHALL share the active scope's document-count, concurrency, byte-size, and reference-depth limits and applicable aggregate limits. Supported references SHALL resolve against the declaring retrieval/base identity and retain requested and returned revision provenance. Missing bases, conflicting revisions, unsupported profiles, recursion, and limit exhaustion SHALL remain explicit. Replacement, cancellation, and dependency reload SHALL prevent obsolete results from appearing in any dependent perspective.

#### Scenario: Arazzo dependency exceeds a source limit
- **WHEN** an external input-schema dependency exceeds the active byte, document, or depth budget
- **THEN** projection terminates within that budget and retains the authored reference and limit explanation without claiming complete resolution

#### Scenario: A pending dependency becomes obsolete
- **WHEN** a dependency resolves after its document/provider was replaced or its dependency generation was reloaded
- **THEN** its facts and located status cannot attach to the current inspector, Systems view, catalog, or revision result

### Requirement: Pinned revision inspection uses supplied bytes

Comparison SHALL resolve dependencies only from the explicitly supplied document/revision content authority. Missing or ambiguous historic bytes SHALL NOT be replaced by mutable URL content. Unavailable or unsupported dependencies SHALL contribute visible incomplete coverage while authored differences remain inspectable where their input content is available.

#### Scenario: Historic Arazzo input dependency is absent
- **WHEN** a baseline workflow references an external input schema whose historic content is not supplied
- **THEN** comparison makes no network request, identifies the missing dependency, and does not label its dependent inspection as complete

#### Scenario: Same URI has two supplied revisions
- **WHEN** supplied content includes two revisions at one dependency URI without a unique applicable pin
- **THEN** comparison reports ambiguous content authority rather than choosing the first or newest revision

### Requirement: System actors require owning-scope bindings

Each system interaction SHALL use an explicit step binding or explicit workflow binding for its owning workflow. A caller actor or implementation exchange's source owner SHALL NOT implicitly become the actor of an unbound callee. Missing or contradictory actor/source-owner bindings SHALL remain visible as unknown associations with provenance. Actors, source owners, and organizational owners SHALL remain distinct.

#### Scenario: Two calls to an unbound helper
- **WHEN** a profile binds only the entry workflow to Client and two entry steps call a helper without an actor binding
- **THEN** both expanded helper occurrences identify their actor as unknown and retain separate call paths instead of inheriting Client

#### Scenario: Explicit helper actor
- **WHEN** the same helper has an explicit workflow binding to Coordinator and one helper step has an explicit step binding to Worker
- **THEN** those scoped bindings select Coordinator and Worker respectively without changing caller identity or inferring organizational ownership

#### Scenario: Unbound descriptive implementation
- **WHEN** an exchange is explicitly associated with an implementation workflow whose actor is not bound
- **THEN** its implementation interactions retain an unknown actor rather than inheriting the exchange's source owner

### Requirement: Contract impact distinguishes references from literal data

Contract usage traversal SHALL follow supported declaration and schema reference locations according to the selected contract profile. Literal example values, defaults, constants, enumeration values, and opaque extensions SHALL NOT create reference-dependency edges merely because they contain a property named `$ref`. Semantic map keys SHALL be treated as authored names. Changes to literal content SHALL remain observable as authored differences in their own declaration context. Unsupported reference semantics SHALL retain authored evidence and incomplete coverage rather than guessed consumers.

#### Scenario: Literal example refers textually to an unused component
- **WHEN** a response's literal example contains `{"$ref":"#/components/schemas/Unused"}` and only the otherwise unused component changes
- **THEN** the operation is not identified as a direct user of that component and its entry workflows are not implicated through that literal

#### Scenario: Real schema and reference-object use
- **WHEN** the response schema or a supported response/reference object actually references the changed declaration
- **THEN** known direct users and their scoped entry paths are retained with the correct declaring and target revision identities

#### Scenario: Literal names occur as schema property names
- **WHEN** a schema has properties named `examples`, `default`, `const`, or `$ref` containing actual child schemas
- **THEN** those names do not suppress valid schema traversal or turn a property name into a reference instruction

### Requirement: Shared default actions retain effective users

Revision findings for shared success/failure declarations SHALL identify applicable effective step uses from both explicit step actions and workflow defaults. Each use SHALL retain declaring revision, declaration address, use-site address, owning step, inherited/overridden origin, and applicable scoped location. Display inheritance SHALL follow the viewer's existing inspection policy and SHALL NOT claim evaluated runtime action selection. Step overrides SHALL exclude the overridden default from that step's effective uses while retaining its authored declaration.

#### Scenario: Shared workflow recovery default changes
- **WHEN** a helper's valid `failureActions` references a reusable retry declaration whose limit changes from 2 to 3, and the helper has two entry call occurrences
- **THEN** the finding identifies the applicable helper step uses, their inherited declaration provenance, and both distinct entry call paths

#### Scenario: One step overrides the workflow default
- **WHEN** one helper step overrides the matching shared workflow default while another inherits it
- **THEN** only the inheriting step is an effective user of the changed default and both authored action declarations remain inspectable

### Requirement: Impact roots require justified usage or explicit scope

Static impact SHALL start from known authored/effective uses or an explicitly identified document-wide finding. Failure to locate a use SHALL NOT implicate every workflow in the document. With complete applicable coverage, an unused declaration SHALL have no known consumers; with incomplete coverage, the result SHALL identify that uncertainty. Relationship classes, cycles, traversal limits, and before/after scopes SHALL remain inspectable. Results and exports SHALL describe potential exposure without asserting runtime failure, compatibility, or approval.

#### Scenario: Unrelated entry beside a changed shared default
- **WHEN** an entry workflow has no classified path to any applicable use of the changed default
- **THEN** it is absent from the finding's known impact paths, including empty-path entries created merely by sharing a document

#### Scenario: Unknown users under incomplete coverage
- **WHEN** a changed declaration has no located users but a relevant source is unavailable or traversal is bounded
- **THEN** the result reports unknown or partial coverage instead of a complete no-consumer claim or fabricated exposure

#### Scenario: Document-wide authored change
- **WHEN** a finding concerns document metadata rather than a located workflow/action/contract use
- **THEN** document scope is identified explicitly and is not presented as a proven dependency path

### Requirement: Operation consumers include classified entry paths

Opening a uniquely located operation in the catalog SHALL show its direct authored step uses and known entry-point paths within the same operation-consumer presentation. Paths SHALL be scoped by document, revision, relationship identity, and originating step; repeated calls SHALL remain distinct while counting the contract operation once. Standard calls, prerequisites, goto, retry, and descriptive associations SHALL retain their separate classes. Cycles, unavailable sources, and bounds SHALL remain visible. An exact occurrence link SHALL be offered only where the existing location model can represent that path; other paths SHALL provide classified authored-source navigation without pretending to be nested calls.

#### Scenario: Payment operation used through two calls
- **WHEN** one helper payment step uses a located operation and an entry workflow calls that helper through first-item and second-item
- **THEN** the operation panel shows one direct authored step use, both entry paths, and distinct supported occurrence links without requiring another workflow selection

#### Scenario: Recovery and cross-document paths
- **WHEN** an operation is potentially reached through recovery, a prerequisite, a descriptive association, or a supplied external workflow
- **THEN** the panel identifies those relationship classes and document/revision scope and offers supported source navigation instead of manufacturing a local call occurrence

### Requirement: Existing inspection and embedding contracts remain coherent

The repairs SHALL preserve existing component and package entry points, viewer modes, callbacks, versioned location/profile/scenario/catalog/review inputs, and host-controlled history ownership. Authored values, repeated occurrence mappings, external-versus-local classifications, and finite display limits SHALL remain consistent across supported views and exports. Selected Arazzo 1.1 inspection SHALL continue to disclose unsupported resolution and unestablished validation/execution rather than imply complete conformance.

#### Scenario: Repair viewed through several perspectives
- **WHEN** the reader moves a repeated payment occurrence between Docs, Sequence, Diagram, Split, Systems, catalog, and before/after inspection where supported
- **THEN** its authored mappings, provenance, known ownership, and resolution limitations remain scoped consistently and an embedded host's history is not mutated

#### Scenario: Unsupported resolution profile
- **WHEN** the document uses currently unsupported `$self`, anchor, or schema-dialect semantics
- **THEN** the original declarations and targeted limitations remain inspectable without new conformance or execution claims
