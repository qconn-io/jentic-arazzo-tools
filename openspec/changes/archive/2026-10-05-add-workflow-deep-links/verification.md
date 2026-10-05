# Workflow deep-link verification

Verified on 2026-10-05 against the working-tree implementation. The browser record identifies
production JavaScript/CSS hashes and a digest of UI source/script inputs. Screenshots come
from the production standalone build at 1440 and 480 pixels.

| Check | Result | Evidence |
| --- | --- | --- |
| UI suite | 273 tests pass in 39 files | [Log](verification-logs/ui-tests.log) |
| Type check | Pass | [Log](verification-logs/types.log) |
| Production build | UMD, ESM, declarations, API Extractor and standalone app pass | [Log](verification-logs/build.log) |
| Declaration consumers | Both rolled entry points compile location types, helpers, adapters and callback examples without private imports | [Log](verification-logs/declarations.log) |
| Package lint | 0 errors; 36 warnings in existing files | [Log](verification-logs/lint.log) |
| OpenSpec strict validation | Pass | [Record](verification-logs/openspec.json) |
| Browser walkthrough | 38 passing observations; 0 browser errors | [Record](browser-evidence/observations.json), [Log](verification-logs/browser.log) |

The browser walkthrough copies the capture operation under `batch-fulfilment.second-item`,
opens it in a fresh session, checks the exact call path and authored request mappings,
checks the second item's caller values (`digital-upgrade`, `2499`, purchase suffix `-B`,
and upgrade authorization), and verifies that the Close details control receives focus.
It covers Docs, Sequence, Flowchart, Diagram and Split destinations, overview, revision
mismatch, missing call segments, search without history writes, Back/Forward with caller
return, and nonoverlapping toolbar controls/page containment at both widths.

Focused tests cover codec versions/fields/limits, Unicode and URL preservation, canonical
digests, optional-state adapters, repeated calls, scoped duplicate step IDs, operation versus
authored action identity, authored-only actions, row/depth/recursion boundaries, minimum
expansion, caller return, view switching, controlled conflicts and request emission, document
handoff and obsolete loads, Copy link and uploads, local-only history, and popstate without
push loops. Public declaration consumers retain the private model/session boundary.

Independent review found three issues: outgoing history caller contamination, lost authored
action identity without an occurrence, and standalone defaults conflicting with their initial
view. Focused regressions and the browser round trip verify the corrections. Additional probes
cover unaddressable local history and host-controlled root/mode requests; accepted host updates
do not echo those requests or commit unaccepted destinations to browser history.

## Reproduce

From the repository root:

```bash
source /home/mkogan/.nvm/nvm.sh
nvm use
npm test --workspace=@jentic/arazzo-ui
npm run typescript:check-types --workspace=@jentic/arazzo-ui
npm run build --workspace=@jentic/arazzo-ui
npm run test:declarations --workspace=@jentic/arazzo-ui
npm run lint --workspace=@jentic/arazzo-ui
openspec validate add-workflow-deep-links --strict --json
node openspec/changes/add-workflow-deep-links/browser-walkthrough.mjs
```

The browser script runs a loopback server with an ephemeral port. It uses Playwright with
Chromium from `PLAYWRIGHT_MODULE` or the existing installation at
`/tmp/arazzo-browser-smoke/node_modules/playwright/index.mjs`; a fresh machine must supply
its own installation/browser. No new runtime dependency was added.

## Boundaries

[The package README](../../../packages/jentic-arazzo-ui/README.md#workflow-locations-and-shareable-links)
documents source identity, prop precedence, host document handoff, optional state, digest
limitations and history. A digest detects authored changes without pinning historical remote
bytes. Inline/upload sources without a persistent host identity remain session-only and are
not claimed as shareable. Web Crypto requires a secure browser context. Cross-document
headless locations wait for the host to supply their document. Scene budgets and authored
inspection semantics remain unchanged; no expressions or actions are evaluated, and source
contracts are not fetched or verified. No parser, resolver, validator or runner code changed.
