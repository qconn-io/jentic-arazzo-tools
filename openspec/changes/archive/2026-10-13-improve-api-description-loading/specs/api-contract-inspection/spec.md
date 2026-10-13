## MODIFIED Requirements

### Requirement: Explicit source acquisition
The viewer SHALL expose a host-configurable `apiDescriptionLoading` policy with `manual` and `automatic` values. Embedded viewing SHALL default to manual; standalone document viewing SHALL default to automatic, with an explicit host value taking precedence. Without a source provider, or in manual mode without an explicit source-loading action, the viewer SHALL retain no-source-fetch behavior. Automatic mode SHALL initiate background acquisition of each unambiguously identified declared OpenAPI source and each declared AsyncAPI source eligible under the selected Arazzo inspection profile after the primary workflow becomes readable, independent of selected workflow, step, or view. It SHALL NOT automatically acquire external Arazzo sources, unknown source kinds, guides, profiles, catalog documents, or primary-workflow schema dependencies. Supported API reference dependencies SHALL follow the same enabled source-loading policy and acquisition authority. An enabled provider SHALL receive the resolved source URI and cancellation context and return source content with retrieval/revision identity. Relative URIs SHALL resolve against the declaring document's supported retrieval/base identity; missing bases, provider failures, and unsupported identity semantics SHALL remain inspectable without failing or delaying an otherwise readable primary document or substituting the viewer-page URL.

#### Scenario: Relative sibling contract
- **WHEN** the reader explicitly loads the payment source of the URL-loaded small example in manual mode
- **THEN** it resolves relative to that Arazzo document and becomes available in the viewer without navigating the browser away to YAML

#### Scenario: Unavailable source
- **WHEN** a source fails to load or an uploaded document has no base for its relative source
- **THEN** the source has a contextual unavailable state and the authored workflow and locator remain accessible

#### Scenario: Standalone digital-product entry
- **WHEN** the standalone viewer opens the URL-loaded digital-product Arazzo document with no loading-policy override
- **THEN** its four declared OpenAPI descriptions begin loading without selecting a step, the sequence remains readable while requests are pending, and successful acquisition makes all six API-step operations locatable through current shared contract evidence

#### Scenario: Embedded default and standalone opt-out
- **WHEN** an embedded viewer has a provider but no loading-policy override, or standalone viewing explicitly uses manual mode
- **THEN** opening a document or selecting a step makes no API-description request until the reader uses a loading action

#### Scenario: Embedded automatic opt-in
- **WHEN** an embedded host supplies a provider and explicitly selects automatic mode
- **THEN** the same declared eligible API descriptions load in the background through that provider without an independent browser transport

#### Scenario: Host changes the loading policy
- **WHEN** a host changes automatic mode to manual while a current authorized attempt is pending
- **THEN** no new automatic attempt is initiated under manual policy, already authorized work can settle within its current scope, and document/provider/revision replacement still excludes obsolete results

#### Scenario: Uploaded and inline content
- **WHEN** standalone viewing receives uploaded or inline content with absolute source URLs or an explicitly supplied supported base URI
- **THEN** eligible API descriptions load under the configured policy; relative sources without a usable base explain that limitation and are never resolved against the viewer page or a guessed file location

#### Scenario: Asynchronous and external workflow sources
- **WHEN** an Arazzo 1.1 document declares both AsyncAPI and external Arazzo sources
- **THEN** automatic mode attempts the declared AsyncAPI descriptions, preserves unsupported contract-version explanations if needed, and leaves external Arazzo loading/navigation explicit; AsyncAPI sources under a profile that does not support them remain visibly unsupported without automatic acquisition

#### Scenario: Ambiguous declaration identity
- **WHEN** source declarations have duplicate names or otherwise cannot be unambiguously identified by the current source-loading contract
- **THEN** the source list retains each declaration and an ambiguity explanation, automatic mode does not choose or overwrite a declaration by first match, and operation lookup retains uncertainty

### Requirement: Bounded and current source state
Source loading and projection SHALL be deduplicated within a viewer session, cancellable on replacement/unmount, and constrained by declared source/reference limits. Automatic loading SHALL attempt each eligible source once per current document/provider/requested-revision scope and SHALL NOT create an unbounded retry or invalidation loop. Opening a source panel or step inspector, changing views, or repeated rendering SHALL NOT restart an in-flight or completed attempt. Failed and limit-exceeded attempts SHALL remain visible until explicit retry/reload or replacement of the relevant scope. Results from an obsolete document, provider, requested revision, or invalidated dependency SHALL NOT update any current view. Reload SHALL refresh source and dependency provenance, immediately exclude affected old facts, and leave unrelated current facts available. Descriptions invalidated by another source's dependency reload SHALL require an explicit fresh load; automatic mode SHALL NOT silently reuse those facts or repeatedly restart its initial batch. Status details SHALL identify what has and has not been checked using current revision-scoped projection evidence rather than acquisition alone.

#### Scenario: Document changes during loading
- **WHEN** a payment contract response arrives after the primary document was replaced
- **THEN** it cannot attach its operation facts or located status to the replacement document

#### Scenario: Automatic and explicit load overlap
- **WHEN** background loading is pending and the reader opens a step inspector or activates a document-level load action for that source
- **THEN** both surfaces share the same current attempt and result without duplicate physical acquisition or competing projection publication

