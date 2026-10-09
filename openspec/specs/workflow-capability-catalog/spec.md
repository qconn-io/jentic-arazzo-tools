# workflow-capability-catalog Specification

## Purpose

Make supplied workflow capabilities discoverable across products and revisions with explicit ownership metadata and trustworthy, bounded reverse usage.

## Requirements

### Requirement: Versioned supplied catalog
The catalog SHALL accept a versioned manifest identifying logical documents, immutable revision identities, retrieval/content sources, workflow entry points, and optional product, capability, owner, lifecycle, and system associations. Identities SHALL be scoped by document and revision; duplicate identities SHALL be diagnosed. Missing organizational ownership SHALL be shown as unknown and SHALL NOT be inferred from a system actor or source name.

#### Scenario: Two documents reuse workflow IDs
- **WHEN** different catalog documents contain fulfil-item
- **THEN** both remain independently discoverable and their usage/navigation never merge on the bare workflow ID

#### Scenario: Ownership unspecified
- **WHEN** the sample manifest supplies a Coordinator actor but no responsible team
- **THEN** ownership is displayed as unknown while the system actor remains available as separate metadata

### Requirement: Product and capability discovery
Catalog presentation SHALL support search/filter by supplied product, capability, workflow, owner, lifecycle, and API metadata, and open a selected entry in the viewer using its scoped location. Business entry points and helper workflows SHALL be distinguished only through explicit metadata. Plain single-document viewing SHALL remain available without a catalog.

#### Scenario: Owner discovers purchase capability
- **WHEN** the reader filters the sample catalog to its declared purchase capability
- **THEN** declared entry workflows and helper workflows are distinguishable and an entry opens with its document/revision context

### Requirement: Classified reverse usage
Reverse usage SHALL identify direct standard workflow calls, prerequisites, conditional goto/retry transfers, and located or unresolved API uses with their source occurrences and relationship class. Supplied descriptive associations SHALL remain distinct from standard references. Incoming recovery and prerequisite usage SHALL be included rather than only normal calls.

#### Scenario: Reconciliation consumers
- **WHEN** the reader opens reverse usage of reconcile-payment
- **THEN** capture-authorized-payment's conditional recovery usage appears with its originating action and retry classification

#### Scenario: API owner usage review
- **WHEN** the reader opens a uniquely located capture operation
- **THEN** usages identify the authored calling steps and known entry-point paths without counting repeated occurrences as separate contract operations

### Requirement: Completeness and unavailable sources
Catalog indexes SHALL expose which supplied documents/revisions/sources are loaded, pending, failed, or unsupported and distinguish located API usage from authored unresolved candidates. No known usage SHALL be labeled as no consumers unless coverage of the selected supplied scope is complete; completeness SHALL NOT imply coverage of an external organization or ecosystem. Loading/index traversal SHALL be cancellable and bounded.

#### Scenario: Partial portfolio
- **WHEN** a catalog document cannot be loaded
- **THEN** search and reverse usage identify partial coverage and do not imply that omitted consumers do not exist

### Requirement: Embeddable and addressable catalog
Catalog capabilities SHALL have an optional typed embedding interface without imposing global history or hosted persistence. Standalone catalog URLs SHALL restore catalog scope, selected revision, and workflow destination. Existing viewer props/callbacks and noncatalog document links SHALL remain compatible.

#### Scenario: Shared capability entry
- **WHEN** a catalog entry link is opened in a fresh session
- **THEN** the identified catalog revision and workflow entry are restored or an explicit unavailable-revision explanation is shown

### Requirement: Example and product acceptance
Acceptance SHALL include a supplied sample catalog containing all nine audited documents, explicit labels for intentional diagnostic examples, and Owner/Developer tasks covering capability discovery, unknown ownership, reverse recovery usage, and exact API inspection. Browsing a catalog SHALL NOT execute business APIs or modify supplied workflow documents.

#### Scenario: Intentional diagnostic entry
- **WHEN** the prerequisite-cycle entry is opened from the sample catalog
- **THEN** its diagnostic purpose and actual warning remain visible without presenting it as an approved production capability
