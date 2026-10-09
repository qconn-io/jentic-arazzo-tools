# Simplify workflow reading controls verification

## Candidate and prerequisite

Started 2026-10-09 on HEAD `6c3323445df6720cf602cd2a23e5a78525aa956f` with the source-binding implementation already present as uncommitted changes, archived at `archive/2026-10-09-restore-workflow-source-binding`. Existing changes are retained.

Fresh prerequisite check: `npm test -w @jentic/arazzo-ui -- test/petstore-source-binding.test.ts test/step-operation.test.ts test/sequence-destination.test.ts test/sequence-source-freshness.test.tsx test/contract-panel.test.tsx`: 20 tests in 5 files passed. The Petstore production-seam regression confirms exactly two participants (workflow and petstoreAPI), five bound operations, and no secondary acquisition.

Unchanged Petstore SHA-256: `8bd096d24c2cabd7536dc2feb9cb8b9157ffebbadf931bcc26230de4b1989569`.

## Implementation and compatibility evidence

All npm commands used the repository `.nvmrc` via `source "$HOME/.nvm/nvm.sh" && nvm use` (Node 26.3.1). Source snapshot identity is recorded in [verification/source-identity.json](verification/source-identity.json). Captured artifact SHA-256 values and every viewport result are recorded in [captures/observations.json](captures/observations.json); the build contains both this presentation slice and the preceding source-binding implementation.

- New navigation tests first failed for missing scoped control names/direct sequence actions, then passed. Public layout callback values remain `diagram`, `docs`, `split`; private representations remain `docs`, `sequence`, `flowchart`.
- New identity tests first failed for missing summary/operation labels and generated participant headings, then passed. Workflow summaries are authored, IDs remain exact, qualified locators remain accessible, and send/receive intent is preserved without inferred actors or outcomes.
- New contract presentation tests first failed for missing reader status/action language, then passed. Partial coverage never establishes a unique operation; denied acquisition exposes the actual error and Retry. Technical lookup status, exact locator, retrieval URI, revision and provider generation remain inspectable in labeled details.
- New render-recovery tests first failed for invisible rejected renders, then passed. Pending retry retains the error until a current success; late error/SVG results and late retry results cannot update a replacement source/document. Retry only redraws and does not acquire sources.
- Independent read-only review found one Important issue: successful retry removed its keyboard-focused button. A failing regression reproduced it; the fix focuses a stable Flowchart region before that recovery control is disabled/removed. Current success keeps valid focus without a later focus transfer that could override navigation elsewhere. No Critical findings or other concrete defects were reported.
- Focused recovery/focus/inspector/location tests passed (24 tests in 4 files), and discovery plus recovery tests passed after the final visible scope labels (13 tests in 2 files).
- Final full UI suite: `npm test -w @jentic/arazzo-ui` passed, 593 tests across 93 files, zero failures after final source edits and the card event/callback regression.
- `npm run typescript:check-types -w @jentic/arazzo-ui`: passed after final source edits.
- `npm run build -w @jentic/arazzo-ui`: passed after final source edits (UMD, ESM, declarations and deployable app). Existing large-chunk build advisories remain.
- `npm run test:declarations -w @jentic/arazzo-ui` and `npm run test:package:built -w @jentic/arazzo-ui`: passed against that build, including advertised-range packed consumers. Existing consumer diagnostics are not renderer errors.
- ESLint on changed presentation components/helpers and focused tests: passed, zero errors/warnings after removing obsolete lazy-render bookkeeping. The added card callback regression also passes.
- Strict OpenSpec validation and whitespace check: passed; final task-tracking checks are recorded at completion.

Private reading helpers and MermaidDiagram do not appear in either public entry declaration. The source-binding working-tree changes and archived artifacts present at the start were retained. No archive, main-spec sync, commit, push or publication was performed for this slice.

## Requirement-to-evidence mapping

Test paths are relative to `packages/jentic-arazzo-ui/test/`. Focused assertions test behavior and compatibility; browser captures establish the rendered observations below, not human comprehension or execution support.

