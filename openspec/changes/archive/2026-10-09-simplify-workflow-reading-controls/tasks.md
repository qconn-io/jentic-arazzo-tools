## 1. Prerequisite and navigation hierarchy

- [x] 1.1 Confirm restore-workflow-source-binding is implemented and its current focused verification passes; record its candidate identity and verify unchanged Petstore retains two participants before changing presentation.
- [x] 1.2 Implement the design's Layout and Reading view labels/groups in ViewModeControl, DocsView and shared navigation with aria-pressed selection; extend test/reading-discovery.test.tsx to verify scope names, active state, overview behavior and public diagram/docs/split callback values.
- [x] 1.3 Add the direct Sequence diagram action using existing layout callbacks and ViewerSessionContext subview state; verify controlled host acceptance, cancellation on unrelated replacement, no duplicate callback, retained split layout and fresh-session restoration of old docs/sequence links in reading/location tests.

## 2. Identity and detail controls

- [x] 2.1 Add a private reading-label helper and apply readable summary-plus-ID options in WorkflowNavigation/Overview and authored step-plus-operation labels in SequenceView; verify missing/duplicate/long summaries, findAvailablePets versus findPetsByStatus, qualified locators, async intent and repeated scoped identities in focused label tests.
- [x] 2.2 Remove visible generated P IDs from sequence headings and expose localized genuine-uncertainty explanations through details; verify model identities and distinct unknown occurrences remain intact in sequence-model/reading-sequence tests.
- [x] 2.3 Add scoped shared detail-action CSS and move StepNode details into its header; update DocsView and SequenceView actions and verify keyboard activation, hover/focus/disabled states, event propagation, exact owner/occurrence inspection and existing public node-selection callbacks.
- [x] 2.4 Capture current step cards, descriptions and sequence controls at 1440 and 480 pixels including long labels; verify readable identity, visible compact actions, accessible full labels, contained zoom/scroll and no overlap/page-wide overflow, recording findings in verification.md.

## 3. Status language and diagram recovery

- [x] 3.1 Translate ContractPanel/InspectionStatus presentation into the design's reader-oriented messages/actions while preserving technical provenance in labeled details; verify unchecked-known API, located-not-valid, missing, partial, loading, duplicate, unsupported, denied and no-provider states in contract-panel/resolution-status tests.
- [x] 3.2 Implement generation-scoped MermaidDiagram rendering state and Retry diagram/Read step descriptions actions, extracting the private component for testing if needed; add test/diagram-render-recovery.test.tsx and verify rejection is visible, successful retry clears it, and late error/SVG results cannot update a replaced document.
- [x] 3.3 Verify render recovery, view switching and detail dismissal keep exact selection, keyboard focus and valid origin fallback; run reading-focus, reading-inspector and location restoration tests for both nonmodal and covering narrow layouts.

## 4. Slice compatibility and documentation

- [x] 4.1 Update reader instructions in packages/jentic-arazzo-ui/README.md and affected maintained semantic test selectors; run focused component tests, UI type checks and built declaration consumers, verifying old mode/subview values and existing callbacks/links remain compatible.
- [x] 4.2 Record requirement-to-test/capture results in this change's verification.md with current build identity; verify unresolved visual or navigation failures remain failures and are carried to the final gate rather than claimed fixed by changed labels alone.

## 5. Correct F1 before final acceptance

- [x] 5.1 Add permanent production-browser coverage reproducing unreadable default and long-label flowcharts at 1440 and 480; verify the current failure is label scaling rather than SVG rendering.
- [x] 5.2 Preserve intrinsic flowchart sizing in a contained keyboard-accessible scroll region; verify at least 12px displayed labels, keyboard scrolling, no page-wide overflow and current render/recovery/focus behavior.
- [x] 5.3 Run current UI tests/type/build/declaration/package and browser checks, inspect fresh captures, and record the corrected F1 evidence before resuming gate-workflow-ux-regressions.

## 6. Correct source-loading focus found by the integrated gate

- [x] 6.1 Reproduce disabled source-control focus loss, preserve focus in stable source context before loading, and add permanent component/browser coverage for explicit lookup/reload and Escape dismissal without late focus theft.
- [x] 6.2 Run affected current tests and engineering/browser checks and record the corrected focus evidence, retaining failed discovery records.
