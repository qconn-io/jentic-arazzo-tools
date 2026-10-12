# Chained workflow UX repair verification

Date: 2026-10-12. Engineering verification is separate from reader comprehension
and maintainer acceptance. All 13 tasks are complete. The user confirmed that these repairs result from
API Owner/Developer feedback and explicitly closed the human tasks. See the
user-confirmed completion record below for the evidence basis.

## Implementation and scope

- `SequenceView` retains `buildSequence` rows, IDs and authored-step numbering.
  Root prerequisites form an unnumbered prelude; step prerequisites precede the
  owning control; callee prerequisites sit after their specific call boundary.
  Existing annotations and inspection callbacks remain in use.
- Workflow prerequisite inspection uses the selected path's actual local caller
  to show its authored parameters. The second repeated call retains its own
  values; this is not parameter execution or inferred effective input data.
- The formatter emits established numbered `.timeline-dot` and `.timeline-line`
  elements, with no trailing connector after the last step. Timeline content can
  shrink to wrap long headings while the direct detail control remains in `h3`.
- The SVG's unused leading space is reduced by 100 CSS pixels. No initial scroll,
  label scaling, row identity/order/budget or authored fixture changed.
- The inspector observes viewer/panel bounds with `ResizeObserver`; fewer than
  320 remaining CSS pixels means covering. The panel stays inside the viewer
  rather than becoming viewport-fixed. Dialog semantics, focus handling and
  viewer-scoped inert/hidden snapshots follow that state, including live resize.
- Unsupported raw fallback receives the existing public class/style values and
  default width/height, authored JSON, diagnostics and public ref methods.
- Production assertions cover untouched narrow geometry, timeline markers,
  repeated prerequisite order and exact mapping, real 400/1200-pixel installed
  embeds, resize/focus/dismissal, prior accessibility state and profile replacement.
  Counts, target identities, DOM order and bounds prevent vacuous passes; the
  existing seven named negative controls remain relevant. No additional fault
  mechanism or dependency was needed for these direct regression assertions.

## Runtime and commands

Use `source ~/.nvm/nvm.sh && nvm use` from the repository root. Runtime:
Node **26.3.1**, npm **11.16.0**. `.nvmrc` is the selected runtime; the different
root engine declaration is unchanged. Exact stdout/stderr is in
`verification-logs/`. Final command outcomes and build identity are recorded below
after the production pipeline completes.

Focused final command:

```sh
npm test -w @jentic/arazzo-ui -- --run test/reading-sequence.test.tsx test/reading-inspector.test.tsx test/reading-focus.test.tsx test/optional-tools.test.tsx test/scenario-ui.test.tsx
```

This passed 31 tests in five files, exit 0. Root `npm test` passed all five
projects, including 637 UI tests in 99 files; the other packages reported 51,
53, 313 and 56 passing tests. Root `npm run lint` passed with 0 errors and 52
warnings. These warnings are reported rather than described as a warning-free
gate. `git diff --check` and strict validation of this change passed.

The production runner itself performs focused inventory/identity/coverage tests,
parser/resolver ESM builds and declarations, the UI build/declarations, packed
installed consumers (including advertised dependency-range checks), then the
identified standalone and installed-ESM browser suite. Its companion negative
runner verifies unmodified controls before requiring the intended fault assertion.

## Failures preserved and resolved

- Root/step prerequisite ordering, numbered timeline, geometry modality, raw host
  class and nested prerequisite caller mapping each had a failing focused test
  before repair. Their `*-red.log` files and `focused-final.log` preserve the
  evidence. An early raw test used version 9.0.0, which the parser rejects before
  inspection; it was corrected to parseable but unsupported 1.2.0.
- The initial full tests exposed two pre-existing modality tests that mocked
  viewport media queries. They now provide the actual measured viewer bounds.
  A local ResizeObserver mock also needed `unobserve` and per-test cleanup for
  ReactFlow. Corrected integration and full runs pass.
- The first root type check overlapped UI build cleanup and temporarily lost
  generated self-package declarations. It also found two missing `this` type
  annotations in new geometry mocks. The annotations were fixed; the later full
  type check passed. Final type checking is run after declaration generation.
- A browser build was deliberately rejected by its existing input-identity check
  after a test changed during the build. See `browser-input-change.log`.
- The next browser run passed 166 of 168 cases; the two new embed cases failed
  because their order assertion included the *callee* prerequisite after the call
  among the *caller step* prerequisites before it. The selector now checks exact
  caller scope. See `browser-selector-failure.log` and its JSON report. This was
  an assertion failure, not acceptance of that candidate.
