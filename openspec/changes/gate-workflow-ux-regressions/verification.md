# Gate workflow UX regressions: prerequisite verification

Date: 2026-10-09. Current status: **engineering PASS; 16/19 tasks complete; final UX acceptance PENDING actual reader sessions.**
The initial prerequisite pause and failed discoveries below are retained as history. No failure is waived.

## Candidate and fresh checks

The candidate is HEAD `08cfba6f6fbde4c36be11d10575e519ecbe0c07c` on
`feature/visualize-chained-workflows`, plus the pre-existing dirty guide/Systems
implementation and archive/spec changes. Merge base with `origin/main`:
`49dd8ef814637b481c0a1998f586ce2785812f5d`. Before this record was written,
the SHA-256 of `git diff HEAD --binary` was
`ec630c97785aba5df028a4396cb3304ad5f96e0c7544e9c02b9a346357f7c3b4`.
The complete status and untracked-file digests are recorded in
`packages/jentic-arazzo-ui/test-output/browser/gate-prerequisites/candidate.json`.
Those existing changes were retained.

Commands used `source "$HOME/.nvm/nvm.sh" && nvm use` (Node 26.3.1,
npm 11.16.0). Evidence below is from this apply session, not copied results.
Paths under `gate-prerequisites/` refer to the ignored directory above.

| Check | Current result | Evidence |
| --- | --- | --- |
| Focused predecessor checks | Exit 0; 106 tests in 14 files passed | `focused.log`; command below |
| `npm run build -w @jentic/arazzo-ui` | Exit 0; UMD/ESM, declarations and standalone app built | `build.log`; existing chunk advisories |
| `sha256sum packages/jentic-arazzo-ui/public/petstore-order-workflow.arazzo.yaml` | Unchanged: `8bd096d24c2cabd7536dc2feb9cb8b9157ffebbadf931bcc26230de4b1989569` | Same digest independently recorded for built bytes |
| Bare-entry Petstore flowchart at both widths | **Exit 1; readability FAIL at both widths**, no page errors | `reproduce-flowchart.mjs`, `flowchart.log`, `flowchart-observations.json`, two PNG captures |
| `openspec validate gate-workflow-ux-regressions --strict --no-interactive` | Exit 0 | Planning validation only |

Focused command:

```sh
npm test -w @jentic/arazzo-ui -- test/petstore-source-binding.test.ts test/inspection.test.ts test/step-operation.test.ts test/sequence-destination.test.ts test/sequence-source-freshness.test.tsx test/reading-discovery.test.tsx test/reading-labels.test.tsx test/reading-focus.test.tsx test/diagram-render-recovery.test.tsx test/guide-discovery.test.tsx test/optional-tools.test.tsx test/scenario-standalone.test.tsx test/location-standalone.test.tsx test/system-ui.test.tsx
node packages/jentic-arazzo-ui/test-output/browser/gate-prerequisites/reproduce-flowchart.mjs
```

The reproduction serves the newly built assets locally, opens `/` without
document/guide/profile parameters, selects Flowchart through its visible
control, records requests, errors, artifact digests and displayed label sizes,
and exits nonzero for labels below the predecessor's 12px reading threshold.
Both captures were visually inspected; narrow flowchart text is tiny.

## Predecessor requirement and task references

References are under `openspec/changes/archive/2026-10-09-<name>/`.
All three archived task files have checked implementation tasks; current
focused checks above establish their tested behavior on this candidate,
but the explicit visual failure prevents the prerequisite from passing.

| Predecessor | Requirement references | Task references | Fresh coverage |
| --- | --- | --- | --- |
| `restore-workflow-source-binding` | Current operation evidence informs sequence destinations; Transport-Neutral Operation Inspection; Mermaid Inspection Sequence | 1.1–1.3, 2.1–2.4, 3.1 | Petstore binding, inspection, step operation, sequence destination and source freshness |
| `simplify-workflow-reading-controls` | Reader-facing layout and representation hierarchy; Meaningful workflow and interaction labels; Consistent compact detail controls; Localized diagram rendering recovery | 1.2–1.3, 2.1–2.4, 3.2–3.3, 4.2 | Discovery, labels, focus and render recovery; fresh flowchart readability **FAIL** |
| `explain-guides-and-system-perspectives` | Benefit-first guided walkthrough discovery; Recoverable guide setup states; Explained system-view availability; Optional tools use progressive disclosure | 1.2–1.5, 2.1–2.2, 3.1–3.3 | Guide discovery, optional tools, scenario/standalone location and Systems UI |

