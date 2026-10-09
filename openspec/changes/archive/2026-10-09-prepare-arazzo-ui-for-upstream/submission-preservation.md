# Preserved source and local curation scope

Verified upstream HEAD on 2026-10-09:
`49dd8ef814637b481c0a1998f586ce2785812f5d`.
Upstream fetch/push: `https://github.com/jentic/jentic-arazzo-tools.git`.
Fork fetch/push: `https://github.com/qconn-io/jentic-arazzo-tools.git`.

Original source branch `feature/visualize-chained-workflows` remains at
`a0d08472050d44f2079232f1535c9a6ac326af57` with its complete original history and
archives. Local preservation refs:

- `feature/arazzo-ui-source-preserved-20261009`: original HEAD.
- `feature/arazzo-ui-repaired-preserved-20261009`: first repair checkpoint
  `e8d118473a1f91c78e6c9fe56ab9a7984b00f58d`.
- `feature/arazzo-ui-repaired-verified-20261009`: verified repair source
  `f7b44588ae8917621e392d3562b8a4b9bd4fd6f0`, including reviewed acceptance gates.

Preservation commits were created using a separate temporary index; the original
source branch and staging index were not moved or rewritten. DCO trailers identify
the configured contributor. These checkpoints preserve evidence and are separate
from proposed upstream commits.

The final source ref `feature/arazzo-ui-final-preserved-20261009` points to
`a3f272107bf94d13705e2d495f5cef3f7e929778` and includes the final source/test/gate
bytes and handoff planning. The verified `test-output/handoff/preserved-source.bundle`
contains these refs and all eight signed submission refs
and their complete reachable source/history, including excluded original archives
and agent workflows. `engineering-evidence.tar.gz` preserves current logs,
reports/captures, locks/manifests, compiled consumer outputs and package tarballs.
Reinstallable `node_modules` and actively curated submission worktrees are excluded
from the engineering archive; exact dependency locks and original package bytes
are retained. Archive digests are in `handoff/archive-sha256.txt`. Generated paths
in this record are relative to `packages/jentic-arazzo-ui/` and ignored by Git.

`test-output/current/included-deferred.json` records 276 candidate included and
329 deferred changed/new paths against the pinned base with current file hashes.
New `.agents/`, OpenSpec planning/workflow/archives, bulk preview/test-result
images and recorded verification dumps are explicitly deferred. Baseline-owned
files remain. Production code/tests/examples/README/cost docs and repeatable CI
acceptance are candidates for the focused series. Final manifests/comparison can
refine curation-only test seams and identify any exceptions explicitly.

Curation is isolated under `test-output/submission/`. Local
`feature/arazzo-ui-submission-s1` through `-s8` refs record verified signed prefixes;
the final ref is `f013d233b83dfa95ddf5e4d14957f41ad6a7b6df`. The per-prefix records distinguish unperformed, failed and
passing gates; one working-tree pass never substitutes for a prefix check. No
issue/PR was published and no branch was pushed, merged or deployed.
