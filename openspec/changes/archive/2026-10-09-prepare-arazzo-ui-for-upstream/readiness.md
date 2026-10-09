# Upstream preparation readiness

Updated 2026-10-09. The original source branch remains
`feature/visualize-chained-workflows` at
`a0d08472050d44f2079232f1535c9a6ac326af57` (the pinned review HEAD).
Upstream base was verified as `49dd8ef814637b481c0a1998f586ce2785812f5d`.
Repairs are additional source bytes, preserved separately without rewriting the
original history. See [submission-preservation.md](submission-preservation.md)
for refs, verified bundle, archive and included/deferred manifest.

Engineering verification is passing for the repaired working tree. Submission
preparation is complete: signed S1–S8 prefixes and final content/DCO audit pass.
External validation remains pending: no unfamiliar-reader sessions or actual
maintainer decisions were supplied. These states are independent.

## Finding and requirement coverage

Requirement names refer to the two delta specifications. Every finding links to
current implementation/test evidence, its owning tasks and the handoff state.

| Item | Requirement | Tasks | Current evidence and state |
| --- | --- | --- | --- |
| R1 DCO | Focused signed contribution series | 11.1–11.6 | Unsigned `73799de` → signed S1 `2370fb5`; `503c214` → signed S4 `cf40e6a`. Original commits remain recoverable. Eight-commit DCO/conventional-subject/commitlint audit passes. |
| R2 authority | Secondary acquisition obeys explicit authority; Dependency acquisition retains bounds and freshness; Pinned revision inspection uses supplied bytes | 2.1–2.6 | Private loader/native bridge, source registry, adapters and inspector/catalog/review callers; acquisition/pin/alias/budget/reload/cancellation/offline tests and real provider-denial browser cases pass. No default HTTP/file fallback. |
| R3 gates | Maintained package acceptance gates; Reproducible production-browser acceptance | 8.2, 9.1–9.4, 10.1–10.3 | Root lint/tests/types, full UI formats, strict rolled and physical installed exports, fresh object/YAML consumers and 14 production cases pass. Negative fixture and server collision each exit 1. Reviewed gates await complete source projection, identify inputs and allow only expected requests. |
| R4 scope | Focused signed contribution series; Compact evidence preserves provenance | 11.1–11.8 | S1–S8 independent local prefixes and final manifests/comparison verified. Added agent/OpenSpec tooling and bulk previews are deferred and preserved, rather than adopted into upstream. |
| R5 actors | System actors require owning-scope bindings | 3.1–3.3 | `systems/scene.ts`, `SystemsDetails.tsx`, actor scene/inspector tests and installed desktop/mobile repeated-context checks pass. Valid owning-step binding overrides workflow; unbound helper/implementation remains Unknown. Actor/source/organization roles are distinct. |
| R6 references | Contract impact distinguishes references from literal data | 4.1–4.4 | Shared structural contract/schema/map/literal seam feeds projection and offline usage. Real references, literal-negative and adversarial map/AsyncAPI cases pass; unsupported semantics stay partial. |
| R7 uses/roots | Shared default actions retain effective users; Impact roots require justified usage or explicit scope | 5.1–5.4 | Private effective uses feed catalog/review. Both entry paths retain inheriting steps; overrides exclude shadowed defaults and unrelated entries stay out. Before/after navigation and deterministic outputs pass. |
| R8 consumers | Operation consumers include classified entry paths | 6.1–6.3 | Bounded operation query and panel retain one direct use/two repeated entry locations, relationship classes, exact scoped revisions and partial/cyclic explanations. Component/query and installed desktop/mobile checks pass. |
| R9 lint | Maintained package acceptance gates | 8.1, 10.1 | Scenario tests use valid types; root lint passes with zero errors and 52 existing UI warnings. No rule suppression. |
| A1 cost | Measured optional package cost | 8.3–8.4 | [Package cost report](../../../packages/jentic-arazzo-ui/docs/package-cost.md): identical graph/settings, packed minimal/standalone/deferred consumers and retained-code assertions. Minimal initial adds 39,256 gzip bytes (~2.9%); catalog/review are absent from minimal emitted chunks. Whole-file sizes are separate. |
| A2 controls | Optional tools use progressive disclosure; Consistent accessible controls | 7.1–7.3 | Advanced tools retains immediate ordinary reading, reveals supplied/restored status and acquires nothing by disclosure. Current viewport captures, focus/dialog/Escape/origin, controls and overflow assertions pass. |
| A3 comprehension | Human comprehension evidence is honest | 12.1–12.2 | [Protocol and outstanding sessions](reader-validation.md) delivered. No participants, quotes, task times or measured comprehension invented. **Pending external validation.** |
| A4 agreement | Upstream agreement remains an external decision | 11.7, 12.3 | [Unpublished drafts](submission-drafts.md) and [feedback record](maintainer-feedback.md) prepared. **Maintainer scope/sidecar agreement pending.** Local DCO/gate results are not upstream approval. |
| A5 claims | Existing inspection and embedding contracts remain coherent; Compact evidence preserves provenance | 7.3, 10.2–10.3, 11.7, 12.4 | Labels retain selected-1.1 inspection, authored versus observed, coverage/support limits and potential impact. Pinned public Asana/Xero/Stripe projections and installed step inspection pass; no schema-validation, execution, compatibility approval or human-comprehension claim. |

## Current engineering results

[engineering-validation.md](engineering-validation.md) records commands, source,
fixture and artifact identities plus failed diagnostic iterations. After `nvm use`
(Node 26.3.1/npm 11.16.0):

- All five projects pass root lint, monorepo tests and type checks. UI: 87 files,
  540 tests. Lint: zero errors, 52 existing UI warnings.
- Full dependency/UI builds and rolled/installed strict consumers pass through
  package exports. Main/standalone ESM/UMD/CSS and typed ESM-only catalog are
  tested with private-import negatives.
- Fresh advertised ranges pass object/YAML catalog projection and its located
  consumer without SpecLynx overrides; exact graph/exception reports are retained.
- Rebuilt production suite: 14/14 at 1440px/480px. No page errors, business calls,
  implicit dependency requests, forbidden embedded history or page-wide overflow.
- Intentionally broken fixture and unrelated occupied server each fail, exit 1.
  Acceptance runs preserve tracked bytes and write only ignored evidence.
- Bundle comparisons use pinned upstream, matching dependencies and settings;
  [cost report](../../../packages/jentic-arazzo-ui/docs/package-cost.md) gives
  exact current tarball/graph hashes and bounded conclusions.

Historic baseline reproductions and early failed/partial stages are preserved in
[readiness-history.md](readiness-history.md). They are not current passes.

## Publication and external status

No push, issue/PR publication, deployment, merge, original-history rewrite,
archival or spec sync has been performed. The prepared local series is for review;
feature scope agreement must precede any separately authorized upstream submission.
Reader validation and maintainer decisions remain visibly pending even when local
implementation and submission preparation complete.

## Final submission result

[evidence-index.md](evidence-index.md) records the eight independently verified
refs, per-prefix UI counts, warning counts, original mappings, source-to-signed
artifact binding and archive entry points. The final source ref is
`feature/arazzo-ui-final-preserved-20261009`; original source and complete historical
evidence remain separately recoverable. Final curation changes only the README
links to excluded bulk captures; all candidate code/tests/interfaces/example data
match the repaired source. All 219 captured final-prefix inputs match its signed
S8 tree, and the range has eight passing DCO/commitlint commits.

Engineering: **verified**. Submission preparation: **complete locally**.
External validation: **A3/A4 pending**. Local completion does not authorize or
represent upstream publication/acceptance.
