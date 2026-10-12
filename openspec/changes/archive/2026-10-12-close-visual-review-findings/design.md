## Context

See [proposal.md](proposal.md). The committed review target (`db98e5b`) displayed ten numbered Petstore sequence rows for five authored steps and an inert Collapse All button in the Docs overview. At 480 pixels it also grouped detached detail buttons before step descriptions and showed an empty guide panel. The working tree contains uncommitted reading changes, and `simplify-workflow-reading` already specifies the intended numbering, contextual detail, and guide behavior. `gate-workflow-ux-regressions` retains pending unfamiliar-reader acceptance.

## Goals / Non-Goals

**Goals:** Close each finding against an identified candidate build with reproducible browser evidence; add only the missing overview-control contract; preserve authored semantics, scoped occurrence identity, public navigation, and explicitly supplied guide behavior.

**Non-Goals:** Redesign the other views, duplicate the in-flight reading specifications, infer source contracts or execution outcomes, or turn automated browser navigation into a claim of human comprehension.

## Decisions

### Scope the bulk control to actual workflow details

The existing Docs header renders `Expand All`/`Collapse All` even when `activeWorkflowId === null` and no `.workflow-details` exists. Gate that control by the rendered workflow-detail set and derive its label from the state of that same set. Keep overview relationship disclosures independent. This is smaller than adding a new expansion behavior to the overview, which already has its own per-entry relationship controls.

### Preserve authored-step numbering in the reading projection and DOM

Use the in-flight sequence reading projection's authored-step hierarchy as the source of primary numbers. Render prerequisites, possible actions/recovery, structural continuations, and limit markers as associated annotations rather than sibling numbered items. Keep nested callee steps subordinate to the exact call occurrence and retain stable occurrence IDs for selection, mappings, return navigation, and focus. CSS-only number suppression would leave misleading ordered-list semantics for assistive technology.

### Treat the two UX questions as observed closure criteria

The working tree already moves description detail entry to step headings and suppresses the unsupplied guide panel. Verify those states in the actual browser at 1440 and 480 pixels, including keyboard focus return, long labels, an explicitly supplied guide, and an unavailable restored guide. Change implementation only where observation shows a remaining gap. No guide acquisition occurs from the plain Petstore entry.

### Keep evidence and approval boundaries explicit

Use the prior committed-branch screenshots as a baseline, then record new screenshots and observations against an identified candidate revision and viewport. Include the ordinary Docs → Sequence → Flowchart → Diagram → Split path and relevant Systems, guide, catalog, and revision paths, plus difficult call/async/target/stress examples. Report which cells were inspected or skipped. Keep the separate Owner/Developer sessions in the UX gate pending until they occur and their results are recorded.

## Risks / Trade-offs

- [Overlapping active changes] → Finish or reconcile `simplify-workflow-reading` requirements before applying this follow-up; check the final combined spec text before any sync so a later delta cannot restore an older requirement.
- [Numbered display diverges from spoken list structure] → Inspect the DOM/list hierarchy and keyboard reading order as well as pixels; test Petstore and nested/repeated calls.
- [Hiding empty guide entry hides recovery] → Distinguish unsupplied context from explicitly supplied or restored context and verify feature-local help and recovery.
- [Evidence mistaken for reader acceptance] → Label browser checks as operability evidence and retain outstanding human tasks in `gate-workflow-ux-regressions`.

## Migration Plan

No data or public API migration. Apply only after reconciling the in-flight reading implementation, then run focused tests and browser walkthroughs. A revert of the follow-up should restore the prior viewer behavior without changing authored documents or saved locations.
