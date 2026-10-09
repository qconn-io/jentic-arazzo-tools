## Context

See [proposal.md](proposal.md) for motivation and the complete R1–R9/A1–A5 coverage map. The reviewed baseline is `a0d08472050d44f2079232f1535c9a6ac326af57` against upstream `49dd8ef814637b481c0a1998f586ce2785812f5d`. Discovery during this proposal confirms the relevant paths and missing DCO trailers still exist; the prior review's test and bundle results are baseline evidence, not fresh implementation verification.

`@jentic/arazzo-ui` already separates native/authored snapshots, inspection facts, a private viewer model, and bounded rendering projections. Its two component tiers, public location/provider/profile interfaces, and authored-versus-observed distinctions remain the foundation. The main-spec inventory is empty; archived contracts for API inspection, Systems, reading, catalog, and revision review supply existing intent. The two new specs add cross-cutting repair/acceptance contracts without changing those archives.

Observed fault boundaries:

| Area | Current implementation seam |
| --- | --- |
| Acquisition | `utils/contract/ArazzoAdapter.ts` receives a registry but calls `utils/loading/loadDocument.ts` without it; native dereference defaults include independent transports |
| References | `utils/contract/references.ts` understands several schema/map/literal roles, while `utils/review/contractUsage.ts` recursively follows every object `$ref` |
| Actors | `utils/systems/scene.ts` falls back to the caller actor or enclosing exchange owner for an unbound callee |
| Effective uses | `utils/model/viewerModel.ts` computes step declarations plus unmatched workflow defaults; review scans raw step actions only |
| Operation paths | `utils/catalog/index.ts` has bounded reachability and call-only location construction; `ArazzoCatalog.tsx` calculates reachability for selected workflows, not selected operation users |
| Verification | Consumer scripts exist outside normal CI; Playwright defaults to a reusable development server; several browser specs write into now-archived active-change paths |
| Reading surface | Standalone always renders the scenario URL form; controls and provider-generation details lack consistent progressive disclosure |

## Goals / Non-Goals

**Goals:**

- Repair authority and semantic boundaries with private reusable seams and precise regressions.
- Maintain public input/export compatibility while correcting misleading results and simplifying the default reading surface.
- Make installed-package and production-browser evidence reproducible from a clean checkout.
- Produce a signed, auditable, dependency-ordered contribution handoff with separate engineering, human-validation, and maintainer-decision states.

**Non-Goals:**

- Replacing ApiDOM, building a new execution/validation engine, or establishing full Arazzo 1.1 conformance.
- New account/storage/governance services, universal compatibility analysis, a new public manifest format, or a product-wide redesign.
- Automatically rewriting the existing branch, deleting historical evidence, publishing issues/PRs, pushing, deploying, or merging.

## Decisions

### 1. Keep one remediation change and several submission slices

Use this OpenSpec change to coordinate related repairs and their acceptance. Prepare the upstream feature series separately; the planning unit does not prescribe one combined upstream PR. The tasks are ordered around shared integrity seams first, then presentation, verification, and contribution preparation.

Independent patching in each renderer would be smaller initially but retain the policy drift that caused the review findings. Replacing the viewer or introducing a new core/package hierarchy would impose unrelated public/migration work. Keep the current architecture and deepen only acquisition, structural traversal, effective-use projection, and bounded reverse-path helpers.

### 2. Make native parsing content-only after the primary acquisition

Introduce a private loading policy at the existing loader/adapter seam. Distinguish primary document retrieval from secondary projection; acquiring the supplied primary URL remains supported. Parsing already supplied JSON/YAML/object content uses memory-only parsing and cannot fall back to interpreting it as a URI. The primary reading path does not acquire dependencies merely because `sourceProvider` is configured.

For explicitly enabled secondary projection, adapt native reference resolution to the existing `SourceRegistry.acquire` authority. Default HTTP/file resolvers are excluded from that projection. Supported local references use the supplied root content/reference set. Supported external references use the registry adapter, with declaring URI, requested pin, returned retrieval/revision, dependency edges, cancellation, and current validity. Match the validity pattern already used by the OpenAPI/AsyncAPI adapters and pass it through the Arazzo adapter instead of retaining its unused registry argument.

Use a private UI bridge with a direct declaration of the existing `@speclynx/apidom-reference` dependency, aligned with the native parser/resolver version. This is the selected option 1 from the implementation scope decision: inspection acquisition policy already belongs to `SourceRegistry`, and the shared resolver also serves execution consumers. Native reference-set and resolver construction stays inside the UI loading implementation; it does not become another public UI interface or introduce a second acquisition policy. Use supported package exports rather than unexported module paths, global patches, a copied native visitor, or fabricated authored `$id` values. Verify redirects/relative references, trace-aware optional recovery, budgets, revision ambiguity and freshness through the existing loader/adapter callers. Package acceptance and bundle measurement must include this explicit dependency declaration.

