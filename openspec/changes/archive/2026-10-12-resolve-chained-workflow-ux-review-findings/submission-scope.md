# Proposed chained-workflow submission scope

Prepared 2026-10-12 from the current checkout; no history or publication changed.

## Pinned comparison

- Branch: `feature/visualize-chained-workflows`.
- Base HEAD before final review-remediation commit: `291829e2cc9bb29a1883abb0ef6a52273de4ca56` (following `89e7b21`, `e4b0dfa`, and `eb94300`; normalized from `eb5e16151c1f1a383ed9305bc200452a1cd22c47`).
- Locally pinned `upstream/main` and merge base: `49dd8ef814637b481c0a1998f586ce2785812f5d`.
- Upstream: `https://github.com/jentic/jentic-arazzo-tools.git`; fork:
  `https://github.com/qconn-io/jentic-arazzo-tools.git`.
- Committed comparison: 26 commits (25 feature/repair commits through `291829e` plus the top review-remediation commit), 821 files, 188,763 insertions and 3,751
  deletions through `291829e`. This includes large historical evidence sets and is not a focused
  PR-sized patch. The upstream ref was not refreshed during this implementation.
- Additional review remediation (public `.d.ts` alias
  re-exports, component decomposition, refreshed bundle/spec documentation, and
  human-feedback status reconciliation) is layered on top of `291829e`.
  `verification-logs/branch-commits.json` records the earlier `db98e5b` commit audit.

## One goal and review order

Goal: let readers follow a chained Arazzo declaration and inspect the exact
workflow/step occurrence without inferring execution, ownership or source results.

| Slice | Dependency and purpose | Existing branch commits / candidate areas |
| --- | --- | --- |
| Inspection and provider foundations | First: stable semantic facts, source authority, bounded references and diagnostics | `cabf103`, `663b31c`, `3e6a89b`, `a3ec552`, `1de5120`; model, inspection, source registry, contract adapters |
| Chained sequence and navigation | Builds on facts: repeated occurrence expansion, caller return and exact details | `7141128`, `f03a4d7`; sequence, viewer/session context, connected navigation |
| Reading and this UX repair | Builds on sequence: implicit sequence default, descriptions, prerequisites, timeline, focus, host sizing, overview styling | `9628f64`, `7afb98d`, `89e7b21`, `e4b0dfa`, `eb94300`; review-remediation commit |
| Shareable locations | Builds on occurrence identity and navigation | `3c0286a`; location codec, history bridge, host control |
| API contract inspection | Builds on provider/facts: explicit lookup and provenance | `a3ec552`, `086e175`, `1de5120`; source lifecycle, contract UI and adapters |
| Optional descriptive Systems and guides | Builds on reading/locations/provider; authored metadata only | `086e175`, `a9f1463`; system profile and scenario manifest |
| Optional catalog and revision review | Builds on stable source identity/inspection; cross-document uses and immutable revision facts | `08f5bbd`, `60166cc`; catalog and review exports |
| Acceptance and documentation | Accompanies each owning slice rather than one unrelated final dump | `0cb33d5`, `ef5f806`, `1de5120`, `89e7b21`, `291829e`; README, declarations, consumers, browser gates, CI |

All extension slices relate to reading/inspecting workflows, but Systems, guides,
catalog and revision review are not prerequisites for the initial sequence. Their
inclusion and PR order require maintainer scope feedback; preparation does not
silently drop their implementation or imply approval of a combined submission.
The remaining planning/chore commits support local workflow or evidence hygiene,
not additional product capabilities.

## Public API and dependencies

Existing viewer props/callbacks and explicit view choices remain supported. The
branch adds relationship/external navigation, source-provider contracts, occurrence
locations, supplied metadata, catalog and revision-review exports. `./catalog` is
an ESM-only subpath; normal viewer and standalone retain ESM/CommonJS entrypoints.
This repair changes no breaking public type or dependency: raw fallback honors existing
`className`/`style` and ref behavior, and public `.d.ts` rollups export both canonical
and spec-alias type names (`SourceProvenance` / `ProvidedSourceProvenance`,
`ExternalWorkflowNavigationRequest` / `ExternalNavigationRequest`,
`CatalogSelection` / `WorkflowCatalogSelection`,
`CatalogCoverageReport` / `WorkflowCatalogCoverage`,
`WorkflowRevisionComparison` / `WorkflowReviewResult`). Implicit first-use presentation
changes to sequence, while explicit/restored intent wins.

The full branch adds ApiDOM datamodel/YAML/reference/traverse runtime dependencies,
`remark-parse` and `unified`; test tooling adds Vitest, Testing Library, jsdom and
Playwright. The lockfile changes accordingly. CI gains installed-package and
identified production-browser checks; asset copying handles nested examples;
eslint ignores generated `test-output`. These belong with the owning features and
acceptance slices, and must be visible to reviewers.

## Artifact disposition and commit requirements

- Include focused implementation, relevant public docs, regressions, unchanged
  authored examples and required package/config/lockfile/CI changes.
- Keep `.agents/skills/**`, `.agents/workflows/**`, `.openspec-target` and local
  agent/planning scaffolding outside the proposed upstream product patch.
- Preserve the historical OpenSpec archives, binary captures, logs and local
  roadmap in this workspace. Propose only a concise current evidence record and
  selected explanatory captures upstream, not the entire historic log corpus.
- Keep unrelated changes to archived logs outside this repair's intended commit.
  The pre-existing archive moves and spec syncs require their own coherent scope.
- `CONTRIBUTING.md` requires atomic Conventional Commits with DCO sign-off and a
  feature-prefixed branch. All 26 commits in `main..HEAD` on
  `feature/visualize-chained-workflows` now carry `Signed-off-by` trailers and
  commit subjects `<= 69` characters (adding `Signed-off-by` to the 4 commits that
  originally lacked it—`73799de` -> `cabf103`, `503c214` -> `a3ec552`, `3fd9802` ->
  `eb94300`, `eb5e161` -> `291829e`—and shortening the two long commit subjects on
  `eb94300` and `291829e`), while `feature/arazzo-ui-source-preserved-20261009`
  remains untouched at `a0d08472050d44f2079232f1535c9a6ac326af57`. DCO is not a
  cryptographic signature audit.
- No issue, PR, push or merge is performed by this
  handoff. Feature issue feedback remains pending; the user closed the human tasks based
  on existing API Owner/Developer feedback.
