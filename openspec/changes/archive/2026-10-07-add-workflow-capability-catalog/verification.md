# Implementation and acceptance: add-workflow-capability-catalog

Verified 2026-10-07, schema `spec-driven`, against this working-tree implementation.

The optional catalog now supplies capability discovery, classified reverse usage, scoped
workflow/API identity and revision-pinned inspection without requiring catalog state in a
plain document viewer. The sample contains nine audited Arazzo documents, nine pinned
contract revisions and 45 workflows; ownership remains unknown and diagnostic purposes
remain explicit. The deliberately unavailable diagnostic source makes sample coverage partial.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| UI suite | 447 tests pass in 69 files | [Log](verification-logs/catalog-suite.log) |
| Types | Pass | [Log](verification-logs/catalog-types.log) |
| Production build and rolled declarations | Pass | [Log](verification-logs/catalog-build.log) |
| Both downstream declaration consumers | Pass | [Log](verification-logs/catalog-consumer.log) |
| Optional ESM browser-bundler export | Pass | [Log](verification-logs/catalog-export.log) |
| Changed TypeScript/TSX lint | No errors or warnings | [Log](verification-logs/catalog-lint-changed.log) |
| Package lint | Three existing `no-explicit-any` errors in unchanged scenario tests; 52 existing warnings | [Log](verification-logs/catalog-lint-final.log) |
| OpenSpec strict validation | Pass | [Record](verification-logs/catalog-openspec.json) |
| Production Chromium task walkthroughs | Three pass, at 1440 and 480 px; no business requests or browser errors in discovery runs | [Log](verification-logs/catalog-browser.log), [Record](browser-evidence/observations.json) |

Browser evidence contains the loaded production JS/CSS hashes, sample manifest hash and
source-file hashes, plus screenshots at both widths. These are automated authored-inspection
task walkthroughs and visual checks, not human-comprehension research or workflow execution.
They cover declared purchase capability discovery, entry/helper roles, unknown ownership,
exact shared entry restoration, unavailable catalog revisions, retry recovery consumers,
prerequisite-only cycle warnings, operation-to-workflow inspection, visible failed sources,
keyboard access, width containment, and retained plain document viewing.

## Task evidence

- Foundations: archived reading/deep-link/contract-inspection verification records were read;
  37 focused existing registry/location tests pass. The full UI suite includes existing
  standalone location, inspection and document-loading behavior.
- Manifest: `catalog-manifest.test.ts` covers scoped duplicate keys, absent optional metadata,
  owner/capability authority, malformed version and missing revision identities. Public types
  and the optional component are compiled by both rolled declaration consumers.
- Loading: `catalog-loader.test.ts` covers relative acquisition, digest/revision mismatch,
  localized failures, document/aggregate-byte/step limits, cancellation despite a provider
  ignoring abort, pinned external references, recursive external workflow source acquisition,
  cycles and depth bounds. Existing registry tests exercise physical concurrency and source limits.
- Index: `catalog-index.test.ts` covers distinct identities across documents/revisions,
  classified retries/prerequisites, direct authored API counts, repeated call paths,
  bounded/cyclic reachability, explicit descriptive associations, unknown ownership,
  metadata/API discovery and optional same-document call-occurrence addresses.
- Real examples: `catalog-sample.test.ts` checks all nine Arazzo/nine contract digests,
  45 scoped workflows, capture recovery as retry, restoration of its authored action,
  prerequisite-only cycles and intentional unavailable sources.
- Presentation: `catalog-ui.test.tsx` covers embedding callbacks without history mutation,
  reverse-usage source navigation, unavailable revisions and root selection changes.
  `catalog-location.test.ts` verifies catalog/document revision conflicts.
  `catalog-contract-revisions.test.tsx` verifies the actual inspector honors exact source-name
  revision bindings when two contracts share a URI.

## Independent review and repairs

A fresh reviewer identified five integration defects. All are addressed:

1. The composed inspector selected the first same-URI contract revision. An internal source
   revision context and document-scoped provider now preserve exact source-name pins.
2. Viewer workflow-root changes left catalog selection stale. Selection callbacks and live
   details now adopt the viewer's authored root.
3. The new catalog subpath advertised a CommonJS export pointing to an imperative viewer.
   The optional subpath is explicitly ESM-only and verified with a downstream browser bundle.
4. External contract references bypassed fully supplied pins. Unpinned reference acquisition
   now uses uniquely supplied revisions and diagnoses ambiguous authority.
5. Dynamically acquired Arazzo sources omitted their own source dependencies. Those sources
   now recurse within the shared catalog/reference budgets with cycle detection and coverage.

Focused regressions reproduce the revision/reference/dependency defects and pass after repair.
The full suite, production build and browser acceptance were rerun after the fixes. Browser
checks additionally caught and corrected narrow select overflow and explicit control labels.
No independent-review finding is deferred. Package lint's three errors predate this change:
`test/scenario-standalone.test.tsx` lines 101/106 and `test/scenario-ui.test.tsx` line 101.

## Reproduce

From the repository root, load the pinned Node version first:

```bash
source /home/mkogan/.nvm/nvm.sh
nvm use
npm test --workspace=@jentic/arazzo-ui
npm run typescript:check-types --workspace=@jentic/arazzo-ui
npm run build --workspace=@jentic/arazzo-ui
npm run test:declarations --workspace=@jentic/arazzo-ui
node packages/jentic-arazzo-ui/scripts/check-catalog-export.mjs
openspec validate add-workflow-capability-catalog --strict --json
```

Serve `packages/jentic-arazzo-ui/build` at port 3000, then from the UI package run
`npx playwright test test/e2e/catalog.spec.ts`. The walkthrough asserts that the loaded script
is the production hashed standalone bundle. Build before running it; the default Vite dev
server does not satisfy that production assertion.