No-provider, rejected, missing, recursive, unsupported, or bounded references remain authored with targeted diagnostics. Preserve the readable workflow even when a dependency cannot expand; do not fail its whole root because an optional dependency is unavailable. Unsupported `$self`, anchors, or dialect semantics remain unsupported. This change does not broaden native resolver conformance.

Catalog projection uses its existing supplied-content/budget authority. Revision projection uses its existing rejecting network provider plus supplied pinned bytes; no private loader path can evade that rejection. Ambiguous same-URI revisions stay diagnostic. A primary record, external reference, and returned retrieval alias must not establish conflicting identity or substitute a newer revision.

A blanket ban on all reference expansion would avoid the bypass but regress local inspection and supplied-source value. Unrestricted native resolution would retain the authority defect. A registry-backed adapter preserves supported inspection within the existing source policy.

### 3. Resolve actors only in the owning workflow scope

Remove caller/source-owner fallback as actor authority in `buildSystemScene`. Precedence remains explicit step binding, then explicit binding for the step's owning workflow, then a visible Unknown actor. Keep contradictory bindings diagnostic. Call/descriptive nesting still retains parent rows and paths, but control context is not actor provenance.

The explicit digital-product adapter and profile fixtures can supply helper/implementation actors where their authored example metadata actually establishes them. Update those example bindings intentionally; do not introduce an implicit inheritance flag or reinterpret organizational ownership. Preserve two repeated helper occurrences and their separate mapping contexts. Existing profile version and binding shapes suffice.

### 4. Share structural reference classification, not acquisition or a generic recursive walk

Extract a small private structural classifier/walker from the supported roles already present in `contract/references.ts`. Roles distinguish contract objects, Reference Objects, schema objects, maps/arrays of declarations or schemas, and literal leaves. Projection and static usage analysis share this meaning; each retains its own acquisition/evidence policy.

OpenAPI Example Object reference locations can be real references, while an Example Object's `value` and Schema `example/default/enum/const` are literal. AsyncAPI message payload/header schema roles follow the existing supported profile. Schema/map names such as `examples`, `default`, `x-payload`, or `$ref` are names, not semantic keywords at the map level. Opaque extensions stay literal. Schema identifiers/anchors and unsupported dialects retain the existing limitations.

Keep contractUsage's operation seeds, effective path parameters, server/security precedence, scoped revision matching, visit/depth bounds, and known declaration-location overlap. Traverse reference targets only from structural reference roles. A change inside an operation's literal example can still be an authored operation-context difference; literal data cannot make another component a dependency.

Reusing the asynchronous projector itself would mix acquisition with offline static impact. Copying its keyword arrays into review would perpetuate divergent policy. Share pure structural meaning with explicit profile coverage and keep transport separate.

### 5. Project effective declaration uses from the existing viewer model

Build or reuse one private viewer-model projection per loaded catalog/review document; do not export it or rebuild it for each finding. Derive shared-action uses from each step's `effectiveActions`, preserving the current inspection ordering and override policy. Include valid workflow `successActions`/`failureActions` component references as well as explicit step actions.

A use record contains applicable workflow/step, declaring document/revision, declaration pointer, use pointer, inherited/overridden origin, and the existing supported action location. Workflow defaults retain their authored default address while each applicable step remains distinct. This is inspection applicability, not an evaluated runner branch.

Feed the same use records into revision effects and relevant catalog action relationships. In `findingImpact`, replace the no-uses/every-workflow fallback with explicit cases: workflow/step scope, known effective uses, located contract declaration users, explicitly labeled document metadata scope, and unlocated declaration scope. Empty entry paths are legitimate only for an entry that directly owns an established affected use or an explicit document-scoped finding. An unused component cannot implicate unrelated entries. Coverage remains partial when supported resolution/traversal cannot establish all users.

Do not fix the default-action problem by scanning workflow arrays separately and copying another inheritance algorithm. Reuse the viewer policy and test overrides, both channels, missing references, repeated calls, and exports.

### 6. Add an operation-scoped bounded path projection

Extend the private catalog path seam to start from each located `CatalogAPIUsage` and its owning step. Keep one operation identity and one direct authored use per document/revision/workflow/step, plus distinct path records keyed by operation, use identity, and ordered relationship IDs. Apply a shared maximum of 100 paths, depth 32, and 10,000 visits across the selected operation's combined path projection; report truncation and cycles rather than resetting the whole budget per user.

