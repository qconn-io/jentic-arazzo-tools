# upstream-contribution-readiness Specification

## Purpose

Provide maintainers with repeatable evidence that the UI contribution is compatible, understandable, correctly scoped, and ready for a signed dependency-ordered submission without confusing local verification with upstream approval.

## Requirements

### Requirement: Maintained package acceptance gates

Documented local commands and pull-request CI SHALL run root lint, monorepo tests and type checks, UI builds, generated public-declaration consumers, installed-package export consumers, and a compact production-browser acceptance suite. A failing required check SHALL fail its gate. Consumer checks SHALL use built/packed artifacts rather than substituting private source imports. Compatibility checks SHALL cover both existing viewer entries and the optional typed ESM catalog path while keeping private models unexported.

#### Scenario: A generated declaration becomes incompatible
- **WHEN** a change breaks a public declaration consumed by a downstream viewer or catalog host
- **THEN** the normal pull-request pipeline fails the downstream consumer check even if source tests and source type checks pass

#### Scenario: Scenario tests violate lint rules
- **WHEN** a scenario fixture introduces a prohibited explicit `any`
- **THEN** the maintained root lint gate fails instead of an archived verification record presenting the contribution as passing

### Requirement: Reproducible production-browser acceptance

The browser acceptance command SHALL build and serve its own current production standalone and installed-ESM consumer artifacts, use an isolated test server, and write generated evidence to ignored output or CI artifacts. It SHALL NOT rely on an unrelated existing development server or recreate active change directories after archival. The compact suite SHALL cover plain viewing, explicit contract loading, repeated-call navigation, Systems unknown actors, scenario focus/dismissal, operation-consumer paths, and before/after review at desktop and 480-pixel widths without executing business API operations.

#### Scenario: Acceptance from a clean checkout
- **WHEN** a maintainer installs dependencies and runs the documented production-browser command
- **THEN** the command builds its prerequisites, exercises the current packaged surfaces, reports failures directly, and leaves tracked planning/source files unchanged

#### Scenario: A development server is already running
- **WHEN** an unrelated development server occupies its usual port
- **THEN** acceptance uses its own identified production server and does not silently validate that development instance

### Requirement: Optional tools use progressive disclosure
Plain workflow viewing SHALL retain immediately available workflow selection, sequence/step reading and interaction details, with document loading, search, sharing and alternative presentations accessible through compact, understandable controls. Optional configuration SHALL use contextual, feature-specific disclosure with benefit-oriented explanations; an empty guide panel or unavailable Systems promotion SHALL NOT appear above ordinary reading. Supplied guides SHALL be accessible through a compact named guide entry and configured Systems through More views. Explicit supplied or restored optional context SHALL reveal its relevant controls and status without mandatory unrelated setup. Loading, failure, coverage and support limitations SHALL remain visible where they affect reading; diagnostic implementation metadata SHALL be available through advanced inspection. This disclosure SHALL NOT introduce profile editing or hide semantic uncertainty.

#### Scenario: Ordinary workflow without optional metadata
- **WHEN** a reader opens an ordinary document without scenario/profile/catalog context
- **THEN** its sequence is readable immediately under the implicit default, optional forms and empty panels do not occupy persistent reading space, and guide purpose/loading remains reachable through contextual help

#### Scenario: Shared authored guide
- **WHEN** a valid shared link restores a scenario manifest and waypoint
- **THEN** the relevant guide and its status are revealed without another setup step and closing details retains supported guide navigation

#### Scenario: First-time optional-feature discovery
- **WHEN** a reader deliberately seeks optional functionality through contextual help or More views
- **THEN** guide purpose and Systems metadata requirements are explained at that point, explicit loading/configuration boundaries remain intact, and ordinary workflow comprehension does not require completing that discovery task

### Requirement: Consistent accessible controls

New navigation, configuration, catalog, scenario, and inspection controls SHALL use the existing visual language for typography, spacing, control states, and focus. At desktop and 480-pixel widths they SHALL remain readable and operable without overlap or page-wide horizontal scrolling. Covering mobile inspection SHALL contain focus and hide background interaction until dismissal; closing it SHALL restore focus to an applicable origin or visible fallback. Located HTTP methods and authored request bodies SHALL remain accessible without guessing or automatic contract acquisition.

#### Scenario: Keyboard use of optional tools and details
- **WHEN** a keyboard reader reveals optional tools, opens an interaction, and dismisses its covering mobile details
- **THEN** disclosure state is exposed accessibly, focus stays in the covering inspector while open, and dismissal returns to the initiating control or supported fallback

### Requirement: Measured optional package cost

