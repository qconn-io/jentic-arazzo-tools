## Context

See `proposal.md` for motivation and the source review. This design is needed because one source can appear simultaneously in the summary, Document information and inspector; adding an unconditional live region to each copy would create repeated announcements.

`SourceDescriptions.tsx` already owns the shared per-source actions and manual bulk action. `InspectionStatus.tsx` places its existing validity explanation after the list; `DocsView.tsx` also mounts the list, while `ContractPanel.tsx` mounts individual sources. CSS styles contract-panel buttons but only adds wrapping to source-list buttons. The summary's expanded body is contained at 35vh. `ContractFactsContext` already filters projections by document/provider/requested revision and excludes obsolete results; keep it as the evidence authority.

The predecessor remains active with human task 4.3 pending. Main `api-contract-inspection` still documents explicit-only acquisition, while the predecessor delta and current code add standalone automatic loading. This follow-up adds three separately named requirements rather than copying a stale MODIFIED block that could overwrite that policy when synced.

## Goals / Non-Goals

**Goals:** Fix FINDING-001 through FINDING-003 at the shared rendering seams, preserve current source/action semantics, and make each criterion independently verifiable.

**Non-Goals:** Redesign workflow reading, add a notification subsystem or source-loading API, change request policy, rewrite loading/projection logic, infer validity, or treat automated checks as human acceptance. Actual reader research remains an evidence task, not an invented outcome.

## Decisions

### 1. Extend scoped viewer button rules at the shared source surface

Include per-source and bulk source actions in existing typography, color, border, hover, disabled and focus rules, then give source actions a scoped minimum width/height of 44px. Keep wrapping and max-width behavior. This applies inside embedded viewers as well as standalone viewing, across all three callers; do not rely on the standalone ancestor to style them.

Alternative: increase every viewer button to 44px. Rejected because unrelated persistent controls would consume reading height and expand scope. Alternative: add a general button component. Rejected because the existing CSS rules are sufficient. Inspect final cascade so contract-panel rules do not reduce the shared target size.

### 2. Put one compact status legend before each relevant content surface

Move the existing document-level explanation into the shared `SourceDescriptions` presentation before the entries, so both API availability and Document information expose it. Remove the old trailing copy from `InspectionStatus`. Proposed reader copy: `Loaded: description available. Operation found: selected declaration located. Neither establishes schema validation or execution.` Supported-profile projection remains the precise meaning in the specification and detailed profile output.

In `ContractPanel`, consolidate the existing Operation found validity explanation into a compact explanation beside the top operation status so it also applies to missing/ambiguous lookup, rather than adding another warning to every source row. Keep the External workflow distinction; API-operation copy must not relabel Arazzo workflow lookup. Source profiles, Inspection scope and technical provenance remain available below.

Keep the collapsed summary unchanged, the list contained, and all sources/actions keyboard reachable. First opening starts with the legend before sources. Preserve scroll/focus after recovery; do not scroll completion back to the legend. A pinned legend or larger source panel is unnecessary for the reported first-opening concern.

Alternative: explain each Loaded label separately. Rejected because four sources would repeat the same warning. Alternative: add a tutorial or modal. Rejected because the distinction belongs next to current status.

### 3. Announce explicit actions at their initiating surface

Use a small, stable polite atomic status region containing only an explicit action's source and current availability/result explanation. The region exists before its text changes. Local presentation state records whether this mounted source initiated an action; other copies render their ordinary visible status without live announcements. Keep the existing stable-section focus behavior and derive results from current contract projections, not raw acquisition responses. Clear presentation ownership when the document/provider/requested-revision scope changes; it cannot carry a prior attempt into replacement content. An unchanged projection does not produce another message.

For manual bulk loading, the initiating `SourceDescriptions` owns one stable aggregate region and a snapshot of that batch's eligible source identities. It derives loading/loaded/failed/unsupported counts from current projections for that batch. Do not activate individual source announcers for the bulk action. Background automatic attempts remain visually inspectable but do not activate explicit-action announcements. A later explicit action can replace that surface's prior announcement ownership.

Track only the initiating attempt until it settles, then retain its final message without continuing to mirror later source changes. A completed source or bulk announcer must not begin speaking again when another surface reloads that source. Replacement clears the retained message as well as pending ownership. This keeps deduplication local without leaving every previously used surface subscribed to future announcements.

No new shared notification store, timers, transport, retry mechanism or public props. Existing current-scope guards remain authoritative. Presentation state is limited to announcement ownership, a retained concise message and the explicit batch, not duplicated facts. Do not attach a live region to the whole source section: URLs, raw YAML and provenance must stay outside it.

Alternative: add `role=status` to every status paragraph. Rejected because duplicate mounted copies and automatic batches would all speak. Alternative: create a global notification service. Rejected because it adds cross-view machinery for this small local interaction.

### 4. Verify semantics, rendered geometry and actual announcements separately

Extend existing `api-description-loading.test.tsx` and relevant entrypoint/contract tests for stable regions, explicit Loading/result/error transitions, bulk aggregation, multiple mounted copies, unchanged rerenders and scope replacement. Tests inspect live text and ownership; they do not claim a screen reader spoke it.

Extend the existing production cases for delayed recovery/missing lookup and long manual source labels, covering 1440×1000 and 480×900. Assert rendered source/bulk target dimensions in all three surfaces, pre-list explanation visibility, source-specific request counts, focus retention, no overflow, compact collapsed entry and current scope. Preserve the required inventory titles and existing budgets. Capture a freshly built candidate and compare with the review's reused-build evidence.

Record a real assistive-technology check with reader/software/version, action, spoken output, duplicate/missing messages and assistance. Separately record unfamiliar API Owner/Developer discovery, uncoached recovery and explanations of Loaded/Operation found/validation, or explicit user-confirmed outcomes, in this change's evidence. If actual evidence is unavailable or fails, leave those tasks and final acceptance pending. Do not close the predecessor's 4.3 merely because these fixes or automated checks pass.

## Risks / Trade-offs

- Larger actions increase expanded-list height → Preserve the existing contained panel, wrapping and compact collapsed header; verify long labels and first-entry budgets.
- Three-clause copy may be mistaken for validation support → Name both schema validation and execution as unestablished and test Loaded with a missing operation.
- Polite regions differ across browser/screen-reader combinations → Verify one named real combination and disclose its coverage; DOM tests establish semantics only.
- Multiple copies or provider replacement replay results → Scope local ownership to the initiating action and current evidence; test bulk, duplicates and late responses.
- First-opening explanation placement is a reviewer hypothesis about comprehension → Validate with actual readers; do not label the relocation proven human success.

## Migration Plan

Apply only after the predecessor's shared loading implementation is present. No consumer migration or dependency installation is needed. Rebuild and run focused checks, then the existing production gate and its negative controls in that order. Preserve hashes of authored inputs and capture final build identities.

Rollback is a targeted reversal of the shared styling, legend placement and local announcement presentation changes. It does not change manual/automatic defaults or registry behavior. Spec sync/archive and commits require a separate explicit request; this proposal performs none.
