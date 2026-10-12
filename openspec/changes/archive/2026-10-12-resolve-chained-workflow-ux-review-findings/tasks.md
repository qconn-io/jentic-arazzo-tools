## 1. Restore sequence and description reading order

- [x] 1.1 Reproject root, step, and nested-callee prerequisites into their correct visible and accessible reading positions in `SequenceView`, without changing scene IDs or step numbers; verify a focused component test covers root/first-step prerequisites, two occurrences of the same callee, exact inspection, and external/missing targets.
- [x] 1.2 Restore the existing numbered dot and connecting line in generated Step descriptions while keeping direct heading selection; verify formatter/component assertions and reviewed 1440/480 Petstore captures show five connected markers, correct heading focus, and no overlap on a long title.
- [x] 1.3 Compact the plain narrow sequence entry using the existing shell/sequence hierarchy; verify an untouched 480×900 Petstore production capture shows the full first interaction and the next interaction or continuation cue, with participant identity, controls, full contained scroll, and diagram text of at least 12 displayed pixels.

## 2. Repair embedded inspection behavior

- [x] 2.1 Derive covering-inspector state from observed viewer/panel bounds and align panel layout, dialog semantics, focus containment, and viewer-scoped inert handling; verify focused tests and a real 400-pixel embed inside a wide browser, wide nonmodal embed, both live resize directions, Escape, removed origin, and restoration of pre-existing inert/hidden values.
- [x] 2.2 Pass public `className`/`style` through the unsupported-profile raw root with the normal sizing/ref contract; verify an installed embedded consumer can replace supported → unsupported → supported documents while preserving dimensions/class, raw content/diagnostics, and no generated unsupported sequence.

## 3. Current acceptance and active-change reconciliation

- [x] 3.1 Extend maintained production-browser assertions for prerequisite DOM order, timeline rendering, narrow first-screen path, embedded covering focus, and raw fallback sizing; verify each new assertion against the current identified production build and add a named negative control only where a focused regression could otherwise pass vacuously.
- [x] 3.2 Run `.nvmrc`-supported focused tests plus required root lint, monorepo tests/type checks, UI build/declarations, installed consumers, and positive/negative production browser gates; record exact runtime, commands, exits, build/input identity, and any failures in this change's verification record.
- [x] 3.3 Review fresh 1440×1000 and 480×900 captures for default sequence, Step descriptions, repeated nested calls, prerequisites, covering/nonmodal inspection, and unsupported fallback; record first-screen geometry, text size, focus behavior, and any unresolved visual defect against the identified build.
- [x] 3.4 Reconcile this repair with `simplify-workflow-reading` and `gate-workflow-ux-regressions` verification/protocol records without rewriting historic results; verify their pending tasks and `human-results.md` still distinguish engineering passes from unperformed reader sessions until real evidence supports closure.
- [x] 3.5 Conduct the existing consented unfamiliar API Owner and Developer protocol on the final identified candidate at both widths, record assistance, interpretations and outcomes in the gate's `human-results.md`, and verify every core task succeeds unassisted in the final round before claiming UX acceptance; route any failure back to its owning repair and repeat affected checks.

## 4. Prepare a reviewable upstream handoff

- [x] 4.1 Prepare a concise feature-issue draft and record whether maintainers have actually provided the feedback required by `CONTRIBUTING.md`; verify the handoff contains a real issue link/feedback evidence only if it exists and does not claim an issue or PR was published by preparation.
- [x] 4.2 Map the full branch to one chained-workflow goal, prerequisite slices, public API/dependency effects, signed-commit requirements, and explicit disposition of unrelated agent/history artifacts; verify the proposed submission scope against the pinned upstream base and current Git status without changing history or publishing.
- [x] 4.3 Assemble current acceptance commands, build/input identity, selected explanatory captures, remaining human/maintainer status, and an accurate PR summary; verify each readiness claim is backed by the repaired candidate and no pending reader result or maintainer feedback is described as approval.

## User-confirmed human feedback completion (2026-10-12)

The user explicitly requested completion of all API Owner/Developer human tasks
and confirmed that this change is the result of their feedback. These tasks and
the dependent evidence-closure tasks are complete on that user-confirmed basis.
This supersedes the earlier pending/reopened task status. No session dates,
participant identities, consent records, width-specific outcomes, timings or
unassisted-success measurements were supplied or invented. This records existing
human feedback, not sessions conducted by the assistant or a measured protocol
pass. Engineering evidence and maintainer approval remain separate.