| Requirement/scenario                                                        | Evidence                                                                                                                                                                    | Result                                                             |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Layout/Reading view hierarchy and pressed state                             | `reading-discovery.test.tsx`: visible and accessible scope labels, active buttons, legacy callback values                                                                   | PASS                                                               |
| First sequence discovery and host acceptance                                | `reading-discovery.test.tsx`: one docs request, no premature pane/subview, no duplicate callback, retained split                                                            | PASS                                                               |
| Request cancelled on unrelated workflow/document replacement                | `reading-discovery.test.tsx` replacement tests                                                                                                                              | PASS                                                               |
| Overview has relationships without invented sequence                        | `reading-discovery.test.tsx` overview selection and classified relationship filters                                                                                         | PASS                                                               |
| Existing docs/sequence links restore exact occurrence                       | `location-ui.test.tsx`, `location-standalone.test.tsx`: fresh-session occurrence, caller path, controlled values/history ownership                                          | PASS                                                               |
| Missing/duplicate/long authored summary with exact IDs                      | `reading-labels.test.tsx`, navigation/overview assertions; long-label captures                                                                                              | PASS                                                               |
| findAvailablePets vs findPetsByStatus, exact qualification and async intent | `reading-labels.test.tsx`: qualified operation title/details; selected 1.1 send/receive direction                                                                           | PASS                                                               |
| Generated participant IDs hidden, unknown destinations stay distinct        | `reading-labels.test.tsx`, `reading-sequence.test.tsx`, `sequence-model.test.ts`, `sequence-ui.test.tsx`                                                                    | PASS                                                               |
| Repeated calls/actions retain scoped ownership                              | `reading-sequence.test.tsx`, `sequence-ui.test.tsx`: distinct names, paths, expansion and exact detail selection                                                            | PASS                                                               |
| Header detail action, nodrag, event propagation/public callbacks            | `workflow-flow-card.test.tsx`: header placement, stops parent activation, one exact owner/node callback; browser Enter/Escape                                               | PASS                                                               |
| Consistent controls, focus, narrow dialog and fallback                      | `reading-focus.test.tsx`, `reading-inspector.test.tsx`, captures across three detail origins; 32px action targets, hover/focus/disabled CSS and disabled loading assertions | PASS                                                               |
| Known API unchecked, operation found does not mean valid                    | `contract-panel.test.tsx`, `petstore-source-binding.test.ts`: retained source identity, explicit load, validity disclaimer and technical details                            | PASS                                                               |
| Missing/partial/loading/duplicate/unsupported/denied/no provider            | `contract-panel.test.tsx`, `resolution-status.test.tsx`: reader messages, separate technical codes, Retry and unavailable-viewer help                                       | PASS                                                               |
| Localized flowchart rejection and successful retry                          | `diagram-render-recovery.test.tsx`: visible failure, technical disclosure, error retained while loading, current success                                                    | PASS                                                               |
| Read exact step descriptions without clearing selection                     | `diagram-render-recovery.test.tsx`: correct subview, retained inspector and focus on Step descriptions                                                                      | PASS                                                               |
| Obsolete render/retry cannot overwrite replacement                          | `diagram-render-recovery.test.tsx`: both late SVG and late rejection; replaced retry/source                                                                                 | PASS                                                               |
| Valid focus after retry and detail dismissal/view switching                 | `diagram-render-recovery.test.tsx`, `reading-focus.test.tsx`, `location-ui.test.tsx`                                                                                        | PASS                                                               |
| Desktop/narrow cards, descriptions and sequence labels/actions              | 24 production-build captures, including two fixtures at 1440 and 480; measurements and exact selection/focus assertions in capture runner                                   | PASS for scoped controls; flowchart readability remains FAIL below |
| Built API/declaration compatibility                                         | full UI suite, type check, production builds, built declaration/package consumers                                                                                           | PASS                                                               |

## Production browser and visual findings

Reproduce captures after building with:

```sh
source "$HOME/.nvm/nvm.sh" && nvm use
node openspec/changes/simplify-workflow-reading-controls/verification/capture.mjs
```

The runner serves the built standalone assets locally, uses unchanged Petstore plus a long-summary/long-step fixture, and records six views per fixture/width: descriptions, description controls, cards, sequence canvas, ordered sequence controls, and flowchart. All 24 document/body widths equal their viewport (1440 or 480); no page-wide overflow or browser errors occurred. Diagram zoom controls change the contained viewport; the narrow sequence scrolls horizontally inside its canvas. Header identity and action bounds do not overlap. Enter opens the exact owner from card, descriptions and sequence; Escape returns to that origin. Narrow details cover the background with `aria-modal` and inert workflow navigation.

Visually inspected desktop and narrow captures confirm readable card identities with compact header actions, wrapped long detail buttons, visible focus rings and readable sequence list identities. Long summaries require contained vertical scrolling to reach the representation group; unbroken Markdown step/locator text may require horizontal scrolling inside the reading pane. Full identities remain available in focused labels, native workflow option names and details. These observations do not claim that every broader reading/layout concern is resolved.

Representative captures:

- [1440px long step card](captures/long-1440-cards.png)
- [480px long description controls](captures/long-480-description-controls.png)
- [480px sequence context and participants](captures/long-480-sequence-canvas.png)
- [480px Petstore sequence controls](captures/petstore-480-sequence.png)
- [480px Petstore flowchart](captures/petstore-480-flowchart.png)

### Unresolved visual failure carried to the final gate