Respect step-targeted edges, relationship kinds, supplied entry-role metadata, and incomplete source coverage. Render the result in the operation-consumer panel without requiring a separate selected workflow. Standard same-document call paths use `catalogPathLocation` for exact repeated occurrences. Recovery, prerequisites, descriptive associations, and cross-document paths expose their class and supported authored-source navigation; they never become fabricated nested-call addresses.

Reuse the classified path semantics between catalog presentation and revision impact where their query inputs overlap. Preserve their different result/public contracts and do not widen exports merely to expose a private graph.

### 7. Simplify optional configuration without changing public modes

Put existing standalone scenario setup and configured profile controls under a named, keyboard-operable Advanced tools disclosure. The ordinary document URL/upload, view controls, workflow navigation/search, and Details remain immediate. Explicit/restored guide or profile context reveals the relevant controls and contextual loading/error state, including enabled perspective selection. Disclosure must not start network loading by itself. Keep valid incoming links and host-supplied settings functional; do not add a new profile loader/editor or public configuration format.

Use existing UI typography, spacing, colors, borders, control states, and visible focus treatment for added controls. Move provider-generation and other implementation diagnostics into advanced provenance; keep source revision, missing/ambiguous status, and support limits close to the relevant authored interaction. Preserve mobile dialog trapping/background exclusion and origin-focus restoration. Verify current method/body access and describe it accurately; do not add unrelated step-card features solely to claim closure of upstream issues #206/#207.

This is a bounded presentation pass over the new controls. A brand-system replacement or new viewer mode would expand scope without resolving the review defects.

### 8. Make package and browser gates part of normal maintenance

Replace the three scenario-test `any` values with appropriate fixture/provider/result types, preserving their cancellation and legacy-guide assertions. Keep existing warning policy and full root lint; do not silence the new errors or raise timeouts to disguise failures.

Add documented package acceptance commands around the existing declaration consumer and catalog export scripts. Check real generated declarations and a packed package installed into a temporary downstream consumer. Cover the main and standalone ESM/UMD surfaces, catalog's ESM-only subpath, CSS availability, current public types/callbacks, and absence of private model exports. Source aliases cannot substitute for package resolution.

Add a dedicated production Playwright configuration/runner with sequential build prerequisites, its own server, `reuseExistingServer: false`, artifact identity checks, and ignored evidence destinations. Reuse existing assertions for a compact suite rather than moving every archival walkthrough into CI. Include the repaired provider/ownership/impact cases and desktop/mobile operability. Remove active-change output paths from reusable browser tests. Keep broader archival walkthroughs reproducible on demand.

Wire consumers and browser acceptance into `.github/workflows/build.yml`; browser work gets its own bounded job rather than competing with the root test process's existing timeout. Required failures propagate. Serve UTF-8 consumer HTML and stub contract/dependency documents; assert no business requests and no secondary requests before explicit loading.

### 9. Measure the actual minimal viewer and restore useful deferred imports

Use the pinned upstream source and repaired branch with identical dependency versions, minification, React choice, and consumer build settings. Build an installed ESM consumer importing only `ArazzoUI` and CSS, plus a consumer enabling optional features. Record initial/deferred gzip bytes and module inclusion separately from whole package/UMD sizes. The existing 1,823.46→1,905.30 kB UMD gzip and 177.81→424.46 kB ESM file results are context, not a downstream budget.

Move format adapter imports in the async catalog-loading path to the point where the document kind is known, preserving the public exports and package paths. Remove optional-only module retention caused solely by unused re-exports. Keep unavoidable shared integrity/model code in the viewer and document its measured cost. No arbitrary percentage target or new public package split is required; module-presence assertions prevent a false laziness claim, and measurements identify genuine residual cost.

### 10. Prepare a preserved-source contribution series

Create isolated local submission refs/worktrees from a freshly verified upstream base after repairs. The original branch remains a recoverable source of all eight features, signed/unsigned original commits, archives, and complete evidence. Build logical signed contribution commits on the new refs; map original work, including `73799de` and `503c214`, into those commits. This repairs the DCO of the submitted series without rewriting published source history. A future request to submit the original history instead requires a separately reviewed rewrite plan.

Use the existing roadmap boundaries, adjusting only private imports/types and per-slice tests needed for compilable prefixes:

| Slice | Delivered scope | Required predecessors |
| --- | --- | --- |
| S1 | Chained inspection/model/sequence foundations and their compatibility/CI checks | Upstream base |
| S2 | Readable details, search, responsive controls | S1 |
| S3 | Exact workflow locations and sharing | S2 |
| S4 | Explicit contract/source inspection and authority repairs | S2; series order follows S3 |
| S5 | Systems perspective with explicit actors and consistent controls | S3, S4 |
| S6 | Authored scenarios and optional configuration disclosure | S3, S4 source handoff foundation |
| S7 | Capability catalog with operation paths | S3, S4 |
| S8 | Revision review with structural/effective-use impact | S7 |