## Blocker: F1-flowchart-readability and conflicting ownership

The reading-control predecessor's `verification.md` explicitly records
`F1-flowchart-readability` as FAIL and assigns its correction to this gate.
This gate's proposal/design instead require all predecessors checked before
acceptance and require product defects to return to their owning repair.
Task 1.1 therefore cannot be marked complete without resolving that conflict.

Fresh measurements on the identified production build:

| Viewport | Intrinsic SVG width | Displayed width | Scale | Smallest displayed label | Result |
| --- | --- | --- | --- | --- | --- |
| 1440px | 2191.325px | 1302px | 0.594154 | 9.50646px | FAIL |
| 480px | 2191.325px | 406px | 0.185273 | 2.96437px | FAIL |

The SVG renders successfully. `DocsView.tsx` constrains `.mermaid-rendered svg`
to `max-width: 100%` and `height: auto`; its displayed transform shrinks the
16px labels below the existing 12px threshold. Passing render-recovery tests
and zero browser errors do not establish readability.

Proposed routing: update the owning reading-control repair to cover readable
flowchart scaling with contained navigation and permanent targeted regression
coverage, correct it, and rerun current prerequisite checks before proceeding
with this gate. This is a proposed artifact/scope decision, not an implemented
repair or permission to lower the threshold. The invoked apply skill requires
pausing when implementation reveals a design issue or requires additional scope.

## Outstanding validation

All 19 tasks remain unchecked. Inventory, strengthened maintained acceptance,
negative controls, CI integration, full engineering gates, full visual matrix,
consented unfamiliar API Owner/Developer sessions and final closure have not
been performed by this apply session. The diagnostic script is a prerequisite
reproduction in ignored output, not the maintained gate required by this change.
Final acceptance remains pending; archived completion checkboxes do not waive
the reproduced failure.

## Resumption after authorized F1 repair (2026-10-09)

The user approved routing and correcting the failure in the reading-control
repair. `simplify-workflow-reading-controls` is now reopened under
`openspec/changes/`, with the original artifacts/captures retained and three
additional corrective tasks verified (15/15). Its verification record contains
RED/GREEN browser evidence and current UI/type/declaration/package checks.
Fresh current production acceptance passed 18/18 tests. F1's minimum displayed
labels are now 15.9999px at both widths. No failure was waived.
Task 1.1 can now pass; this supersedes the pause state above and begins the
remaining acceptance work. Reader sessions are still outstanding; the user has
confirmed they can arrange both roles. The initial failed evidence remains above.

## Expanded gate implementation and first integrated result

Current task progress is 4/19: prerequisites, inventory, input identity and the
newcomer protocol are complete. The maintained browser configuration now includes
`production.spec.ts` and `workflow-ux.spec.ts`: 162 cases across two widths.
All ten roots have a seven-state layout/representation matrix; all 46 workflows
have pinned authored step/source/call identities. The inventory also pins direct
prerequisites and effective named actions, including Petstore's inherited failure
actions. Browser assertions compare visible root-scoped locators, API endpoints,
send/receive direction, transfers and prerequisite owners with these literals.

The first integrated run ended with 132 passes and 30 failures. Its report/captures
are preserved under `gate-prerequisites/positive-first.json` and
`positive-first-results`; its command log is `positive.log`. Failures remain
failures. Diagnosed harness assumptions were graph fit scaling of CSS button
height, querying inaccessible background roles during narrow modal inspection,
looking for standalone guide errors inside the embedded viewer pane, assuming
development-only Systems URL setup in the built app, and skipping the close-details
history entry when navigating Back. These checks have been corrected while
retaining their expectations. Graph overview and finite zoomed detail captures
are kept separate. Configured Systems and mismatch recovery use explicit public
props in the installed ESM host.