**F1-flowchart-readability — FAIL; owner: `gate-workflow-ux-regressions`.** Mermaid's existing fit-to-width display scales labels below the 12px reading size used by the current cards: Petstore approximately 9.51px at 1440 and 2.96px at 480; the long-label fixture approximately 9.60px at 480. Visual inspection confirms the small-text problem. SVG rendering itself succeeds; these are readability failures, not recovery failures. The capture JSON preserves each as `state: "FAIL"`. New labels, scoped controls and render recovery do not fix this scaling behavior, and this slice does not claim final flowchart UX acceptance or silently waive the final gate.

The independent reviewer declined visual acceptance until these captures existed; this section supplies the current evidence. Source-binding semantics were verified as a prerequisite, broader navigation redesign is excluded by design, and final completion bookkeeping is handled here. The combined-series packaged/browser acceptance and human-comprehension work remain with the final gate; no human-comprehension sessions were conducted.

## Approved F1 correction and current verification (2026-10-09)

This change was reopened with user authorization to correct flowchart scaling
before resuming the final gate. The earlier FAIL above remains historic evidence;
its ownership is corrected to this reading-control repair.

Permanent `production.spec.ts` tests first failed for Petstore's 9.506/2.964px
labels, narrow long-label scaling and the non-tab-reachable region. The correction
retains the generated SVG viewBox width inside a focusable contained scroll region.
No samples, public modes, locators or Mermaid rendering generations were changed.

Fresh normal `npm run test:browser -w @jentic/arazzo-ui` passed all 18 tests
including default and long-label flowcharts at 1440 and 480, label-size checks,
keyboard scrolling when content exceeds the pane and no page-wide overflow.
It rebuilt both entries/declarations and passed installed package acceptance.
The saved RED results remain under ignored
`test-output/browser/gate-prerequisites/flowchart-red-results`. The old guide
disclosure selector was corrected to its direct summary; its nested format
summary previously caused an ambiguous locator, with a consequential request-count
failure. Normal acquisition assertions pass after that selector correction.

Current UI suite: 601 tests in 94 files passed. Focused rendering/focus: 11 tests
passed. UI type check, declaration consumers and ESLint on the changed source and
browser test passed after rebuilding. A transient type-check run overlapped a
build cleaning declaration output; it was rerun sequentially after build and
passed. Full commands/results are in `gate-prerequisites/flowchart-green.log`,
`ui-suite.log` and `flowchart-current.log`. All use `.nvmrc` Node 26.3.1.

Independent current-build measurements show minimum labels 15.9999px at both
widths, scale 0.999994; no page errors. Current captures were inspected and confirm
readable intrinsic-size content with horizontal navigation rather than a tiny
whole-graph thumbnail. Build JS SHA-256:
`d72ff288c8af96ac1142dd0d756db896bbb9f34854e2e03a13405147bfa96768`.
Complete build digests, request logs and measurements are in
`packages/jentic-arazzo-ui/test-output/browser/gate-prerequisites/flowchart-observations.json`.
F1 is corrected on this candidate. Final full-matrix/human acceptance still belongs
to `gate-workflow-ux-regressions`. No rearchive, main-spec sync or Git publication
was performed.

## Source-loading focus correction under integrated gate task 6.2

The final gate reproduced focus loss at 1440 and 480: disabling the focused
API-description button moves focus to body, Escape cannot close the inspector,
and narrow background remains inert. `gate-prerequisites/source-focus.json`
records this failure and two captures preserve it. The permanent component
regression failed before correction (`source-focus-red.log`) and passed afterward,
including a pending result completing after focus moved elsewhere.

ContractPanel now focuses its stable named Source region before starting load
only when the activating button owns focus. This preserves current context while
the button is disabled and introduces no asynchronous focus reassignment. The
region has a scoped visible focus cue. Existing authority, callbacks, statuses
and acquisition logic remain unchanged. An independent read-only follow-up found
no Important/Critical issue in this correction. Current root build, declarations,
lint, 610 UI tests within passing monorepo tests, and all type checks passed.
Actual browser lookup/reload/Escape verification remains in the currently running
final integrated gate; this section does not claim its result before completion.

### Final current focus and correction result

Normal integrated production browser passed 162/162 at both widths, including
all F1 and source-focus cases. The independent current probe records Source
petstoreAPI focused after load, Escape closing the inspector and returning to
the exact loginUser row, with narrow inert removed. Every named negative control
and normal control passed their wrapper criteria. Current root engineering gates
are green. Both corrective sections are complete, 17/17 tasks; final UX readiness
remains pending real reader sessions in the final gate.

The reopened delta headers were reconciled with the already-synced main baseline:
existing requirements are MODIFIED and the new contained-flowchart requirement
is ADDED. Strict validation now passes without the duplicate-ADDED archive
advisory. Main specs were not changed by this reconciliation.