#### Scenario: Failed background request remains settled
- **WHEN** automatic loading fails because of a provider denial, missing base, unsupported transport, malformed content, or a source limit
- **THEN** workflow reading remains available, the source explains the failure, subsequent renders do not retry it, and a supported explicit retry requests only the chosen source and its required dependencies

#### Scenario: Provider or revision changes
- **WHEN** a host replaces the provider or changes an applicable source revision pin while acquisition or projection is pending
- **THEN** old facts are excluded, automatic mode attempts the eligible new scope once, and only matching current provenance can be published

#### Scenario: Dependency reload invalidates another source
- **WHEN** reloading one source invalidates a dependency shared with another source
- **THEN** the affected source loses stale operation evidence and offers an explicit fresh load, unrelated sources remain loaded, and automatic mode does not enter a dependency-reload loop

#### Scenario: Large declared source set
- **WHEN** automatic loading encounters more descriptions or reference dependencies than the active scope permits
- **THEN** acquisitions obey its concurrency, document, byte-size, and reference-depth limits and excess sources retain visible limit explanations without blocking the workflow

### Requirement: Current operation evidence informs sequence destinations
Current API contract evidence acquired under either automatic or manual loading SHALL inform the interactive sequence's operation destination when it establishes a unique match with complete relevant candidate coverage. Evidence SHALL remain distinct from authored source binding and SHALL NOT mutate the workflow, assert conformance for an unqualified multi-source locator, establish business-system ownership, or itself trigger acquisition. Known source identity SHALL remain visible even if its operation is missing or unchecked. Static output without supplied equivalent evidence SHALL retain authored-only coverage.

#### Scenario: Unique operation after complete candidate loading
- **WHEN** a bare operation ID has several relevant API sources and checking every candidate under the configured policy establishes exactly one operation
- **THEN** the interactive sequence and inspector identify the same current source and operation while retaining any authored qualification diagnostic and making no validity or execution claim

#### Scenario: Partial coverage and duplicate matches
- **WHEN** only one of several candidates is loaded, a candidate fails or is unsupported, or two loaded candidates contain the operation
- **THEN** the sequence retains the corresponding uncertainty, explains its reason, and does not promote the first match to a unique destination

#### Scenario: Reload removes old lookup evidence
- **WHEN** a previously unique operation changes source, disappears, or becomes duplicated after explicit source or dependency reload
- **THEN** obsolete destination evidence is excluded immediately and only current complete evidence can establish the new destination

#### Scenario: Replacement with repeated occurrences
- **WHEN** the document or provider is replaced while lookup is pending and repeated calls use the same step
- **THEN** late evidence cannot attach to the replacement and each occurrence retains its existing selection and call-path identity

### Requirement: Reader-oriented contract status and next actions
Contract inspection SHALL distinguish description availability from operation lookup. Document-level sources SHALL expose Not loaded, Loading, Loaded, Failed, Unsupported, or Loading unavailable as applicable, with separate current parsing/profile and acquisition explanations. Loaded SHALL mean that the current description was successfully projected under a supported contract profile; unsupported or malformed acquired content SHALL NOT be labelled as a supported loaded description. Step inspection SHALL retain API description not loaded, Checking API description, Operation found, Operation not found, Multiple matching operations, Unsupported API description, and API description unavailable as applicable. Known API destination identity SHALL remain separate from operation checking. The document-level source surface SHALL provide Load API descriptions for eligible unattempted sources in manual mode and applicable per-source Load, Retry, or Reload actions under either policy, without requiring step selection. Technical lookup codes, locators and revision/acquisition provenance SHALL remain available in labeled details without dominating normal reading. Host-only configuration advice SHALL identify a host limitation rather than tell ordinary readers to supply a source provider. Loading or locating content SHALL NOT be described as verified contract validity, full Arazzo conformance, or execution support.

#### Scenario: Known API before checking
- **WHEN** the Petstore API destination is known and its description is not loaded
- **THEN** details identify the known API and say that the operation has not been checked; when the host supports loading, the same source can be loaded from the document-level surface or its step inspector

#### Scenario: Error or incomplete lookup
- **WHEN** acquisition fails or only some possible API descriptions have been checked
- **THEN** the reader sees what is unavailable or remains unchecked, the relevant source identity, and available recovery actions without an authoritative unique-operation claim

#### Scenario: Loading unavailable in an embedded host
- **WHEN** the host supplied no source-loading capability
- **THEN** ordinary workflow details remain readable, source availability explains that API-description loading is unavailable in this viewer, no ineffective loading button is offered, and developer configuration information is available separately

#### Scenario: Focus during explicit loading
- **WHEN** a focused API-description loading control becomes disabled during acquisition
- **THEN** focus remains in a stable source context inside the active source surface or inspector, Escape can dismiss an applicable inspector and return to a valid origin, and late results do not move focus elsewhere

#### Scenario: Loaded description but missing operation
- **WHEN** a supported current description loads successfully but does not contain a selected operation
- **THEN** the source says Loaded with its contract profile and the step says Operation not found without contradiction or a permanent unverified source label

#### Scenario: Acquired unsupported or malformed description
- **WHEN** retrieved bytes use an unsupported contract version or cannot be projected as a supported contract
- **THEN** the source says Unsupported or Failed with the relevant explanation and retains available raw content/provenance; a cached acquisition alone does not establish successful inspection
