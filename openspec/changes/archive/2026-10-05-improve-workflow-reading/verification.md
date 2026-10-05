# Workflow reading implementation verification

Verified on 2026-10-05 against the working-tree implementation based on `87f272b32f629a2332f19f399acf7e35fb8cac09`. The browser record includes the source diff digest, exact built JavaScript/CSS hashes, and generation time. Screenshots were generated from the production standalone build, not the development server or baseline images.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| UI suite | 244 tests pass in 35 files | [Log](verification-logs/ui-tests.log) |
| Type check | Pass | [Log](verification-logs/type-check.log) |
| Production build | UMD, ESM, declarations, API Extractor, and standalone app pass | [Log](verification-logs/build.log) |
| Declaration consumers | Both entry points pass callback narrowing and private-model boundary checks | [Log](verification-logs/declarations.log) |
| Package lint | 0 errors; 36 warnings in unchanged existing files | [Log](verification-logs/lint.log) |
| OpenSpec strict validation | Pass, no issues | `openspec validate improve-workflow-reading --strict --json` |
| Browser walkthrough | 219 passing observations; 0 browser errors and 0 failed observations | [Record](browser-evidence/acceptance/observations.json) |
| Human comprehension | Protocol prepared; sessions not conducted | [Protocol and result template](comprehension-protocol.md) |

The walkthrough covers all nine documents and all 45 workflow sequences at both 1440 and 480 pixels (90 sequence inspection observations), every small-pack step at both widths (14 observations), root Docs/Diagram/Split presentation, classified overview filters, repeated capture operations/actions, second-item mappings and caller return, event timeout/correlation and polling fallback, recursion/depth navigation, and authored search beyond the 200-row scene budget. The expanded stress scene retains 48 rows. Geometry checks cover sticky participant headings, contained two-dimensional scrolling, full labels on keyboard focus, nonoverlapping header controls, and absence of whole-page horizontal overflow. Keyboard checks cover Escape, origin restoration, narrow Tab/Shift+Tab containment and background exclusion, desktop nonmodal access, and mode switching with a removed-origin fallback.

Focused tests cover container presence and falsy values, exact expressions and scalar types, inherited/overridden/unresolved actions, caller/callee separation, duplicate authored step IDs, controlled search cancellation, covering host-background exclusion, collapsed/removed origin fallback, and initiating diagram-selection focus. Existing docs-ownership, caller navigation, public declarations, and document-loading tests remain passing.

An independent code review found controlled search cancellation and absent-versus-empty output defects. Both were reproduced with failing tests and corrected; scalar type cues were added as well. Additional focus probes corrected exclusion of covered host controls and restoration after documentation collapse or diagram selection. No known review finding is deferred.

## Reproduce

From the repository root, use the selected Node version (26.3.1):

```bash
source /home/mkogan/.nvm/nvm.sh
nvm use
npm test --workspace=@jentic/arazzo-ui
npm run typescript:check-types --workspace=@jentic/arazzo-ui
npm run build --workspace=@jentic/arazzo-ui
npm run test:declarations --workspace=@jentic/arazzo-ui
npm run lint --workspace=@jentic/arazzo-ui
openspec validate improve-workflow-reading --strict --json
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node openspec/changes/improve-workflow-reading/browser-walkthrough.mjs
```

The browser script starts its own loopback static server with an ephemeral port, loads the current hashed production assets, and writes screenshots and observations under `browser-evidence/acceptance/`. It uses an externally installed Playwright with Chromium. Without `PLAYWRIGHT_MODULE`, it uses the existing local audit installation at `/tmp/arazzo-browser-smoke/node_modules/playwright/index.mjs`; a fresh machine must supply its own installation and browser. No new runtime package dependency is required.

## Reading controls and limits

[The package README](../../../packages/jentic-arazzo-ui/README.md#chained-workflow-inspection) documents structured inspection, authored search, relationship filtering, participant/occurrence context, and responsive keyboard behavior. Authored snapshots and provenance remain under the advanced disclosure; default Docs uses shared inspection controls. Exported Markdown retains full values and parameter provenance. No parser, resolver, validator, or runner behavior changed.

Automated success is operability and evidence-access verification. It does not measure an unfamiliar Owner or Developer's ability to explain the purchase or its recovery correctly. Human task outcomes, effort, assistance, and incorrect interpretations remain uncollected; the protocol makes that distinction explicit. Source contracts remain unverified, actions/expressions are not evaluated, and finite scene budgets remain intact.
