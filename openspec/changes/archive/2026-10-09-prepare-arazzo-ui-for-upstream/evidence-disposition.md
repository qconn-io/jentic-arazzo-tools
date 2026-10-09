# Evidence and tooling disposition

Source history remains at `a0d08472050d44f2079232f1535c9a6ac326af57` until an
explicit preserved-source checkpoint is created. Original signed/unsigned feature
work, OpenSpec archives, screenshots and logs remain recoverable there. Section
11 must record a preserved source ref and identified full evidence archive before
curating any submission range; this document does not claim that step done.

| Material | Proposed disposition |
| --- | --- |
| UI implementation, public declarations, maintained fixtures/tests, consumer/browser runners and CI | Include in its owning independently verified slice. |
| Selected public contribution docs, support limitations and reproducible commands | Include with the behavior they document. |
| `.agents/skills`, agent workflows and OpenSpec configuration | Local tooling; exclude from upstream series unless maintainers explicitly request adoption. |
| Bulk archived screenshots, logs and exploratory writeups | Preserve in source/evidence archive; omit bulk from submission. Link only selected explanatory evidence. |
| Current generated test/build/consumer/browser outputs | Ignored local output and CI artifacts; summarize actual identities/results in compact records. |
| Reader consent/raw recordings | Private retention agreed with participants; do not publish without consent. No recordings exist yet. |

## Compact index

- `readiness.md`: baseline, R/A requirements/tasks, current and historical gates.
- `interface-inventory.md`: current public entries/types and acquisition callers.
- `native-resolution-decision.md`: approved private-bridge scope and original failures.
- `submission-drafts.md`: unpublished S1–S8 scopes, interfaces and pending prefix fields.
- `reader-validation.md`: task cards/rubric and outstanding Owner/Developer sessions (A3 pending).
- `maintainer-feedback.md`: actual-feedback record currently pending (A4 pending).
- Durable acquisition/actor/structural/effective-use/operation fixtures and tests:
  `packages/jentic-arazzo-ui/test/`; generated output is not a substitute for these.

The final index must add actual local submission refs, original-to-series mapping,
included/deferred file manifests, per-prefix verification and current artifact
digests. Until those are filled, submission preparation remains incomplete.

## Final disposition, 2026-10-09

The signed local range `49dd8ef8..f013d233` contains eight independently verified
production slices. Its final tree excludes every added OpenSpec/agent workflow,
bulk preview/test-result directory and standalone verification dump. Baseline-owned
files remain. The stress README replaces excluded capture/dump links with an
explicit preservation note; all other candidate production bytes match current
source. Generic ignored-output rules do not adopt agent tooling into upstream.

Original archives/tooling and unsigned history remain in the preserved original
source ref and verified source/series bundle. Complete current engineering and
prefix evidence (commands/logs/status, graphs/locks, actual packs, compiled apps,
selected captures, source mapping and interface inventory) is archived separately
under ignored `test-output/handoff/`. Reinstallable dependency directories and
worktree checkout copies are excluded from evidence tarballs; their commits and
exact locks remain recoverable. See [evidence-index.md](evidence-index.md) for the
compact entry points and `handoff/archive-sha256.txt` for final archive hashes.
No original archive was edited and no upstream tooling/publishing was adopted.