Do not assume original feature commits can be cherry-picked unchanged: final shared entry points/providers currently reference later features. Each slice includes only its available exports/types/contexts and its tests, and every prefix builds and verifies independently. Maintain an included/deferred file manifest and final content comparison. Preserve repair coverage in its owning slice.

Prepare concrete issue/PR drafts with motivation, scope, dependencies, interface inventory, selected-1.1 limits, and acceptance evidence. Agent skills/workflows and bulk historical screenshots/logs default to separate local/evidence material, with an explicit disposition for upstream review. Retain selected useful specs and reproducible evidence links without adopting OpenSpec tooling on upstream's behalf. Readiness records which interface/product choices need maintainer feedback; no issue or PR is sent by this change's local preparation.

### 11. Separate engineering evidence from external product decisions

A readiness record tracks each R/A item, implementing files/commits, spec/scenario coverage, current check results, and outstanding validation. Use three independent states: engineering verification, submission preparation, and external human/maintainer decisions. Passing local checks does not make the latter complete.

Provide unfamiliar-reader task cards and a rubric for purchase composition, unknown actors versus responsible teams, second-item mappings, uncertain capture/timeout recovery, operation entry paths, and before/after potential impact. Seek at least one unfamiliar Owner and one Developer when available, collect consent, and record actual assistance/outcome/effort/time and mistaken interpretations. If participants are unavailable, record the protocol and outstanding sessions; A3 remains pending. Likewise, A4 remains pending until actual feedback is recorded. An explicit pending record is useful handoff work, not evidence that those external outcomes have been achieved.

Keep a concise verification summary, exact source/base/build/fixture identities, selected captures, and runnable commands; store routine generated bulk evidence outside tracked source. Copy the precise reviewed repro cases into durable regression fixtures so implementation does not depend on ephemeral `/tmp` scripts. Do not replace pinned historic review bytes when example profiles/current catalog digests change.

## Risks / Trade-offs

- [Disabling native transports regresses local expansion] → Seed root/local references explicitly, retain native reusable occurrence recovery, and verify local schemas, missing components, and no-base inline inputs separately from external acquisition.
- [Native bridge loses declaring base or revision identity] → Test redirects/aliases, relative references, same-URI revisions, cancellation, dependency reload, and denied acquisition through each projection context.
- [Literal/reference classifier misses a real dependency] → Pair every opaque-literal negative case with genuine schema/Reference Object positives and existing inherited parameter/server/security cases; unsupported roles remain partial.
- [Effective actions are mistaken for runtime selection] → Preserve the existing viewer merge policy and labels; consume it consistently without introducing a new runner rule.
- [Catalog/review path enumeration grows with repeated users] → Apply operation-wide budgets, deterministic deduplication, active-path cycle checks, and visible partial coverage.
- [Progressive disclosure hides restored guides or errors] → Automatically reveal supplied/restored context and test mobile focus, keyboard setup, failure states, and fresh-session links.
- [Feature slicing drops shared fixes or includes future exports] → Verify every prefix from isolated refs and compare the final series with the intended repaired source manifest.
- [DCO curation is confused with historical repair] → Preserve old refs, identify replacement submitted commits, and audit the proposed range rather than claim old trailers changed.
- [Evidence curation makes historical work unavailable] → Preserve source refs and an identified evidence archive before excluding bulk material from submission.
- [Human sessions or upstream feedback are unavailable] → Finish independent local preparation, report the external gates as pending, and make no overall approval or measured-comprehension claim.

## Migration Plan

1. Reproduce the pinned review cases as durable tests; repair private authority and semantic seams before presentation/packaging changes.
2. Update optional controls, compatible package loading, current example profile bindings, and generated sample digests without mutating historical revision snapshots.
3. Run focused regressions, then the required root/package/browser gates. Record current findings as verified, failed, or externally pending.
4. Prepare the isolated signed S1–S8 submission series, per-slice verification, source-to-series mapping, concise evidence, and issue/PR drafts. Preserve the existing branch and complete archives.
5. Present the concrete handoff for review. Publishing, pushes, deployment, merges, and any source-history rewrite remain separate actions requiring explicit instructions. Maintainer agreement and actual reader sessions stay external acceptance states.

Rollback can revert presentation/packaging changes or discard the newly prepared local submission refs while retaining the source branch. An authority/semantic repair must not be rolled back by silently restoring provider bypasses or invented facts; preserve safe authored-only/diagnostic behavior if an optional projection must be temporarily disabled. Planning does not archive/sync this change or modify main specifications.
