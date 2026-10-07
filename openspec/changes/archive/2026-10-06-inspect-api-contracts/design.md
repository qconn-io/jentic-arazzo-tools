## Context

`loadDocument` intentionally dereferences with sourceDescriptions disabled. The UI's source binding marks declarations unverified, and correctly resolved source links leave the viewer for raw YAML. The resolver already exposes OpenAPI parsing/dereferencing; it has no equivalent AsyncAPI adapter. Arazzo 1.1 inspection support is local to the viewer. See `proposal.md` for scope and the source-binding limitation.

## Goals / Non-Goals

**Goals:** Separate source acquisition, contract projection, and workflow interpretation into deep modules with a small provider seam. Integrate with readable details after `improve-workflow-reading`.

**Non-Goals:** Enabling source fetching in the existing loader by default, full specification validation, executing endpoints, broadening runner/parser version support, or silently expanding external workflow sequences. Cross-document sharing can use `add-workflow-deep-links` when present but is not a prerequisite for local contract inspection.

## Decisions

### Provider and registry

Add optional `SourceDocumentProvider.load({ uri, revision?, signal })` returning content, retrieval URI, and optional immutable revision. Requested pinned revisions must match returned provenance; a mismatch cannot establish a located pinned operation. A source registry module keys entries by canonical URI, provider generation, and pinned revision, with a viewer-local adapter owning its lifetime. It owns in-flight deduplication, cancellation, bounded reference acquisition, source diagnostics, and raw snapshots. Initial viewer limits are four concurrent acquisitions, 32 acquired documents, eight external-reference hops, and 10 MiB per source; limit markers remain inspectable. The registry factory accepts an explicit scope budget for catalog reuse. Explicit user reload invalidates relevant entries. Replacing the document/provider starts a new generation so late results cannot attach to current facts.

The standalone Load source action uses a browser fetch adapter with ordinary CORS behavior, no implicit authorization forwarding, and HTTP(S) sources. Hosts can supply content from their own registry or upload bundle. Relative URLs use the declaring document's retrieval/base URI; no base produces a specific unresolved status. Do not enable the resolver's unrestricted recursive source fetching: it would change load behavior and mix acquisition with the authored snapshot.

### Contract adapters and immutable projections

Use existing OpenAPI parse facilities for 3.0/3.1 and a UI-local AsyncAPI 3 adapter. Declare the UI's direct dependency on `@speclynx/apidom-parser-adapter-yaml-1-2` at the compatible ApiDOM major already used by the repository; use it for generic YAML content and JSON parsing for JSON/object input. The existing OpenAPI/Arazzo parser entry points are dialect-specific and can fall back to URI loading, so do not pass AsyncAPI or unsupported-version content through them. Parse already acquired OpenAPI content with URI acquisition disabled. Both adapters produce a private `ContractDocumentFacts` projection retaining version, URI/revision, authored paths, operation identity, reference diagnostics, and raw content. Resolve local references with finite reference links; external `$ref` traversal must go through the registry/provider, never a default network resolver. Reuse resolver element helpers only where network behavior can be explicitly bounded and disabled. Unsupported versions/dialects remain raw inspectable content.

Operation lookup first honors explicit source and locator scope. Unqualified IDs can resolve only when relevant declared candidates are loaded and a unique result exists; partial coverage cannot establish uniqueness. OpenAPI adapters account for path-level versus operation-level parameter/security declarations. AsyncAPI projection follows operation/channel/message references and declared direction; it does not implement broker semantics. Status `located` means that an operation was found, not that the full contract passed validation.

### Inspector integration and external Arazzo

Keep contract details separate from workflow-supplied values/criteria and label response alternatives. Integrate loading/status/raw-source actions through the shared inspector and document status. Registry-loaded Arazzo sources use the existing inspected-document model under their own URI/revision. Offer explicit workflow navigation; keep original external relationship classification. Embedded cross-document navigation is a host request, and standalone changes its source through its adapter. No mutation of the primary document's sourceDescriptions or returned document retrieval content occurs.

## Risks / Trade-offs

- [Complex schemas] → lazy schema trees/reference links, finite cycles, and specific unsupported-dialect diagnostics; no compatibility claims.
- [Bundle cost] → keep contract adapters out of the initial viewer path with dynamic loading; record built asset size before/after.
- [Source collisions or incomplete lookup] → document/revision-scoped keys, loaded-scope checks, and explicit ambiguous/partial statuses.

## Migration Plan

Add provider types and registry, then adapters and details. No-fetch embeddings remain byte-for-byte compatible in acquisition behavior. Validate local sibling contracts, supplied external commerce, failed sources, duplicate IDs, recursive schemas, and cancellation. Run types/declarations/build and browser tasks. Rollback disables the optional provider/Load source controls; original source-not-checked status and authored inspection remain available.

## References

The initial adapters follow [OpenAPI 3.1 operation/parameter declarations](https://spec.openapis.org/oas/v3.1.0.html#operation-object), [AsyncAPI 3 operation/channel/message declarations](https://www.asyncapi.com/docs/reference/specification/v3.0.0#operationObject), and the selected [Arazzo 1.1 source-expression profile](https://spec.openapis.org/arazzo/v1.1.0.html#source-description-expression-resolution). Support for other declared versions remains explicit fallback, not a claim of latest-version coverage.