Independent review identified important evidence defects: a negative report
with the expected assertion plus an unrelated crash could pass; and old passing
summary files could survive a new failed run. Both were reproduced by focused
regressions before correction. Negative validation now requires exact case and
desktop/mobile coverage with one named error, and run summaries start running,
record failure and bind passing results to input/build identity. Final byte
identity is verified after browser execution. Review also prompted every-root
flowchart font measurement and exact per-row endpoint/action/prerequisite checks.
The reviewer reported these concrete findings but hit a tool usage limit before
finishing its overall verdict; no completed independent approval is claimed.

The current follow-up production command is running and will determine whether
the strengthened matrix passes. `coverage.json` is running/failed/passed for the
current run; old summaries cannot serve as evidence for a changed candidate.
Root build, declarations, lint, monorepo tests and types were freshly run with
exit 0; per-command logs/exit codes are in `gate-prerequisites/engineering-commands.json`.
Subsequent assertion corrections will receive current type/lint and affected
regression/browser checks before completion.

`acceptance-protocol.md`, `human-results.md` and `scripts/start-ux-reader.mjs`
prepare the real reader sessions. The protocol was checked for bare-entry starts,
both roles/widths, consent, explicit assistance/incorrect interpretation records
and critical-task unassisted criteria. Reader results remain PENDING.

## Integration discoveries and corrections retained

The strengthened semantic run passed 158/162 cases, with all root matrices and
all 46 workflow sequences at both widths passing. It exposed real source-loading
focus loss and an overly strict fresh-session origin expectation. Its report and
HTML captures are preserved as `gate-prerequisites/positive-semantic.json` and
`positive-semantic-report`. `source-focus.json` independently reproduces the
product failure: both widths focus body after explicit API loading, Escape leaves
the inspector open, and narrow background remains inert. This regression is
routed through gate task 6.2 to the reopened reading-control repair, section 6.

`ContractPanel` now focuses its stable named Source region before disabling the
focused loading control; it never restores focus on asynchronous completion.
The permanent component regression first failed, then passed, including no late
focus theft. The maintained browser case verifies repeated lookup/reload and
Escape back to its exact live origin. Fresh-session shared details instead verify
the existing valid workflow-navigation fallback because no live origin exists.
Clipboard checks clear a test sentinel, verify actual Copy link output, reopen
that copied URI and inspect second-item 2499 rather than merely reopening page.url.

Transfer checks now assert directed SVG endpoints and applicable retry recovery
arrows against pinned target lanes, in addition to labels/owners. Every current
PNG representation frame is required at the correct viewport width, including
separate project report specs. A validator regression caught and corrected the
previous first-project-only lookup. All cases attach actual browser request,
forbidden-acquisition and error records before final assertions.

An identity-recording run failed before browser execution because binary archive
changes exceeded execFileSync's default stdout buffer. Candidate diff hashing now
streams all Git output through SHA-256, waits for stream closure and never prints
binary content. The failed current run remained failed in coverage.json.

Current root build/declarations/lint/tests/types all pass after the source fix;
`current-engineering-commands.json` records exit 0 for each required root command.
The final positive browser command is now running; neither a successful final
engineering gate nor final UX acceptance is claimed yet.

## Current engineering acceptance and remaining human work

The maintained positive command exited 0 with 162/162 cases passed, zero skipped
required cases, all ten roots across seven representations/layout states at both
widths, and all 46 workflow sequences. The mandatory capture guard verified 140
PNG root-state frames at the correct viewport widths. The five named negative
faults were each caught for exactly their expected assertion at both widths; all
ten normal controls passed. The negative wrapper exited 0. Its intentional
individual test failures are successful detection, not product failures.