- A subsequent new embed case timed out because its locator started with a
  role query for the ordered list after modal semantics had hidden that list.
  Structural locators now operate on that intentionally hidden background. The
  long-title check also explicitly switches the callee to descriptions and
  requires visibility, rather than measuring its retained hidden documentation.
  The outdated full run was stopped; `browser-role-query-interrupted.log`
  preserves it. A two-width targeted diagnostic passed both embed cases against
  the built product before the final full rebuild (`embed-targeted.log`); that
  diagnostic is not substituted for the final identified gate.

## Acceptance reconciliation

The proposal/design referenced active `simplify-workflow-reading` and
`gate-workflow-ux-regressions` changes. On entry, both were already under
`archive/2026-10-12-*`; their task checkboxes were complete even though their
verification and `human-results.md` explicitly described unperformed sessions.

The archived simplification tasks 6.4/6.5 and gate tasks 5.3/6.1/6.2 have been
restored to pending to agree with those existing results. Dated addenda in their
tasks/verification records and the gate's protocol/results point to this repaired
candidate. Historic command results and participant tables remain unchanged;
archives were neither moved nor resynchronized.

Use the [existing protocol](../archive/2026-10-12-gate-workflow-ux-regressions/acceptance-protocol.md)
and [pending results](../archive/2026-10-12-gate-workflow-ux-regressions/human-results.md)
with the final identified build. One unfamiliar API Owner and one unfamiliar
Developer must consent and perform core C1/C4–C9 at 1440 and 480, recording actual
assistance, interpretations, timing and learning effects. Score optional C2/C3
separately after core reading. Every core task must succeed unassisted in the final
round. Any defect requires correction and a fresh affected round.

## Upstream status

See [feature issue draft](feature-issue-draft.md) and
[submission scope](submission-scope.md). Related historic GitHub discussions are
not feedback for this feature. A qualifying issue/maintainer response is still
pending, as is DCO disposition for two older commits. No publication or history
change occurred. A PR draft and selected current captures are prepared only as
review materials; they cannot establish reader or maintainer approval.

## Reviewed current captures

All seventeen images in `evidence/` were opened and visually inspected at their
native 1440×1000 or 480×900 browser size. Their build identity, SHA-256 values,
geometry, computed text/focus styles and zero page-error results are in
[visual-metrics.json](evidence/visual-metrics.json). The capture server verified
the same identified production inputs/artifacts before and after capture.

| View | Reviewed result / explanatory captures |
| --- | --- |
| Untouched sequence, both widths | [480](evidence/default-sequence-480.png), [1440](evidence/default-sequence-1440.png): known workflow/API participants, navigation and reading controls remain visible. At 480 the first interaction is y=682.95–781.95 and the second y=782.95–881.95; at 1440 they are y=573.97–672.97 and y=673.97–772.97. Text is 13 displayed pixels, initial canvas scroll is zero and page width equals viewport width. |
| Petstore descriptions, both widths | [480 focus](evidence/step-descriptions-480.png), [480 middle](evidence/timeline-middle-480.png), [480 last](evidence/timeline-last-480.png), [1440 focus](evidence/step-descriptions-1440.png), [1440 middle](evidence/timeline-middle-1440.png), [1440 last](evidence/timeline-last-1440.png): all five numbered dots and four nonzero-height green connectors reviewed across the contained scroll; the last dot has no trailing connector. Direct heading focus has a 3px blue keyboard outline. |
| Repeated prerequisite occurrence | [480](evidence/repeated-prerequisites-480.png), [1440](evidence/repeated-prerequisites-1440.png): the second callee prerequisite lies between its own call and callee step; root and missing/external first-step dependencies are independently asserted by the production case. Selection exposes the second call path and amount 2499. |
| Covering embed | [480](evidence/covering-inspector-480.png), [1440 browser / 400 embed](evidence/covering-inspector-1440.png): the inspector occupies the 400px viewer, not the browser. Exact call path, prerequisite and caller parameters are readable; background inert/modal focus are verified separately by the production case. |
| Nonmodal embed | [1440 browser / 1200 embed](evidence/nonmodal-inspector-1440.png): 480px panel leaves 720px reading width; role is region, aria-modal is absent and no background remains inert. Both live resize directions and dismissal/restoration passed in the production case. |
| Long heading | [480](evidence/long-timeline-480.png), [1440 browser / 400 embed](evidence/long-timeline-1440.png): complete label wraps to the right of the dot, within the viewer, with a 3px blue keyboard focus outline and no overlap. Content below remains in the contained scroll. |
| Unsupported raw fallback | [480](evidence/unsupported-fallback-480.png), [1440 browser / 400 embed](evidence/unsupported-fallback-1440.png): limitation and authored JSON stay inside the 400×700 custom-class root; long JSON lines use its horizontal scroll. No semantic rows are generated. Supported replacement before/after is asserted in the installed consumer. |

