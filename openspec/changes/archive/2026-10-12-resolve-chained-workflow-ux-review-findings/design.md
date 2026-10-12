## Context

See `proposal.md` and the two delta specs. `buildSequence` already emits workflow and step prerequisite rows before their interactions, with stable tuple IDs and bounded traversal. `SequenceView` currently projects every non-step row into an annotation after an owner `<li>`; its fallback can attach a workflow prerequisite to the first step. The documentation formatter emits a bare timeline number while `DocsView` still styles `.timeline-dot` and `.timeline-line`. `SelectionDetails` bases modality on viewport media queries while its 480-pixel absolute panel is sized within the viewer shell. `RawInspectionView` has its own fixed root class and padding and receives neither public `className` nor `style`.

The active `simplify-workflow-reading` change implements the broad presentation shift, while `gate-workflow-ux-regressions` owns the newcomer protocol. Both retain pending final evidence and reader tasks. The contribution guide requires an issue and feedback for a feature PR, DCO, and reviewable scope; existing `upstream-contribution-readiness` requirements already describe a handoff without claiming maintainer approval.

## Goals / Non-Goals

**Goals:**

- Correct presentation ownership and order over the existing inspected sequence rows without changing their semantic construction, limits, or identities.
- Restore the existing Jentic timeline treatment and give first-screen sequence reading a visible path start at 480×900.
- Make inspector semantics match the actual space it occupies in a standalone or embedded viewer, including live resizes and focus restoration.
- Preserve the public embedded styling contract on unsupported-profile raw content.
- Make the repaired candidate and remaining human/upstream dependencies reviewable with current evidence.

**Non-Goals:**

- Change Arazzo interpretation, source acquisition, execution behavior, public mode/location encodings, or authored fixture bytes.
- Add a new view, profile editor, dependency, responsive configuration option, or synthetic workflow relationship.
- Simulate reader sessions, close active changes, rewrite feature history, publish an issue/PR, or claim upstream approval.

## Decisions

### 1. Reproject annotation placement from scene order and semantic scope

Keep `buildSequence` as the source of authored order, target classification, and row IDs. In the reading-list projection, separate root workflow prerequisites into an unnumbered prelude before the `<ol>`; place step prerequisites immediately before their owning numbered control, and nested workflow prerequisites immediately after their specific call boundary but before that callee's first step. Preserve scene order within each scope and use existing `path`, `parentId`, `step`, and row ID to bind repeated calls. Keep continuations, recovery, and limit markers after their owning interaction. Render valid list markup and maintain keyboard access and existing selection callbacks. Avoid the current arbitrary first-step fallback for prerequisite rows.

Alternative considered: reorder `scene.rows` or give prerequisites step numbers. Both would alter SVG traversal, row budgets, or authored-step meaning to solve a list-only placement defect.

### 2. Repair timeline markup and reclaim initial vertical space locally

Emit the numbered `.timeline-dot` and connecting `.timeline-line` expected by the established `DocsView` styles, while retaining the heading as the direct detail control and the existing workflow/step data attributes. Check first and last marker treatment at both widths. For sequence entry, first inspect the current capture and vertical offsets in the standalone shell, help/context rows, participant header, and SVG leading space; reduce redundant spacing or repeated context in the default state until the first interaction and continuation cue fit. Preserve identity/status through their existing disclosures and keep the full sequence in a contained scroll area. Do not auto-scroll the canvas on initial load or scale diagram text below 12 pixels; either could disorient a reader or hide a prerequisite above the fold. Confirm expanded details and explicit views do not inherit a misleading forced scroll position.

Alternative considered: a global zoom-out or removing the list/status. That would trade away legibility or required inspection cues.

### 3. Calculate covering state from viewer and inspector bounds

Observe the viewer shell and inspector geometry while details are open. Treat the panel as covering when its overlap leaves less than a usable reading width (initial design threshold: 320 CSS pixels); verify the threshold against real 400-pixel and wide embeds and adjust the internal constant if the captures show otherwise. Align any CSS side-panel width and `role`/`aria-modal`/focus behavior with the same state. Apply inert and `aria-hidden` only to covered viewer siblings, snapshot their previous values, and restore those values when modality changes or the panel closes. Keep the origin/fallback focus behavior after dismissal. A viewport resize alone is insufficient because a host may resize its embedded pane inside an unchanged browser.

Alternative considered: CSS media queries alone. They cannot communicate an embedded pane's covering state to dialog semantics and keyboard handling.

### 4. Reuse the public root contract in raw fallback

Pass the existing public `className` and `style` values into `RawInspectionView`, retaining the same default width/height boundary as normal, loading, and error states. Keep the forwarded ref, scrollable authored JSON, and diagnostics. Do not add source retrieval or semantic projection in this path. Verify replacement between supported and unsupported documents in an installed embedded consumer, not only a source-level unit test.

Alternative considered: wrap the raw view in another outer element. That risks a second sizing/scroll boundary and changes what the forwarded ref points to.

### 5. Close engineering findings before claiming reader or upstream acceptance

Use focused model/list, documentation, resize/focus, and raw-fallback regressions plus current production captures at 1440×1000 and 480×900. Extend the maintained browser/negative controls only where they would catch these specific failures. Record exact candidate/build identity and reconcile the two active changes' evidence without overwriting historical results. Run the existing consented API Owner/Developer protocol on the repaired identified build; any reader-discovered defect reopens its owning repair and requires a fresh round. Prepare the upstream feature issue/feedback and coherent scope handoff under the existing readiness spec; record missing feedback as pending. Separate local engineering readiness, human comprehension, and maintainer acceptance in every summary.

Alternative considered: treat a green browser suite or the prior 23/25 simplification tasks as final UX acceptance. The recorded `human-results.md` explicitly says no sessions occurred.

## Risks / Trade-offs

- **Prerequisite ordering could split a repeated callee from its own context** → Assert visual and accessible order and exact selection for two call paths sharing one callee, plus root/step/external prerequisites.
- **Compacting the first screen could hide diagnostics or reduce readability elsewhere** → Keep full content in existing disclosures and compare current captures, computed text size, scroll containment, and explicit-view restoration at both widths.
- **Geometry changes while a panel is open could strand focus or leave background inert** → Test both resize directions, close/unmount, pre-existing inert/hidden attributes, and origin removal.
- **A new raw root style could alter host dimensions** → Test supplied dimensions/class through supported, loading/error, and unsupported presentations in the installed consumer.
- **The feature branch is much larger than this repair** → Prepare a scoped dependency/commit map and truthful issue-feedback status; treat publication and any history rewrite as separate decisions.

## Migration Plan

No data or public API migration is planned. Implement as a focused UI repair, run the current package and production gates, identify the repaired build, then update the active evidence records and contribution handoff. Reverting the UI repair returns the previous presentation without converting authored documents or locations; keep the prior evidence labelled historical.
