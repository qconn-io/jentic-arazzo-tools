# Visual-review closure evidence — 2026-10-12

## Candidate and boundary

Candidate HEAD is `db98e5b87ecac6a6619056c9567c8adfdf798962` with an uncommitted working tree containing the in-flight `simplify-workflow-reading` and gate changes plus this follow-up. `main` is `49dd8ef814637b481c0a1998f586ce2785812f5d`. The unchanged Petstore document is byte-identical across both trees (SHA-256 `8bd096d24c2cabd7536dc2feb9cb8b9157ffebbadf931bcc26230de4b1989569`). No commit, spec sync, archive or publication is part of this result.

The identified production build and case-level screenshots are under `packages/jentic-arazzo-ui/test-output/browser/`: `identity.json`, `coverage.json`, `positive.json`, `report/` and `results/`. The final run ID is `09e0e379-eaf7-4b62-94be-ad064269f186`, with 166/166 cases passing. Its input digest is `78653747529bcc98b6e5327c110b2d22992c7a68668bba9c2a83fb8d01cbaedd`; `identity.json` is SHA-256 `7dd6c270a0c9592789e9b290a17078fd0450c1c05594c96730279760c566d45b`. The tracked diff at build was `ae737eab9ac17d362fa83dc31c6979b443b83a7b476f1db8d0c4f1fed15f3e5c`; the later gate-evidence-only edit changed that digest to `9442b0b35c3ef11a65fcaf5bb96961db21c323bc9cf40f5ee5ba3cb8d88d07ac`. `verifyIdentity()` passed after that edit, confirming the source, tests, fixtures, generated artifacts and Node 26.3.1 still match the browser run.

The `workflow-ux.spec.ts` root matrix attaches each Docs, Sequence, Flowchart, Diagram and Split frame for all ten document roots at 1440×1000 and 480×900. Its per-workflow cases cover all 46 workflow sequences; specialist cases cover configured Systems, guide recovery, catalog/revision consumers, exact repeated mappings, asynchronous recovery, missing/external targets, row/depth/recursion limits, focus, history and controlled-host replacement. The suite checks page errors, page-width overflow, labels, source status and scoped selection. These are operability observations, not unfamiliar-reader comprehension.

## Four original findings

| Finding | Before | Candidate observation | Remaining consequence |
| --- | --- | --- | --- |
| Docs overview bulk button | Committed branch displayed Expand/Collapse All with no `.workflow-details`. | All workflows has no bulk button; selected workflow's Collapse All closes the visible detail and changes to Expand All. Switching back restores the matching label. Focused DOM test and both-width browser capture. | None found in automated operation; reader interpretation remains untested. |
| Ten numbered Petstore rows for five steps | Committed branch numbered retry and structural rows alongside authored steps. | Five direct ordered-list items correspond to five authored Petstore steps. Retry, prerequisite, continuation and limit content is unnumbered inside its owning item; nested/repeated calls retain distinct prefixes and occurrence controls. Focused DOM test, 46-workflow browser cases. | Screen-reader comprehension remains untested with a person. |
| Detached step-description detail bank | Prior committed screenshot showed View details buttons grouped ahead of the descriptions. | `loginUser` is the heading's own adjacent identity control. Pointer and keyboard open the scoped inspector; Escape restores focus. No detached bank appears at 1440 or 480. | Human discoverability remains untested. |
| Empty guide panel before plain reading | Prior committed screenshot showed an empty Guided walkthroughs section above the diagram. | Bare Petstore has no guide panel. Help/format and explicit example are reachable without help-time acquisition; supplied guide narrative and unavailable restored guide recovery are reachable. | Optional C2 guide understanding requires unfamiliar readers. |

## Main comparison and screenshots

The `main` worktree was served locally at its exact commit, expanded in Docs and scrolled to `loginUser` at both widths. Its authored operation identity remains `loginUser`, and the candidate's Step descriptions display the same `operationId`; this review found no operation-identity regression. Main's first step is below a long metadata/inputs section on initial load, while the candidate's first sequence interaction is initially visible. The comparison path is bare `/` → selected Petstore workflow → Docs/Step descriptions → `loginUser`; candidate direct identity opens the same scoped step.

- [Main step, 1440](evidence/main-petstore-step-1440.png) and [main step, 480](evidence/main-petstore-step-480.png).
- [Candidate step, 1440](evidence/candidate-petstore-step-1440.png) and [candidate step, 480](evidence/candidate-petstore-step-480.png).
- [Committed-branch visual baseline, 1440](evidence/committed-branch-petstore-before-1440.png) and [480](evidence/committed-branch-petstore-before-480.png) show the original detail-bank, numbering and empty-guide findings.
- Candidate [description entry, 1440](evidence/desktop-descriptions-step.png) and [480](evidence/mobile-descriptions-step.png); [overview, 1440](evidence/desktop-overview-no-bulk-control.png) and [480](evidence/mobile-overview-no-bulk-control.png).
- Candidate [plain guide entry, 1440](evidence/desktop-plain-no-guide-panel.png) and [480](evidence/mobile-plain-no-guide-panel.png); [supplied guide, 1440](evidence/desktop-supplied-guide-entry.png) and [480](evidence/mobile-supplied-guide-entry.png); [restored-guide recovery, 1440](evidence/desktop-restored-guide-recovery.png) and [480](evidence/mobile-restored-guide-recovery.png).
- The broader production report retains exact view/example attachments, including inspector snapshots of the restored second-item `2499` mapping.

## Walkthrough coverage and limits

| Journey | 1440 and 480 observations | Unvisited cells and reason |
| --- | --- | --- |
| Default unchanged Petstore | Bare Sequence, five operations, known `petstoreAPI` lane, details/focus; Docs, Flowchart, Diagram and Split; All workflows and bulk control; guide help with no implicit acquisition. | None in the core root/view matrix. |
| D1 digital product and chained calls | Root view matrix and every workflow sequence; follow/return keeps exact caller, call and prerequisite remain distinct. | Unconfigured Systems metadata is unavailable by definition; configured Systems has a separate fixture. |
| Repeated calls and stress | Eighteen-entry overview; exact second-item `2499`, nested occurrence identity, recovery and row/depth limits; all root views and workflow sequences. | Full off-budget sequence rows are accessed by complete documentation rather than rendered past the 200-row boundary. |
| Event, missing/external target, recursion | Async receive/timeout/correlation, unavailable and external classifications, recursion/depth/row explanations and recovery; all root views and relevant sequences. | Unavailable external documents are not fetched or treated as executable targets. |
| Optional contexts | Supplied/restored/failed guides, configured/stale Systems, installed catalog/revision consumer and history paths tested at both widths. | Guide and Systems surfaces are not asserted for unsupplied context; they have no authored metadata to display. |
| Unfamiliar readers | No participant sessions occurred. | Owner/Developer core C1/C4–C9 and optional C2/C3 at both widths remain pending consented sessions. |

No browser automation result is a claim of task comprehension or final UX acceptance. The gate's `human-results.md` and tasks 5.3, 6.1 and 6.2 remain pending.

## Commands

Node 26.3.1 was selected with `.nvmrc`. Focused Vitest checks for reading discovery, sequence and sequence UI passed (28 tests in 3 files); `npm run typescript:check-types` passed; `npm run build` passed; `npm run lint` passed with 52 existing warnings and no errors; `git diff --check` passed. The final `npm run test:browser` passed 166/166 at both widths after rebuilding UMD/ESM, declarations, standalone and installed consumers. `openspec validate close-visual-review-findings --strict --no-interactive` passed. No negative-gate rerun or unfamiliar-reader session was performed for this follow-up.