Current root build/declarations/lint/monorepo tests/types all exited 0. UI: 610
tests across 97 files passed. The normal production command also freshly built
UMD/ESM/declarations/app, passed generated declaration checks and installed packed
consumers (including advertised-range hosts), and exercised installed ESM host
callbacks, source authority/cancellation and history boundaries. Existing chunk
size and no-explicit-any advisories are recorded; there are no required failures.
CI's existing production-browser-acceptance job runs both commands and retains
the whole current browser output on success or failure. This configuration was
verified locally; no remote CI run, deployment, commit or publication is claimed.

Evidence paths are relative to `packages/jentic-arazzo-ui/test-output/browser/`:

| Current check | Result | Evidence |
| --- | --- | --- |
| Root engineering commands | PASS, each exit 0 | `gate-prerequisites/current-engineering-commands.json` and referenced logs |
| Positive production browser | PASS, exit 0, 162 cases | `positive.json`, `coverage.json`, `report/`, `gate-prerequisites/positive-final.log` |
| Named negative controls | PASS, exit 0, five reasons × two widths | `negative.json`, `negative/*/control.json`, `negative/*/fault.json`, separate control/fault HTML reports and traces, `gate-prerequisites/negative-final.log` |
| Inputs/build bytes after all browser work | PASS | `identity.json`, final `verifyIdentity()` |
| Source focus after explicit loading | PASS, Source region remains focused; Escape closes and returns to exact login row; narrow inert removed | `gate-prerequisites/source-focus-current.json` and current screenshots; permanent component and browser regressions |
| Root visual matrix | Reviewed 140 mandatory states plus 20 initial diagram overviews | `captures.json`, original `captures/` PNGs, 20 `visual-review/` sheets |
| Native long labels and error/empty states | Reviewed current original PNGs | metadata-heavy descriptions at both widths, empty/malformed guide captures, `gate-prerequisites/render-error-current-1440.png` and `-480.png` |
| Actual newcomer critical tasks | PENDING | `human-results.md`, protocol and `scripts/start-ux-reader.mjs` |

Visual observations: scoped card actions do not overlap identities; long controls
wrap with visible focus; view selection is visible; error explanations and
recovery controls are available; flowcharts use readable intrinsic sizing and
contained navigation. Diagram overview and zoomed detail captures are distinct.
Narrow Side by side is vertically constrained and requires contained scrolling;
this is recorded as a usability observation for the critical reader tasks, not
proof of comprehension. Not every supporting after-test screenshot was visually
reviewed: `captures.json` marks the specific reviewed root rows; other screenshots
remain supporting automation evidence. No new blocking visual defect was found
in the reviewed mandatory root matrix. Human success remains unmeasured.

### Discovery-to-requirement/task/evidence matrix

Owner 1 is `restore-workflow-source-binding`; owner 2 is the reopened
`simplify-workflow-reading-controls`; owner 3 is
`explain-guides-and-system-perspectives`; owner 4 is this gate.

