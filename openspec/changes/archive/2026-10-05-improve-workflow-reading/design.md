## Context

See `proposal.md` and `ux-baseline.md`. The current source has shared scoped facts and occurrence-aware navigation, but `projectOccurrenceDetails` returns generic section values rendered as JSON. `DocsView` repeats some of those facts in generated Markdown. `WorkflowNavigation` is a flat selector; `SequenceView` has a large SVG and a separate control list. The 480-pixel standalone header overlaps, and the covering inspector has no Escape handler or focus containment. The archived chaining spec supplies retained semantics; no main spec is registered.

## Goals / Non-Goals

**Goals:** Put a deep reading module behind a small private projection interface, reused by every view; improve presentation without changing authored identity or expression meaning. Make omitted content discoverable through the authored model rather than enlarging scenes.

**Non-Goals:** Contract fetching, business-system inference, expression evaluation, runtime tracing, editing, or public exposure of sequence internals. Shareable locations are a separate change.

## Decisions

### Typed private detail projection

Replace generic default JSON sections with a private discriminated projection: identity/context, value rows, payload tree, criteria, outputs, prerequisites, recovery cards, and advanced authored/provenance content. Keep the complete original snapshots. Distinguish absence using property presence, not truthiness. A value renderer handles arrays/objects and falsy values consistently; exact expressions are selectable/copyable. Action cards preserve effective inspection order, origin, criteria, target classification, authored retry limits/delays, and source-step return semantics. Use profile-known AsyncAPI timeout/correlation fields; unsupported fields stay authored.

This concentrates interpretation at the existing facts seam. Separate per-view formatting would preserve today's duplication; a new generic JSON explorer alone would not improve comprehension. Documentation links into the same details rather than embedding the full projection twice.

### Authored search and classified overview

Build a document-local search index from `ArazzoViewerModel` workflows/steps, not sequence rows. Case-insensitive matching covers IDs, summaries/descriptions, and authored operation locators; preserve authored order and expose scoped ownership. Results navigate through existing owner-aware navigation, then open details/docs even past scene budgets. A bare step result is an authored location, not a guessed repeated occurrence. Do not index secrets or expand arbitrary payload content by default.

Extend the existing overview cards with a classified relationship list and filters, including incoming recovery and prerequisites. Keep graph pan/zoom as an additional view. Do not attempt to solve dense graph readability by scaling all labels down.

### Presentation and focus

Use responsive header grid/wrapping and measured pane space; constrain overflow to diagram or code/value regions. Keep sequence participant headings available in the scrolling canvas, with selected caller context outside it. Show ellipsized human-readable labels with full text on focus/inspection rather than breaking identifiers midword. Accessible control names include root/call path, scoped step, and row/action role.

Use a nonmodal desktop inspector and a modal covering inspector at the layout breakpoint. Both close on Escape. The covering variant contains focus, marks the background unavailable, and restores focus to the initiating control; if it was removed, focus the visible scoped destination/navigation. Reuse the current close/return mechanism rather than resetting session state.

## Risks / Trade-offs

- [Projection hides a fact] → parity checks cover payloads, criteria, actions, falsy values, unresolved provenance, and advanced authored content across modes.
- [Responsive SVG work disrupts call groups] → retain existing row IDs/budgets and test scroll geometry plus repeated-call focus with Playwright.
- [Automated clicks overstate usability] → distinguish browser task evidence from actual unfamiliar-reader comprehension; record assistance and incorrect interpretations in the human protocol.

## Migration Plan

No prerequisite change. Replace the private projection/rendering in focused increments, retain existing public exports/callbacks, and document the updated reading controls. Run focused tests, UI suite, types/build, and fresh browser walkthroughs at 1440 and 480 pixels. Rollback is limited to presentation/projection changes; no authored documents or persisted session data are migrated.