Contribution evidence SHALL measure comparable production standalone and minimal embedded-viewer consumers against the pinned upstream baseline using the same dependency versions and build settings. The record SHALL distinguish complete package-file size from downstream tree-shaken initial download and deferred code. Optional-only catalog/review code SHALL not be retained in a minimal viewer consumer solely by unused exports. Supported adapter loading SHALL preserve functional behavior without claiming lazy loading when a static import makes it eager. No incompatible package-path removal SHALL be used to meet this requirement.

#### Scenario: Minimal embedded viewer consumer
- **WHEN** an installed ESM host imports only the viewer and stylesheet and does not enable optional source inspection, catalog, or review
- **THEN** acceptance records its initial/deferred code and verifies that unused optional-only exports do not force catalog or comparison UI into the initial consumer

### Requirement: Focused signed contribution series

The contribution handoff SHALL identify a pinned upstream base, complete intended source scope, dependency-ordered independently verifiable submission slices, and a mapping from included original work to proposed signed contribution commits. Every commit submitted in a slice SHALL satisfy the repository's DCO and commit conventions. Preparation SHALL preserve the original branch and its historical evidence. Each slice SHALL disclose its public interface/dependency changes and required predecessors; unrelated agent workflows and bulk historical evidence SHALL be assigned an explicit separate disposition rather than silently included or deleted.

#### Scenario: Original feature commits lack signoffs
- **WHEN** the source history includes `73799de` and `503c214` without DCO trailers
- **THEN** the prepared submission series includes their intended work through properly signed contribution commits and records the mapping without rewriting the preserved source branch

#### Scenario: Later portfolio features depend on core reading
- **WHEN** the submission series is prepared
- **THEN** the core viewer/reading/location slice can be reviewed and verified without first merging catalog or revision review, and later slices identify their required predecessors

### Requirement: Upstream agreement remains an external decision

The handoff SHALL contain concrete issue/PR drafts, motivation, public-interface inventory, and a truthful maintainer-feedback status for the planned slices. Missing feedback SHALL be recorded as pending rather than fabricated approval. Preparing those artifacts SHALL NOT publish messages, open issues/PRs, push branches, deploy, or merge. Any separately authorized publishing step SHALL verify its actual destination and scope before execution.

#### Scenario: No recorded approval for sidecar interfaces
- **WHEN** no maintainer decision is available for profile, scenario, catalog, or review interface scope
- **THEN** the handoff presents a reviewable scope proposal and records agreement as pending while local implementation/verification progress remains independently reportable

### Requirement: Compact evidence preserves provenance

The handoff SHALL provide concise current acceptance results, reproducible commands, baseline/head identities, relevant fixture/build digests, and selected explanatory captures. Complete historical artifacts SHALL remain recoverable from the preserved source history or identified evidence archive. Current results SHALL distinguish passes, failures, incomplete coverage, and unperformed validation; package/version support text and proposed issue closures SHALL match the actually demonstrated behavior.

#### Scenario: Historical verification differs from the current gate
- **WHEN** an archived log reports success but a current required check fails
- **THEN** readiness records the current failure and preserves the historic log as historic evidence

#### Scenario: Related issue asks for a step-card detail
- **WHEN** the contribution exposes a method/body only in an inspector and the related issue asks for it on a step card
- **THEN** the handoff describes the delivered behavior and does not claim that issue closed without demonstrating its requested acceptance

### Requirement: Human comprehension evidence is honest
Acceptance SHALL provide separate core-reading and optional/specialist unfamiliar-reader tasks for an API Owner and a Developer. The core segment SHALL begin at the plain entry and assess explaining interactions, direct selection, following a call and returning, guards/recovery/timeout interpretation, and repeated mappings without prior guide or Systems training. Separate applicable segments SHALL retain guide discovery, unknown actor/ownership interpretation, operation entry paths and before/after impact coverage. Conducted protocol sessions SHALL record consent, assistance, task outcome, effort/time, incorrect interpretations and supporting explanations; alternatively, tasks MAY be closed by explicit user-confirmed API Owner/Developer feedback recorded in `human-results.md` without fabricating session timings or transcripts. Automated walkthroughs SHALL remain labelled operability evidence. Core success SHALL NOT be presented as optional-feature acceptance, and missing required participants, unresolved corrections or unperformed required segments without explicit user confirmation SHALL leave final UX acceptance pending.

#### Scenario: Browser tests pass with pending or user-confirmed human validation
- **WHEN** automated acceptance passes without conducted protocol sessions
- **THEN** engineering results are reported as passing, while human comprehension is either left pending or recorded as `USER-CONFIRMED` in `human-results.md` without invented session data, keeping external maintainer review separate

