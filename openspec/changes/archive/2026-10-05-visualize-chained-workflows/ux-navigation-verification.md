# UX navigation implementation — 2026-10-05

Tasks 11.1–11.4 have fresh automated evidence. Remaining UX and browser tasks are incomplete.

- `connected-fixtures.test.ts`: real loader/model checks for repeated and nested calls, distinct mappings and API sources, recursion, conditional goto/retry, workflow and step prerequisites, unavailable targets, ambiguous source binding, and opaque descriptive/extension associations. Synthetic fixtures are tracked and independent of the local D1 sample.
- `connected-navigation.test.tsx`: default Docs navigation, a meaningful All workflows overview, selected-workflow documentation, controlled requests and acceptance, destination retention across Docs/Diagram/Split, callback counts, and replacement-document refresh.
- `docs-ownership.test.tsx`: calling-workflow ownership and exact scoped documentation focus continue to pass.
- Full UI suite: 25 files, 201 tests passed. Subsequent Documentation label change: targeted navigation/ownership suite, 8 tests passed.
- UI TypeScript check passed. UI lint passed with 36 existing warnings and zero errors after formatting the changed files.
- Both rolled public-declaration consumer checks passed. `git diff --check` passed.

Shared navigation sits above the panes, with a persistent All workflows button and a native labeled workflow selector. Docs overview lists Calls, Called by, Prerequisites and Transfers, including unlinked workflows and classified unavailable destinations. Switching modes reuses the provider's destination state. Loading a replacement document keeps the existing provider mounted so overview does not reset to the first workflow; document revisions still rebuild inspection/model and cancel pending focus through the existing provider logic.

## Packaging blocker

`npm run build -w @jentic/arazzo-ui` built both ESM/UMD entries and declarations, then failed in `build:app`:

```
cp: -r not specified; omitting directory './public/openapi_samples'
```

The existing app script copies `./public/*` with nonrecursive `cp`. This checkout has the ignored local `public/openapi_samples` directory, including the D1 standard sample. No sample was removed or copied into tracked artifacts. The requested built-browser navigation walkthrough has not run, and task 11.5 remains unchecked. Browser tooling was installed separately under `/tmp/arazzo-browser-smoke`; no repository dependency changed.

The build needs a decision on whether local sample directories belong in the standalone app's copied assets or should be excluded from packaging. The apply workflow is paused at that blocker; connected sequence, caller trail, shared details/status, static output revisions, and integrated acceptance have not been implemented in this session.


## Blocker resolved after user direction

The user directed exclusion of `openapi_samples` and continuation. The app build now uses `scripts/copy-public-assets.mjs`, which excludes that exact directory and copies other public assets. The local sample remains available and ignored. The standalone build and default-Docs browser journey passed. Tasks 11–17 have fresh implementation and acceptance evidence in [ux-verification.md](ux-verification.md); the preceding blocker account is historical.
