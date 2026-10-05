# Independent verification: visualize-chained-workflows

Reviewed 2026-10-05 at `73799de`, against pre-implementation commit `e3c9a5d`.

**Resolution update, 2026-10-05:** W1–W5 have targeted fixes and permanent regression tests in the working tree. S1 has compact labels and accessible relationship inspection; S2 has an upstream preparation plan below. The original review is retained as historical evidence. See the resolution section and refreshed `verification.md` for current checks.

**Assessment: the architecture is defensible, but I would fix the five warnings below before upstream review.** There is no evidence here that the feature needs a wholesale redesign. There is evidence that the claimed shared semantics are incomplete, and that the broad presentation rewrite introduced a regression.

This report supplements `verification.md`; it does not replace the earlier evidence or mark tasks incomplete automatically. No implementation files were changed during this review.

## Scorecard

| Dimension | Result |
| --- | --- |
| Completeness | 37/37 tasks checked; implementations found for all 16 requirement areas; 75 scenarios inventoried |
| Correctness | Existing 136 tests pass; six additional expected-behavior assertions fail across five findings |
| Coherence | Overall separation follows the design; duplicated reusable expansion and renderer-specific return semantics undermine consistency |
| Critical issues | None identified: no wholly absent requirement or unchecked task |
| Warnings | Five actionable findings, grouped by review axis below |
| Suggestions | Two contribution/readability improvements |

The task count is not proof that every promise in each task is satisfied. In particular, tasks 3.4, 5.4, 7.3 and 8.1/8.4 need follow-up verification after the fixes.

## Standards and architectural coherence

### W1 — Action step targets can escape the owning workflow

Location: `packages/jentic-arazzo-ui/src/utils/inspection/facts.ts:251-256`; target classification in `src/utils/inspection/targets.ts`.

An action in workflow `a` with `stepId: "$workflows.b.steps.y"` is marked resolved and navigable to `b.y`, with no diagnostic. The viewer model then emits an overview action relationship from `a` to `b`. The role-aware classifier is receiving the role but does not enforce this ownership restriction.