#### Scenario: Reader infers a business outcome or ownership
- **WHEN** a participant mistakes an unknown actor for a supplied owner, a receive declaration for observed delivery or potential impact for proven failure
- **THEN** the incorrect interpretation and affected task are recorded for targeted improvement rather than counted as an unassisted success

#### Scenario: Core success and optional discovery failure
- **WHEN** a reader completes core workflow tasks but needs assistance finding guide help in the separate optional segment
- **THEN** the outcomes remain separately recorded, the optional discovery defect retains required follow-up, and the overall gate is not declared complete by deleting that coverage

#### Scenario: Candidate changes after observations
- **WHEN** presentation or behaviour changes after a participant session or screenshot review
- **THEN** affected acceptance is repeated on the identified final candidate and historical observations are retained with their original status

### Requirement: Baseline-inclusive production acceptance inventory
Maintained acceptance SHALL enumerate the unchanged default Petstore Arazzo 1.0.1 document, all nine existing digital-product and stress Arazzo documents, and adversarial supported 1.0/1.1 source-binding fixtures. Inventory entries SHALL identify expected source/operation relationships, exercised representations, version and fixture digest. Missing entries or expectations SHALL fail coverage. Current built standalone and installed ESM viewer consumers SHALL be tested at 1440 and 480 pixels; ordinary entry tests SHALL start without preconfigured guide/profile query parameters.

#### Scenario: Default document regression
- **WHEN** the production acceptance command opens the default entry without document or optional setup parameters
- **THEN** it verifies unchanged Petstore's five interactions use one known petstoreAPI destination, checks its labels/detail controls and captures the result from the identified current build

#### Scenario: An example is omitted
- **WHEN** an existing inventoried Arazzo example or required representation is missing from the acceptance run
- **THEN** coverage fails instead of reporting all examples accepted from a smaller configured subset

### Requirement: Acceptance gates detect their target failures
The maintained gate SHALL demonstrate deterministic failure for wrong known-source destinations, stale lookup evidence, silent rendering failure, undiscoverable optional guidance, and incompatible legacy locations or public consumers. Negative checks SHALL assert the relevant failure reason; a missing server, unrelated crash or dependency failure SHALL NOT count as successful detection. Fixture perturbations SHALL use isolated test inputs or ignored output without altering authored public samples or tracked source.

#### Scenario: Petstore destination fault
- **WHEN** an isolated negative input recreates per-step unknown lanes for unchanged single-source Petstore
- **THEN** the destination assertion fails for that exact mismatch and the normal unmodified candidate still passes

#### Scenario: Setup-only discovery coverage
- **WHEN** optional-guide acceptance is changed to bypass the normal entry and use a preconfigured guide URL
- **THEN** the discovery coverage check rejects the missing first-use path even if subsequent waypoint clicks succeed

#### Scenario: Stale or blank presentation
- **WHEN** a controlled negative case leaks old operation evidence or produces a blank failed diagram
- **THEN** acceptance fails its freshness or localized-error assertion rather than relying only on console-error or geometry checks

### Requirement: Final series readiness requires current complete evidence
Final readiness SHALL require the three preceding repairs individually verified and integrated on the same identified candidate, passing required engineering checks, complete example/compatibility/discovery coverage, reviewed visual evidence, successful gate negative controls, and completed unfamiliar-reader tasks (closed either by recorded protocol sessions or by explicit user-confirmed API Owner/Developer feedback recorded in `human-results.md`). Every discovery SHALL map to a requirement, owned implementation task and current evidence. Any failing mandatory check, unresolved discovered regression, unclosed required reader task or unexplained evidence gap SHALL block final UX acceptance. Automation-only engineering success SHALL be reportable separately. The gate SHALL make no absolute future-defect guarantee and SHALL NOT waive a failure by editing samples, deleting coverage or silently lowering an expectation.

#### Scenario: Engineering passes with pending or user-confirmed human validation
- **WHEN** package/browser checks pass without conducted unfamiliar-reader protocol sessions
- **THEN** engineering success is recorded separately and final UX acceptance is either held pending or closed as `USER-CONFIRMED` in `human-results.md` when the user explicitly confirms existing API Owner/Developer feedback

#### Scenario: A new regression is discovered
- **WHEN** integration or a newcomer task exposes a defect introduced by the series
- **THEN** it is assigned to the owning repair, fixed and reverified with permanent targeted coverage before final acceptance can pass

#### Scenario: Stale acceptance artifacts
- **WHEN** evidence predates a relevant candidate, fixture or production artifact change
- **THEN** it is rejected as current evidence and the affected acceptance is rerun with fresh identity and failure records