| Discovery from design | Requirement and owning task | Current evidence / result |
| --- | --- | --- |
| Petstore source regression; identity versus unchecked operation | Owner 1: Transport-Neutral Operation Inspection, 1.1–1.3; owner 4: Baseline-inclusive inventory, 1.2–1.3 / 2.1 | unchanged pinned SHA, inventory model checks, UX default bare entry and explicit lookup at both widths: PASS |
| Inspector/sequence parity; stale reload | Owner 1: Current operation evidence informs sequence destinations, 2.1–2.3 / 3.1; owner 4: 2.3–2.4 | complete/partial/duplicate/failed lookup, pending reload, obsolete provider/document results, negative stale evidence: PASS |
| Plain step/description/sequence buttons | Owner 2: Consistent compact detail controls, 2.3–2.4 / 3.3; owner 4: 2.2 / 5.2 | every root representation, exact detail owners/focus, finite diagram zoom and native long-label review: PASS |
| Internal participant IDs, generic labels, missing summaries | Owner 2: Meaningful workflow and interaction labels, 2.1–2.2; owner 4: 2.1–2.2 | 46 independent row identities/locators/endpoints, source headings, full option names, current root captures: PASS |
| Layout versus representation confusion | Owner 2: Reader-facing layout and representation hierarchy, 1.2–1.3; owner 4: 2.2 / 2.5 | seven root states per document, selected-state checks, legacy query/hash, actual clipboard/reopen/history: PASS; unfamiliar-reader interpretation PENDING |
| Technical contract states and host-only advice | Owner 2: Reader-oriented contract status and next actions, 3.1; owner 4: 2.3–2.4 | known-before-check, explicit found/missing/ambiguous/failure and denied installed provider: PASS; human C4 explanation PENDING |
| Silent render failure | Owner 2: Localized diagram rendering recovery, 3.2–3.3; owner 4: 3.3 / 4.1 | real rejected rendering, descriptions/retry, obsolete SVG/error, current error captures and exact negative reason: PASS |
| Guide setup jargon and missing purpose | Owner 3: Benefit-first guided walkthrough discovery / Recoverable guide setup states, 1.3–1.5 / 3.1; owner 4: 3.1–3.2 | bare-entry purpose/help/explicit example, zero help-time acquisition, loading/empty/malformed/mismatch/restored unavailable states: PASS; human discovery PENDING |
| Systems availability and return | Owner 3: Explained system-view availability, 2.1–2.2; owner 4: 2.5 / 3.2 | absent help, explicit installed public profile, stale diagnostics and exact occurrence/Systems return: PASS; human interpretation PENDING |
| Default omitted; injected setup mistaken for discovery | Owner 4: Baseline-inclusive inventory / Acceptance gates detect target failures, 1.2 / 2.1–2.2 / 3.1 / 4.1–4.2 | default plus ten-document inventory, 46 workflows, mandatory result/capture guards and missing-discovery fault: PASS |
| Operability mistaken for UX readiness | Owner 4: Final readiness requires current complete evidence, 5.1–5.3 / 6.1–6.2 | current engineering and root visual review PASS; actual two-role sessions and complete evidence/closure PENDING |
| F1 fit-to-width labels | Owner 2: Readable contained flowcharts, 5.1–5.3 | every-root font measurements, default/long graphs and keyboard scrolling at both widths: PASS |
| Disabled source button loses focus and Escape | Owner 2: Focus during explicit loading, 6.1–6.2 | red/green component regression, independent current focus probe and integrated explicit load/reload/Escape: PASS |
| Harness accepts mixed errors/stale summaries/omitted frames | Owner 4: Acceptance gates detect target failures / current complete evidence, 1.3 / 4.1–4.3 | focused negative/coverage/run-state/capture regressions and successful normal positive/negative wrappers: PASS |

Tasks 5.3, 6.1 and 6.2 stay unchecked because consented reader sessions, final
human evidence and any resulting corrections are outstanding. The matrix is
populated but not complete acceptance evidence. The user can arrange both roles;
no session, consent, assistance, timing or unassisted success has been invented.
Final readiness is pending these real results on this identified candidate.

### Exact current candidate identities

- HEAD: `08cfba6f6fbde4c36be11d10575e519ecbe0c07c`.
- Base: `49dd8ef814637b481c0a1998f586ce2785812f5d`.
- Tracked dirty-diff SHA-256 at build: `35f14e68d9bb5921bc406099356c8bb5ae0060091577294e5603bc13282026e1`.
- Input identity SHA-256: `d6e8de6446ea5a2e17877d47b05f1948e38452cc8d3ae75a320696bfaad38b1b`.
- `identity.json` SHA-256: `59f55701a9d4645370b2bd576004348fe2e6864bbe3e79e47643accfd71e16a0`.
- Positive run: `dce9974d-5105-45ce-adf0-fe948b1494e6`. Negative run: `55837597-d16b-48b3-8780-b05bf0bff307`.
- Built at: `2026-10-09T18:48:35.726Z`; runtime `v26.3.1`.

Build/artifact digests are fully enumerated in identity.json (standalone and
installed ESM host). Source/fixture/test/help/CI inputs include untracked authored
files through their byte hashes. Subsequent checkbox/evidence bookkeeping changes
the full Git diff but does not change those tested inputs; final byte identity was
reverified after that bookkeeping. Existing dirty guide/spec/archive changes were
retained. The reading repair remains active and complete; no rearchive or main-spec
sync was performed for this correction.
