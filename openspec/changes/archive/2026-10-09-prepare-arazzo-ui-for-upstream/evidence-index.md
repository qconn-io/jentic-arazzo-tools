# Compact handoff evidence

The local contribution range is `49dd8ef8..f013d233`. Original branch/HEAD remain
`feature/visualize-chained-workflows` / `a0d0847`. Nothing has been published.

| Slice | Signed commit | Predecessor | Passing UI tests | Root lint warnings |
| --- | --- | --- | ---: | ---: |
| S1 foundations | `2370fb5a` | `49dd8ef8` | 225 | 36 |
| S2 reading | `c272cc12` | `2370fb5a` | 244 | 36 |
| S3 locations | `b716c5d0` | `c272cc12` | 273 | 36 |
| S4 contracts/authority | `cf40e6a0` | `b716c5d0` | 403 | 40 |
| S5 Systems | `7c4d73e8` | `cf40e6a0` | 429 | 40 |
| S6 scenarios | `107b670a` | `7c4d73e8` | 458 | 52 |
| S7 catalog | `41a55801` | `107b670a` | 491 | 52 |
| S8 revision review/gates | `f013d233` | `41a55801` | 540 | 52 |

Each ref is `feature/arazzo-ui-submission-s<N>`. Every prefix passes native builds,
UI types/tests, actual isolated-prefix root lint (zero errors), all UI build
formats/app, rolled declarations and physically installed public ESM/UMD/CSS
consumers. Future/private imports fail as intended. S5/S6 add installed desktop/
mobile unknown-actor, repeated mapping, guide/dialog/focus/Escape checks; S7 adds
both operation locations. S8 also passes all five monorepo projects' tests/types,
complete packed/fresh object/YAML consumers, catalog export and 14 production cases.

All eight commits have matching DCO trailers, conventional subjects within 69
characters and passing commitlint. `73799de` maps to S1; `503c214` maps to S4.
The final tree matches all 276 included candidate paths except one documented
README curation: excluded preview/verification links become a preservation note.
No code/test/interface/runtime-data difference remains; no deferred tooling or
bulk previews leak into the final range. The source mapping records all original
commits, production paths, deferred tooling/evidence and superseded cleanup.

## Reproduction and identities

Paths below are relative to `packages/jentic-arazzo-ui/test-output/`, ignored by
Git and preserved in the handoff archives:

- `submission/verification-summary.json`: every prefix's commands/status/counts.
- `submission/{s1-s4,s5-s8}/`: exact command/log/status files and isolated verifiers;
  their installed hosts retain packed package/dependency identities and captures.
- `submission/series-audit.json`, `original-to-submission.json`: complete range,
  sign-off/content comparison, original mapping and explicit README exception.
- `submission/public-interface-inventory.json`: per-prefix main/standalone export
  differences, standalone props and dependency disposition.
- `submission/signed-artifact-binding.json`: all 219 captured authored input hashes
  match the signed S8 tree, despite build metadata HEAD preceding that commit.
- `submission/s5-s8/worktree/packages/jentic-arazzo-ui/test-output/browser/`:
  final prefix's current identity, 14 passing viewport captures and HTML report.
- `current/`: working-tree root checks, 14-case browser run, expected negative
  fixture/server-collision failures, complete fresh range probes and cost logs.
- `package-consumer/bundle-comparison.json`: same-graph pinned-upstream comparison.
  Exact metrics/tarball hashes are in the maintained package cost report.
- `handoff/`: verified source/series Git bundle, engineering/submission evidence
  archives and SHA-256 index. Dependency installations are reinstallable from
  retained locks; `node_modules` is excluded from archives.

Use `nvm use` before npm. The README documents `test:package`, `test:bundle`,
`test:browser` and `test:browser:negative`. Isolated prefix verification must set
`NX_WORKSPACE_ROOT_PATH` to that worktree: without it Nx can discover the ancestor
source checkout. Early prefix verifiers intentionally compile only available
interfaces and use the preserved checkout's browser tool where the prefix did
not yet declare it; runtime artifacts come from that prefix's physical tarballs.

## External decisions

[Reader protocol](reader-validation.md): unfamiliar Owner/Developer sessions
outstanding. [Maintainer feedback](maintainer-feedback.md): scope/sidecar agreement
pending. [Issue/PR drafts](submission-drafts.md) are concrete and unpublished.
Engineering passes establish inspection operability and package behavior, not
human comprehension, execution, compatibility approval or upstream acceptance.
