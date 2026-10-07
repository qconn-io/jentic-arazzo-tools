## Context

Standalone currently loads one document; `WorkflowOverview` knows local calls and selected incoming relationships. The examples declare actors but not responsible teams. `inspect-api-contracts` provides a bounded source registry, and `add-workflow-deep-links` provides scoped addresses. There is no catalog backend or main catalog spec. See `proposal.md` for the portfolio discovery problem.

## Goals / Non-Goals

**Goals:** A supplied manifest and deep catalog-index module reusable by standalone and hosts, with explicit metadata and trustworthy reverse usage.

**Non-Goals:** Hosted SaaS infrastructure, accounts, authorization, metadata inference, automatic discovery crawls, approval status generation, or revision diffing. Depends on reading, locations, and contract inspection; Systems/scenarios are optional extensions.

## Decisions

### Versioned manifest and separate catalog entry point

`WorkflowCatalogManifest` version one identifies products/capabilities and documents with logical ID, immutable revision ID, URI or supplied content, optional expected digest, and workflow metadata. Metadata includes explicitly declared entry/helper role, owner, lifecycle, tags, and optional view-profile/scenario-manifest references. Workflow identities are tuples of logical document ID, revision ID, and workflow ID; URI alone is not a revision pin. An expected digest mismatch is visible and excludes that revision from claims of complete indexing.

Add an optional exported `ArazzoCatalog` entry point that accepts manifest/provider/selection callbacks and composes the existing viewer when an entry is selected. Standalone accepts an addressable catalog manifest through a `catalog` URL input; existing document-only behavior is retained. Avoid adding portfolio state to every single-document viewer or requiring a backend. Unknown team ownership and lifecycle remain unknown; a system participant is not an organization owner.

### Bounded index with classified reverse relationships

The index accepts loaded document/contract projections from the registry and produces searchable entries, classified forward/reverse references, coverage records, and provenance. API usage keys include source contract revision and operation locator identity. Unresolved authored locators remain candidates, never located API usage. Maintain relationship kinds for call, prerequisite, goto, retry, and descriptive association; preserve originating action/step locations and explicit source qualification.

Separate direct authored usage from transitive entry-point reachability. Deduplicate reachable document/workflow tuples and retain cycle markers, not fabricated repeated executions. Expanding one reverse-usage path can show occurrence-specific call context; direct step use is counted once per authored step. Supplied event/implementation associations are indexed only when explicitly present and remain descriptive.

Initial catalog scope limits: 100 acquired document revisions including source contracts, four parallel loads, 64 MiB aggregate acquired content, and 10,000 authored steps per indexing batch; larger scopes produce a visible incomplete-coverage state and can be narrowed by product/revision. Instantiate the registry with this catalog scope budget rather than inheriting the single-viewer 32-document total; its eight-hop and per-source size limits still apply. A catalog/provider replacement invalidates the catalog generation, while selecting another entry does not discard the portfolio index. Show coverage as loaded/failed/pending/unsupported for the selected supplied scope. Do not claim completeness outside that scope or show unqualified zero-consumer conclusions with partial coverage.

### Presentation for Owner and Developer tasks

Use list/card discovery with product/capability/owner/lifecycle filters and readable entry/helper labels. A details pane exposes source provenance and direct/reverse usage with exact links. Graphs are optional local perspectives, not the portfolio's required navigation. Prepare a sample manifest containing the nine audited documents and explicit intentional-diagnostic tags; leave owner unknown rather than inventing teams. Share state uses a namespaced catalog/revision location extension.

## Risks / Trade-offs

- [Mutable URI undermines revisions] → expected content digest/revision provenance; no complete-index claim on mismatch.
- [Partial usage looks exhaustive] → visible coverage records and scoped language on empty results/exports.
- [Shared metadata contracts diverge] → reuse view/scenario/location types through optional references, keep parsing/indexing modules separate from presentation.

## Migration Plan

Add manifest/types/index and an opt-in entry point, then standalone catalog loading and example manifest. Preserve existing viewer defaults/callbacks. Verify duplicate IDs across documents, incoming recovery/prerequisite usage, failed sources, revision mismatch, bounds, and declared capability discovery. Run declaration-consumer/build checks and browser task evidence. Rollback removes optional catalog entry/integration with no existing document migration.
