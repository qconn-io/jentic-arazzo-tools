## 1. Explicit source registry

- [x] 1.1 Define/export the optional source provider, provided-source provenance, and external navigation request types; verify headless/standalone declaration consumers compile and the default loader still performs no source fetch.
- [x] 1.2 Implement URI/base resolution, provider generations, pinned-revision checks, deduplication, reload, cancellation, and explicit scope budgets in the source registry with its viewer-local adapter; verify relative siblings, absent upload base, late results, provider replacement, revision mismatch, and isolated source failures in focused registry tests.
- [x] 1.3 Enforce concurrency/document/reference-depth/size bounds with inspectable states; verify cycles, limit markers, cancellation, and successful inspection of unaffected sources.

## 2. Contract and external workflow projection

- [x] 2.1 Implement OpenAPI 3.0/3.1 projection using existing parse facilities with provider-controlled references; verify scoped operationId/operationPath, local references, path/operation parameter precedence, security declarations, recursive schemas, and unsupported dialect fallback.
- [x] 2.2 Declare the generic ApiDOM YAML adapter as a direct UI dependency and implement the UI-local AsyncAPI 3 projection over already acquired YAML/JSON/object content; verify operation/channel/message references, send/receive, payload/header schemas, correlation declarations, unsupported-version raw fallback, and no parser-triggered network acquisition.
- [x] 2.3 Implement lookup/status projection for not-loaded/loading/located/missing/ambiguous/unsupported/failed cases; verify duplicate IDs and partial candidate coverage never produce a guessed unique operation.
- [x] 2.4 Load supplied Arazzo sources as separate inspected models and offer explicit external workflow navigation requests; verify commerce.fulfil-item opens with its own document identity while original external call classification and primary document retrieval remain unchanged.

## 3. Readable integration and acceptance

- [x] 3.1 Integrate contract panels, raw source access, and contextual status with improve-workflow-reading; verify workflow mappings/criteria remain distinct from contract schemas/response alternatives across views.
- [x] 3.2 Add explicit standalone Load source/reload controls using a browser fetch adapter and host-provided-content examples; verify no browser navigation away from the viewer, no implicit authorization forwarding, and useful CORS/failure/absent-base feedback.
- [x] 3.3 Run Playwright on small HTTP, stress HTTP/event, and unavailable-target fixtures with local sources, failed sources, and supplied external commerce; verify exact contracts, no fabricated responses, accessible details, and document-replacement cancellation.
- [x] 3.4 Document supported contract profiles, provider limits, provenance, and located-status meaning; verify UI suite, types, declarations, and production build pass, and record initial asset size impact from optional adapters.
