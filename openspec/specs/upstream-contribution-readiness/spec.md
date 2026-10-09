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

Plain workflow viewing SHALL retain immediately available document loading, view switching, workflow navigation/search, and details. Existing optional scenario setup and configured profile controls SHALL be accessible through a clearly named advanced-tools control rather than occupying the unconfigured default reading surface. Explicit supplied or restored optional context SHALL reveal its relevant controls and status. Loading, failure, coverage, and support limitations SHALL remain visible in context; diagnostic implementation metadata SHALL be available through advanced inspection without dominating normal business details. This disclosure SHALL NOT require a new profile-loading or editing workflow.

#### Scenario: Ordinary workflow without optional metadata
- **WHEN** a reader opens an ordinary document without a supplied scenario/profile/catalog context
- **THEN** its workflow can be explored immediately and optional configuration fields remain available behind a keyboard-operable disclosure

#### Scenario: Shared authored guide
- **WHEN** a valid shared link restores a scenario manifest and waypoint
- **THEN** the relevant guide and its load/status controls are discoverable without another setup step and closing details retains supported guide navigation

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

Acceptance SHALL provide a repeatable unfamiliar-reader protocol for an API Owner and a Developer covering purchase explanation, unknown actor ownership, repeated mappings, recovery/timeout interpretation, operation entry paths, and before/after impact. Actual sessions SHALL record assistance, task outcome, effort/time, incorrect interpretations, and supporting explanations with consent. Automated walkthroughs SHALL remain labeled operability evidence. When participants are unavailable, the record SHALL identify human validation as outstanding and SHALL NOT claim measured ease of understanding or final product approval.

#### Scenario: Browser tests pass without participant sessions
- **WHEN** automated acceptance passes but no unfamiliar-reader sessions were conducted
- **THEN** local engineering results can be reported as passing while human comprehension remains explicitly outstanding

#### Scenario: Reader infers a business outcome or ownership
- **WHEN** a participant mistakes an unknown actor for a supplied owner, a receive declaration for observed delivery, or potential impact for proven failure
- **THEN** acceptance records the incorrect interpretation and the affected task for targeted improvement rather than counting it as an unassisted success