Design decision 5 (`design.md:92`) limits action step IDs to the owning workflow. Cross-workflow step prerequisites are a separate supported concept. Both [Arazzo 1.0.1](https://spec.openapis.org/arazzo/v1.0.1.html#success-action-object) and [Arazzo 1.1.0](https://spec.openapis.org/arazzo/v1.1.0.html#success-action-object) require action step targets to belong to the current workflow.

**Fix:** enforce ownership and accepted reference grammar for action-step occurrences in the inspection classifier. Preserve the authored object with a non-navigable diagnostic; do not create a relationship for unsupported cross-workflow action-step syntax. Add paired tests proving that cross-workflow prerequisites still work and action-step destinations cannot use that path.

### W2 — Inspection re-expands reusable values and discards restored occurrence fields

Location: `packages/jentic-arazzo-ui/src/utils/inspection/facts.ts:114-123,135-136,190-195`; `src/utils/documentation/docGenerator.ts:115`.

The loader deliberately preserves occurrence fields in its restored native projection. Inspection then sees the original `reference`, looks up the authored component again, and applies only a `value` override. This duplicates expansion policy and produces a different effective projection.

Reproduction: define component parameter `{name: "p", value: "default", "x-definition": true}` and use `{reference: "$components.parameters.p", value: 0, "x-use": "keep", futureField: false}`. After a real `loadDocument` call with a base URI, the restored parameter retains all fields. Its inspected `ParameterFact.value` loses `x-use` and `futureField`. Documentation replaces restored parameters with these effective values. The same pattern affects reusable actions.

**This is not complete document data loss:** `getDocument()` and authored/raw details preserve the fields. It is an inconsistent projection and an architectural maintenance problem, contradicting the design's lossless projection and authoritative native-resolution approach.

**Fix:** consume restored supported occurrences as effective values, using authored occurrences for provenance. Keep local inspection expansion for genuinely unsupported generic fields and explicit expansion-bypass cases. Share lossless occurrence merging where both paths require it. Verify native export, inspection facts, documentation projection, and original input separately.

No additional hard architectural violation was found in `CONTRIBUTING.md`. These two warnings concern explicit design contracts; the duplicated-expansion observation is also a maintainability judgment, not a claim that the repository mandates a particular class or functional style.

## Specification and behavioral correctness

### W3 — Retry return behavior differs between interactive and Mermaid diagrams

Location: `packages/jentic-arazzo-ui/src/utils/conversion/arazzoToFlow.ts:214-224`; compare `src/utils/documentation/mermaidFlowchartGenerator.ts:124-125`.

The interactive converter adds a retry return only for `local-workflow`. Two understood cases consequently lose it:

- `retry.workflowId: "$sourceDescriptions.remote.recover"` with a declared Arazzo source: an outbound retry is present, but no return to the source step.
- `retry.stepId: "repair"` within the current workflow: the edge to `repair` is present, but no return from `repair` to the failed step.

Mermaid creates the return in both cases. External workflow calls have the analogous local-only return restriction at `arazzoToFlow.ts:153`.

This conflicts with `spec.md:131` (consistent semantics), `design.md:126` (retry returns to the source step), and the [Arazzo failure-action semantics](https://spec.openapis.org/arazzo/v1.1.0.html#failure-action-object).

**Fix:** derive transfer/return semantics once from understood call/goto/retry facts and let both renderers project them. Cover local workflow, external workflow, another local step, self retry, and one-way goto. External targets must remain non-navigable and unfetched.

### W4 — Mermaid flowcharts omit step parameters, including querystring values

Location: `packages/jentic-arazzo-ui/src/utils/documentation/mermaidFlowchartGenerator.ts:69-85`.

A step parameter `{name: "query", in: "querystring", value: "q={$inputs.q}&literal=a%26b&empty="}` disappears entirely from the flowchart. Step labels read only locators and async metadata. Action parameters are included elsewhere, but ordinary step parameters are never consumed.

`spec.md:53-55` explicitly requires every view to preserve the querystring location and complete authored value. The existing querystring documentation assertions and browser check do not establish that the Mermaid flowchart retains it.

**Fix:** render shared step parameter facts in flowchart labels or attached notes, retaining location, full values, and unresolved content with Mermaid escaping. Test the resulting syntax with Mermaid and assert retained values; a parser-only assertion cannot detect omitted data.

### W5 — Existing document description CommonMark rendering regresses

Location: `packages/jentic-arazzo-ui/src/utils/documentation/markdownFormatter.ts:102-103`.

Previously the document description was emitted as Markdown. It is now escaped and wrapped inside an HTML paragraph, which the Markdown parser treats as an HTML block. With `info.description: "See [API docs](https://example.test) and **important** details."`, the real ReactMarkdown/rehypeRaw pipeline renders literal link and emphasis syntax. The baseline renders an anchor and strong text.

This is a compatibility regression caused by the formatter rewrite, rather than a missing new OpenSpec scenario. CommonMark is allowed for descriptions in the [Arazzo Info Object](https://spec.openapis.org/arazzo/v1.1.0.html#info-object).

**Fix:** preserve a safe Markdown rendering path for authored rich descriptions while continuing to escape identifiers, generated HTML attributes, and raw data. Add a rendered-document regression using a link, emphasis and multiline content. Do not solve this by removing escaping indiscriminately.

## Architecture assessment

The chosen architecture has concrete justification:

- A private version-selection facade fits the existing runner's version-specific normalization pattern without importing runner execution into the browser.
- Separating inspection facts from the explicitly labeled action display policy prevents accidental claims of runner parity.
- Isolating native recovery in the loader is materially safer than catch-and-return after partial mutation. Native snapshots and sidecar diagnostics avoid contaminating exports.
- Workflow/step-scoped identities and full pending destinations address real collisions and asynchronous navigation, rather than hypothetical extensibility.
- Separate prerequisite-only cycle detection and full-graph SCC layout preserve meaningful distinctions. The actual browser fixtures retain cards, parallel routes and self-loops.
- The package-local Vitest choice is justified by React/TSX/CSS testing and leaves the other package test runners unchanged. Rolled public declarations do not expose snapshot/profile/model/recovery types.

The key correction is to finish centralizing semantics. W2 shows effective-value interpretation split between loading and inspection. W3 shows transition semantics split between renderers. Small, private corrections at those seams are preferable to adding a public plugin platform or moving viewer policy into the runner.

| Design acceptance criterion | Assessment |
| --- | --- |
| Parser/resolver/validator/runner/viewer responsibilities distinct | Mostly followed; W2 duplicates part of resolver work |
| Native context and authored content survive projection | Native export passes; effective projection caveat W2 |
| Specification facts separate from display ordering | Followed |
| No required HTTP operation shape | Followed; metadata is retained without source expansion |
| Unsupported semantics visible without guessed edges | Incomplete: W1 invents an unsupported cross-workflow action-step transition |
| New profile can supply known facts to unchanged consumers | Existing private synthetic-profile tests pass; this is not future-spec certification |

## Requirement and scenario accounting

All 16 areas have implementation evidence. This table identifies coverage locations and the limits discovered by review; it does not claim exhaustive input-space proof.

| Requirement area | Main verification evidence | Review result |
| --- | --- | --- |
| Versioned inspection/capabilities | inspection, loader, component-loading, documentation tests | Existing scenarios pass |
| Transport-neutral inspection | inspection, workflow-flow-card, documentation tests; async browser fixture | W4: flowchart querystring omission |
| Unknown content/provenance | loader, inspection, model, documentation tests | W2: effective projection divergence |
| Overview/navigation compatibility | navigation, graph-overview tests; browser tabs | Existing scenarios pass |
| Deterministic loading/preservation | loader, loading-cancellation, component-loading tests | Native recovery cases pass |
| Consistent semantics/scoped identities | model, workflow-flow, navigation, docs-ownership tests | W3: renderer return mismatch |
| Action precedence/channel separation | model, workflow-flow-card, documentation tests | Existing scenarios pass |
| Reusable action parameter overrides | inspection, model, loader, documentation tests | Falsy/structured overrides pass; W2 applies to opaque occurrence fields |
| Complete document graph | model, graph-overview, graph-edges tests | Existing scenarios pass; W1 adds an unsupported edge |
| Cycles/readable layout | graph-layout, graph-edges tests; dense browser fixture | Existing assertions pass; readability suggestion below |
| Step prerequisites/authored order | inspection, workflow-flow, documentation tests; browser paths | Existing scenarios pass |
| Classified navigation | inspection, model, navigation tests | W1: occurrence role does not constrain action ownership sufficiently |
| Destination-aware focus | navigation, injected-navigation, diagram-focus tests; browser focus | Existing scenarios pass |
| Documentation prerequisites/ownership | docs-ownership, documentation, workflow-flow-card tests | Existing scenarios pass; W5 is an additional baseline regression |
| Mermaid relationship semantics | documentation, workflow-flow-return-paths tests | Mermaid returns work; interactive parity and parameter detail gaps W3/W4 |
| Mermaid inspection sequence | documentation tests; real rendered sequence browser fixture | Existing scenarios pass |

The existing 75-scenario mapping is useful, but its file-level associations overstate what individual assertions prove. Add the missing combinations above to named tests and update `verification.md` after fixes. Its statements that no important findings or required work remain should not be treated as current approval.

## Suggestions

1. **Improve dense overview readability before demonstrating it upstream.** The fresh `dense-cyclic-overview.png` shows overlapping edge-label text and paths passing behind unrelated cards. Existing tests prove distinct paths and disjoint card bounds, not readable labels or unobstructed routing. The earlier report acknowledges this limit. In `src/edges/RelationshipEdge.tsx` and `src/utils/model/graphLayout.ts`, reserve routing corridors and separate label anchors, or expose compact labels with an accessible selected-edge detail view. This is a presentation improvement, not a demand for optimal graph layout.
2. **Prepare a narrower contribution history.** `CONTRIBUTING.md` asks for logical atomic commits and feature discussion before a PR. The implementation is one large commit spanning semantics, rendering and test infrastructure. Present separable changes and explain which visual replacements are necessary for this feature; preserve unrelated baseline behavior such as W5. This review did not check whether an upstream feature discussion already exists.

## Fresh verification and limits

Using Node 26.3.1 from `.nvmrc`:

- `npm test -w @jentic/arazzo-ui`: 20 files, 136 tests passed; no skipped tests reported.
- `npm run typescript:check-types -w @jentic/arazzo-ui`: passed.
- `npm run lint -w @jentic/arazzo-ui`: zero errors, 36 warnings.
- `npm run build -w @jentic/arazzo-ui`: both ESM/UMD entries, both declaration bundles, CSS and standalone app built.
- `openspec validate visualize-chained-workflows --strict`: passed.
- `git diff --check`: passed before adding this report.

The existing built-app smoke script was copied to `/tmp` with only import/root/evidence paths adjusted to avoid overwriting checked-in evidence. All 14 observations passed, with fresh screenshots and observations in `/tmp/arazzo-verify-browser-evidence`. The dense overview screenshot was also inspected visually. This is one Chromium viewport, not a cross-browser or accessibility audit.

Additional temporary tests in `/tmp/arazzo-review.test.ts` produced **six failed expected-behavior assertions**: external retry return, local-step retry return, flowchart querystring retention, CommonMark rendering, action-step ownership, and effective reusable field preservation. These are diagnostic probes, not committed regression tests. The native-resolution preservation probe first verifies that the restored document is correct, then fails on the inspection projection. No production fixes were made.

No parser/resolver/runner/validator source changes were found in the implementation diff. Their test suites were not rerun. No claim is made about maintainer acceptance, full standards conformance, or exhaustive correctness.

**Final assessment:** no critical completeness issue; five warnings remain. The architecture is worth retaining, but the change should receive the targeted fixes and another verification pass before being presented as ready for upstream acceptance.


## Resolution and follow-up evidence — 2026-10-05

The fixes preserve the private inspection/model boundary and existing callback/public type contracts. No parser, resolver, runner or validator source was changed.

| Finding | Resolution | Named verification |
| --- | --- | --- |
| W1: action-step ownership | Classifier rejects action-step destinations outside the owner, including external-step syntax. Authored objects retain diagnostics and produce no action relationship. Cross-workflow prerequisites remain supported. | `verification-review.test.tsx`: “W1: action-step targets remain in their owner while prerequisites cross workflows” for both 1.0.1 and 1.1.0; existing role/dotted-identity inspection tests. |
| W2: effective reusable projection | Inspection consumes restored native occurrences, using authored references for provenance. References remaining in generic fields or bypassed/supplied snapshots expand locally. Loading and generic expansion share `reusableOccurrenceFields`, preserving opaque own fields and property-presence overrides. | “W2: lossless reusable occurrence fields survive … inspection and documentation” for native, bypassed and supplied snapshots checks native export, native/effective equality, declaration/use fields, nested generic parameters, documentation and unchanged input separately. |
| W3: return parity | Private `transferSemantics` supplies understood destinations and return behavior to both renderers. Recovery returns to the source step, calls return to the next step, self retry uses its loop, and goto has no return. Local-step returns use the real `sequential` handle; external workflow returns use `return` and remain non-navigable/unfetched. | Six “W3: interactive and Mermaid retry return parity” cases; local/external “call returns to the next step and goto remains one-way” cases; real final layout/edge tests and built-browser return checks. |
| W4: flowchart step parameters | Non-directional parameter notes consume shared facts with full JSON values, status, location and unresolved authored detail, using Mermaid label escaping. | “W4: Mermaid retains complete querystring, structured/falsy and unresolved step parameters” asserts content and installed-parser acceptance; built-browser flowchart SVG retains the complete querystring. |
| W5: CommonMark regression | Document description Markdown is emitted outside generated HTML blocks. A CommonMark parser identifies only raw HTML source spans for escaping; autolinks, inline/fenced code and other authored Markdown retain their meaning. Existing identifier/attribute/data escaping remains. The already-installed `unified` and `remark-parse` versions are now direct dependencies. | Both W5 rendered-document regressions cover links, emphasis, paragraphs, unsafe HTML, autolinks and angle-bracket code; built-browser rendering checks the same forms. |
| S1: dense overview readability | Compact numbered labels replace long edge text; reciprocal/self-loop lane anchors are separated. A native selector and selected-edge region expose complete labels, source/destination, warnings, parameters and criteria. Full labels remain in SVG titles and accessible edge names. | `graph-edges.test.tsx` compact-label/anchor regressions; `diagram-focus.test.tsx` selected-detail/clear regression; browser keyboard-accessible selection and fresh screenshots. |
| S2: contribution preparation | Logical split and upstream discussion requirements recorded below. Existing history is intact. | Contribution plan below; no claim that an upstream discussion exists or that maintainers have approved the feature. |

New regression assertions were observed failing before their corresponding production fixes. The initial focused run reproduced ten failing cases across W1–W5; additional failing regressions covered compact labels, selected relationship details, lane anchors and CommonMark autolinks/code. Independent read-only follow-up review found no substantive remaining issues in W1–W5/S1 after the parser-aware CommonMark correction.

### Contribution preparation

Before opening an upstream feature PR, follow `CONTRIBUTING.md` by filing or linking a feature issue and obtaining maintainer feedback. The review did not establish that this has happened.

Prepare a contribution branch with logical, signed-off Conventional Commits in this order:

1. Package-local test harness, fixtures and additive public types.
2. Isolated loading/recovery and private inspection profiles, with preservation tests.
3. Shared viewer policy/model, scoped targets, overview extraction and cycle-safe layout.
4. Workflow diagrams, navigation/focus and owner-aware documentation selection.
5. Documentation and Mermaid consumers, including return/parameter parity and CommonMark compatibility.
6. Acceptance tests, browser evidence and OpenSpec verification artifacts.

Keep regression tests alongside the behavior they protect. Explain that overview/card/edge replacements are needed to retain scoped relationships, bounded layouts and authored-order overlays. The present corrective changes can be grouped by W1/W2, W3/W4, W5, and S1/evidence during that preparation. This preparation plan does not rewrite the existing implementation history. The user subsequently requested commit and push of the corrective work; the semantic fixes, overview readability and verification evidence are separate signed-off commits. No PR is created by this step.

### Remaining limits

The smoke test uses one Chromium viewport. Compact labels and selectable detail improve readability, but globally unobstructed routing and cross-browser/accessibility audits remain unproven. The independent follow-up review was limited to these fixes, rather than a new certification of the entire feature or standards conformance. Fresh command results and scenario coverage are recorded in `verification.md`.
