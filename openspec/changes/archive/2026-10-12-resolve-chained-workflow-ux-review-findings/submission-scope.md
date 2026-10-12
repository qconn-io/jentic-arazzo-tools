# Proposed chained-workflow submission scope

Prepared 2026-10-12 from the current checkout; no history or publication changed.

## Pinned comparison

- Branch: `feature/visualize-chained-workflows`.
- HEAD: `db98e5b87ecac6a6619056c9567c8adfdf798962`.
- Locally pinned `upstream/main` and merge base: `49dd8ef814637b481c0a1998f586ce2785812f5d`.
- Upstream: `https://github.com/jentic/jentic-arazzo-tools.git`; fork:
  `https://github.com/qconn-io/jentic-arazzo-tools.git`.
- Committed comparison: 22 commits, 715 files, 91,491 insertions and 3,728
  deletions. This includes large historical evidence sets and is not a focused
  PR-sized patch. The upstream ref was not refreshed during this implementation.
- Additional working-tree changes already existed on entry, including the
  sequence-first implementation, inspection semantics, archives and historical
  log edits. This repair layers on that candidate; it does not own or discard them.
  `verification-logs/branch-commits.json` records the pinned commit audit.

## One goal and review order

Goal: let readers follow a chained Arazzo declaration and inspect the exact
workflow/step occurrence without inferring execution, ownership or source results.

| Slice | Dependency and purpose | Existing branch commits / candidate areas |
| --- | --- | --- |
| Inspection and provider foundations | First: stable semantic facts, source authority, bounded references and diagnostics | `73799de`, `47043e0`, `b5fd788`, `503c214`, `6f74975`; model, inspection, source registry, contract adapters |
| Chained sequence and navigation | Builds on facts: repeated occurrence expansion, caller return and exact details | `87f272b`, `b64ed67`; sequence, viewer/session context, connected navigation |
| Reading and this UX repair | Builds on sequence: implicit sequence default, descriptions, prerequisites, timeline, focus, host sizing | `b208f7a`, `08cfba6`, `db98e5b`; current dirty UI and this change |
| Shareable locations | Builds on occurrence identity and navigation | `856c84c`; location codec, history bridge, host control |
| API contract inspection | Builds on provider/facts: explicit lookup and provenance | `503c214`, `3fa43b2`, `6f74975`; source lifecycle, contract UI and adapters |
| Optional descriptive Systems and guides | Builds on reading/locations/provider; authored metadata only | `3fa43b2`, `181cb0f`; system profile and scenario manifest |
| Optional catalog and revision review | Builds on stable source identity/inspection; cross-document uses and immutable revision facts | `ae44276`, `a0d0847`; catalog and review exports |
| Acceptance and documentation | Accompanies each owning slice rather than one unrelated final dump | `e91d44c`, `a8c563a`, `6f74975`, `db98e5b`; README, declarations, consumers, browser gates, CI |

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
This repair changes no public type or dependency: raw fallback now honors existing
`className`/`style` and ref behavior. Implicit first-use presentation changes to
sequence, while explicit/restored intent wins.

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
  Do not delete or rewrite any archived evidence to reduce the current checkout.
- Keep unrelated changes to archived logs outside this repair's intended commit.
  The pre-existing archive moves and spec syncs require their own coherent scope.
- `CONTRIBUTING.md` requires atomic Conventional Commits with DCO sign-off and a
  feature-prefixed branch. 20 of 22 pinned commits have `Signed-off-by`; `73799de`
  and `503c214` do not. DCO is not a cryptographic signature audit. Any submission
  preparation that repairs historical commits or creates fresh signed-off slices
  is a separate authorized Git operation; none occurred here.
- No issue, PR, commit, push, merge, archive or spec sync is performed by this
  handoff. Feature issue feedback remains pending; the user closed the human tasks based
  on existing API Owner/Developer feedback.
