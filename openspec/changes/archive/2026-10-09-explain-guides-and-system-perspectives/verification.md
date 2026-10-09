# Guide and Systems discovery verification

Candidate: `08cfba6` (2026-10-09). Both predecessor changes are included in this commit and archived under `2026-10-09-restore-workflow-source-binding` and `2026-10-09-simplify-workflow-reading-controls`. Fresh prerequisite run: Petstore binding, reading discovery and standalone location suites: 18 tests across 3 files passed. The Petstore production seam preserves five operations without secondary acquisition; normal reading and default restoration need no guides/profile.

## Implementation and compatibility

- Replaced the generic Advanced tools disclosure and profile portal with independent URL setup. Supplied walkthrough choices are available directly, with title/ID fallback, purpose text and authored-inspection classification. Configured Systems controls are beside workflow reading controls; missing metadata has contextual help, and supplied-profile limitations retain separate diagnostics.
- Added associated Guide file URL help, a normalizable version 1 JSON example, legacy-array guidance and a schema link. Open guided example explicitly switches both document and guide URLs, preserves unrelated query parameters and performs no acquisition until activated.
- Loading, unavailable retrieval, malformed JSON/envelopes, empty files, document mismatch and stale waypoint states retain ordinary reading. Retry acquires only the requested guide file. Failed replacement retains previously loaded guides with their original retrieval URI. Existing explicit document handoff, cancellation, controlled callbacks, namespaces and legacy formats remain supported.
- Independent read-only review identified an Important supplied-manifest example bug. A new regression first failed, then passed after adding an explicit example override. Subsequent host manifest/URI changes regain authority; controlled scenario selection is still host-owned. URL parsing uses Axios, so the component regression substitutes the top-level document acquisition seam while retaining the real parser; the production browser independently verifies the real example document and file.

## Requirement evidence

Test paths are relative to `packages/jentic-arazzo-ui/test/`.

| Behavior | Current evidence |
| --- | --- |
| Plain reading, closed URL setup, no acquisition from disclosure/help | `optional-tools.test.tsx`, `guide-discovery.test.tsx`, production captures |
| Supplied named/ID choices, empty content, normalizable help and README examples | `guide-discovery.test.tsx`, `scenario-ui.test.tsx` |
| Explicit compatible example, preserved query parameters, supplied-manifest override and later host updates | `guide-discovery.test.tsx`, production capture runner |
| Configured Systems discovery, exact nested occurrence return, controlled callbacks | `system-ui.test.tsx`, `optional-tools.test.tsx` |
| Unconfigured help, stale profiles, explicit actor/source-owner authority | `guide-discovery.test.tsx`, `system-profile.test.ts`, `system-actor-authority.test.ts` |
| Local failures/retry, malformed replacements, retained valid guides | `guide-discovery.test.tsx`, `optional-tools.test.tsx` |
| Legacy/shared waypoint reconstruction, host document handoff and cancellation | `scenario-standalone.test.tsx`, `scenario-ui.test.tsx` |
| Failed guide restoration preserves exact base occurrence and keeps URL setup closed | `location-standalone.test.tsx` (checkout.secondPayment -> payment.charge), production captures |
| Narrow inert background, Tab/Shift+Tab containment, Escape origin, desktop details | `optional-tools.test.tsx`, `scenario-ui.test.tsx`, production captures |

## Production browser evidence

Reproduce after building:

```sh
source "$HOME/.nvm/nvm.sh" && nvm use
node openspec/changes/explain-guides-and-system-perspectives/verification/capture.mjs
```

The final production build passed 14 captures: plain entry, unconfigured Systems, guide help, supplied guides, guide inspection, configured Systems and failed shared-guide restoration, each at 1440 and 480 pixels. [observations.json](captures/observations.json) records final JS/CSS SHA-256 identities, zero browser errors and page/body widths equal to the viewport for every state. The runner asserts zero requests from opening help, real example document/guide parameters, independent Systems controls, narrow inert setup and contained keyboard focus, plus Escape returning to the exact guide origin. The failed-restoration capture includes a valid base workflow location and a missing guide extension.

Representative desktop and narrow captures were visually inspected: ordinary reading stays available, supplied choices are visible outside URL setup, configured Systems purpose/switch is visible, guide inspection covers narrow background and retrieval failure keeps recovery beside ordinary navigation. Optional format help uses contained scrolling. These observations and automated tests do not establish unfamiliar-reader discovery, comprehension, workflow execution or final series-wide acceptance. `gate-workflow-ux-regressions` retains independent discovery and the predecessor's separately recorded flowchart readability issue.

## Final checks

All npm commands used `.nvmrc` via `source "$HOME/.nvm/nvm.sh" && nvm use` (Node 26.3.1).

- Fresh predecessor checks: 18 tests in 3 files passed.
- Focused optional/guide/scenario/system/location checks: 56 tests in 9 files passed before the final example and exact-restoration regressions; the final full suite includes both.
- `npm test -w @jentic/arazzo-ui`: 601 tests across 94 files passed, zero failures.
- `npm run typescript:check-types -w @jentic/arazzo-ui`: passed after final source and test edits.
- `npm run build -w @jentic/arazzo-ui`: passed for both UMD/ESM entries, rolled declarations and the deployable app after final source edits.
- `npm run test:declarations -w @jentic/arazzo-ui` and `npm run test:package:built -w @jentic/arazzo-ui`: passed against that final build, including installed UMD/CSS, browser bundler and advertised-range packed consumers. Existing large-chunk advisories remain.
- ESLint on changed source and focused tests: zero errors/warnings.
- Final production capture runner: 14 states passed, zero browser errors and no page-wide overflow.
- `openspec validate explain-guides-and-system-perspectives --strict --no-interactive` and `git diff --check`: passed.

All 12 tasks are implemented and verified. No archive, main-spec sync, commit, push or publication was performed.
