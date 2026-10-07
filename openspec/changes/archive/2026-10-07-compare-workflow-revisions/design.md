## Context

The planned catalog supplies revision identities and reverse usage; source inspection supplies pinned contract projections; readable details and locations supply review destinations. There is currently no two-revision model or comparison view. This change depends on the catalog and its foundational changes, with no requirement for Systems/scenario delivery.

## Goals / Non-Goals

**Goals:** A pure, deterministic comparison/impact module behind a small snapshot interface, plus an optional reviewer view and portable results.

**Non-Goals:** Git hosting integration, automatic rename guessing, approval persistence, expression execution, runtime failure prediction, or full schema backward-compatibility classification.

## Decisions

### Immutable comparison inputs

Define a versioned `WorkflowReviewSnapshot` with logical document/catalog identity, immutable revision, authored document contents/digests, and optionally pinned source contract contents/digests. Inputs are supplied objects/files or explicit immutable catalog revisions. URI references without historic content/digest verification are incomplete contract inputs, not a license to retrieve today's bytes as the baseline. Parse each snapshot independently using its supported inspection profile; keep raw comparison available when semantic inspection is unsupported.

Two isolated projections prevent old values/new contracts from being mixed. A comparison session is independent of normal viewer selection; each side uses its own document/revision location. Both removed baseline content and added candidate content remain inspectable. No automatic network polling or local Git access is introduced.

### Authored structural differences with evidence

Canonicalize object key order and serialization whitespace, retain array order and exact expression strings, then match workflows/scoped steps by stable IDs. Decompose findings into declarations/inputs/outputs, mappings/payloads, criteria/prerequisites, actions/targets/order/retries/timeouts, source locators, descriptive metadata, and located contract declarations. Extension changes are authored metadata findings unless a supported explicit view profile supplies additional interpretation. A rename is removal/addition unless the input includes an explicit one-to-one match map validated for collisions.

Every finding contains before/after authored paths, value presence, revision identity, category, and available workflow locations. Do not perform a full generic JSON Schema compatibility proof: present declaration differences and the known users for expert judgment. Effective inherited action differences can accompany authored declaration differences with provenance so reviewers understand their effect without duplicate counts.

### Static impact through the catalog seam

Traverse reverse usage separately in each snapshot, starting at the changed workflow, step, or located operation. Return direct usages and bounded transitive potential entry paths; preserve call/prerequisite/goto/retry/descriptive classes. Deduplicate tuples, stop cycles, and include unknown/unloaded coverage. Default traversal uses at most 10,000 visited relationships and 100 displayed paths per finding, with visible truncation. This is potential exposure, not proof of a transaction failure or a compatibility verdict.

The UI presents a findings list with category filters, before/after detail panes, and classified impact paths. Avoid a whole-portfolio graph as the only review surface. A removed finding opens baseline inspection; candidate inspection clearly shows absence. Reuse existing inspector renderers rather than inventing a parallel raw diff reader.

### Deterministic export

Provide JSON and Markdown exports sorted by document, workflow, step, category, and authored path. Include revision/digest identities, value differences, scoped locations, and coverage/limit records. Exclude private session objects and implicit approval/test state. Export supplied authored values as review content; do not add credentials from host/provider configuration. Identical input snapshots produce identical substantive results.

## Risks / Trade-offs

- [Stable IDs are renamed] → explicit optional match map or removal/addition, never silent heuristic matching.
- [Large changes flood the review] → category/group filters, bounded impact paths, and direct authored-value access.
- [Static changes are mistaken for incompatibility] → distinguish observed declaration differences, potential usage exposure, and unknown runtime effect in UI and export.

## Migration Plan

Introduce snapshot/result types and pure projections after catalog identity/usage contracts exist. Add optional review presentation/export and synthetic revisions of the purchase/event fixtures. Verify formatting-only changes, retry-to-goto, response/criteria changes, removals, cycles, and unavailable baseline sources. Run declaration checks/build and browser review tasks. Rollback removes optional comparison capability without changing catalog manifests or viewer defaults.