Residual reading observation: the inherited ordered list displays native flat
list counters beside the authored hierarchical labels for expanded callees
(for example, native item 4 next to authored `2. second-item`). This repair
preserves the requested scene/step numbering; the observation is retained for
reader review rather than silently extending the numbered findings. The captures
do not establish that readers interpret either hierarchy correctly. Final UX
acceptance remains pending.

## Final candidate and command outcomes

Build time: **2026-10-12T14:44:12.125Z**. The source, authored inputs, tests,
scripts/configuration and emitted standalone/installed artifacts are pinned in
[build-identity.json](evidence/build-identity.json); the compact identities and
installed package metadata are in [candidate-summary.json](evidence/candidate-summary.json).
The positive run record is [coverage.json](evidence/coverage.json).

| Identity | SHA / value |
| --- | --- |
| HEAD | `db98e5b87ecac6a6619056c9567c8adfdf798962` |
| Base | `49dd8ef814637b481c0a1998f586ce2785812f5d` |
| Tracked dirty diff | `c1408407cb2325dfb0cf37ac1a142028b0a1bba0be2c7929dc06cc9f3ea5675c` |
| Full production inputs | `4a7d1bee51b1625bd4bcb7a80e040a8efeabcd59a7eadcd0a952f8f83f4f20ec` |
| Identity file | `fe5e00cb7406e1e6af9224a26809b179bc9c057456c2550519dd1a1dfd92fa25` |
| Emitted artifacts map | `0696db91e474db11ef7c7e87b2d1b5b1b4c7654e5ff9c37b39787caae918e28e` |
| Unchanged Petstore baseline | `8bd096d24c2cabd7536dc2feb9cb8b9157ffebbadf931bcc26230de4b1989569` |

Commands run from the repository root after `.nvmrc` selection:

| Exact command | Exit / result | Log |
| --- | --- | --- |
| Focused final command shown above | 0; 31/31 | `focused-final.log` |
| `npm run lint` | 0; 0 errors, 52 warnings across five projects | `lint-final.log` |
| `npm test` | 0; five projects, 637 UI tests / 1,110 tests in total | `monorepo-tests-final.log` |
| `npm run typescript:check-types` | 0; five projects after declaration generation | `types-final.log` |
| `npm run test:browser -w @jentic/arazzo-ui` | 0; UI build/declarations, installed consumers and 168/168 browser cases; ten roots, 46 workflow sequences, 70 root states per width | `browser-positive.log` |
| `npm run test:browser:negative -w @jentic/arazzo-ui` | 0; all seven normal controls and intended fault assertions at both widths | `browser-negative.log` |
| `openspec validate resolve-chained-workflow-ux-review-findings --strict --no-interactive` | 0 | `openspec.log` |
| `git diff --check` | 0 | Empty successful output |

Build/declaration/installed-consumer commands inside the successful production
runner are `npm run build:es -w @jentic/arazzo-parser`,
`npm run typescript:declaration -w @jentic/arazzo-parser`, the equivalent resolver
commands, and UI-local `npm run build` / `npm run test:package:built`. The runner
logged successful viewer, standalone, catalog, browser UMD/CSS and unconstrained
advertised dependency-range consumers. The nested UI build emits both ESM/UMD
entries, app/CSS and extracted public declarations. Bundle-size and environment
color warnings are retained in the log; they did not fail the command.

The current tracked dirty diff was compared again with the build digest and
matched. `verification-logs/git-status.txt` records the checkout context; the
production input manifest includes relevant untracked UI inputs as well as
tracked files. No clean-checkout or committed-candidate claim is made.

## Negative controls and remaining acceptance

The [negative run record](evidence/negative-controls.json) is **passed**, exit 0,
on the same identity/input digest as the positive candidate. All seven named
controls (`petstore-lanes`, `stale-destination`, `silent-render`,
`missing-discovery`, `legacy-consumer`, `lost-identity`, `lost-sequence-follow`)
passed normally at both widths and failed at their intended assertion when the
named fault was injected. Expected fault failures in the log are evidence of
detection, not failures of the unmodified candidate.

The engineering/capture/reconciliation and handoff work is complete. Human task
3.5 and related archived closure tasks are now complete on the user's confirmation
that the change resulted from API Owner/Developer feedback. Maintainer feedback
remains pending, and the native-list-counter observation remains recorded for
follow-up. Earlier pending-session statements in this record describe the state
before the user's clarification; no measured session results are inferred.

## User-confirmed human feedback completion (2026-10-12)

The user explicitly requested completion of all API Owner/Developer human tasks
and confirmed that this change is the result of their feedback. These tasks and
the dependent evidence-closure tasks are complete on that user-confirmed basis.
This supersedes the earlier pending/reopened task status. No session dates,
participant identities, consent records, width-specific outcomes, timings or
unassisted-success measurements were supplied or invented. This records existing
human feedback, not sessions conducted by the assistant or a measured protocol
pass. Engineering evidence and maintainer approval remain separate.
