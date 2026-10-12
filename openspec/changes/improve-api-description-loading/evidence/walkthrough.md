# Production walkthrough

Final sequential gate: **172/172 passed**, at 1440×1000 and 480×900. Coverage comprises unchanged Petstore and all nine inventoried digital-product/stress documents, all 46 workflows, and 70 root representation states per viewport. `coverage.json` and `identity.json` bind the results to the candidate, source/build/configuration/test inputs, every authored fixture and built artifact. The final candidate's tracked diff SHA-256 is `34693562c4780a5e20041dbe77a3f866d867e8d2ca82a175abdd2d391888705d`; the identity also hashes newly added files under `src` and `test`.

The twelve final gate captures in `walkthrough-captures.json` cover:

| State | Actual outcome |
| --- | --- |
| Untouched sequence with a delayed coordinator and failed payment | Reading stays available; the collapsed API descriptions summary reports current loading/failure coverage. |
| One keyboard activation of API descriptions | All four declarations and source actions are reachable without step selection or technical details. |
| Failed payment Retry | Only payment is retried; focus moves to its stable source context and stays there while the source loads. |
| Delayed completion | All four descriptions become Loaded; completing the coordinator request does not steal focus from the summary. |
| Supported coordinator bytes without its selected operation | Source remains Loaded; the inspector says Operation not found. |
| Step descriptions, workflow diagram, Split and overview | Loading state persists; Split has one shared summary; the overview still exposes all source actions. |
| Long authored name and URL under manual policy | Names, URLs and action labels wrap; manual bulk loading remains explicit; no page-wide overflow. |

Direct final-production captures, `actual-entry-*.png` and `actual-source-list-*.png`, use the unchanged real digital-product descriptions rather than injected missing/failing bytes. `visual-checks.json` records their candidate/build identity, four source names, both viewport sizes, zero page errors and no overflow. Desktop entry and narrow source/long-label captures were visually inspected. These are automated operability and visual-layout observations, not unfamiliar-reader comprehension.

The inventory preserves authored uncertainty for the diagnostic example's unqualified `getLicenseByKey`. Its separate `locatedSource` expectation records `license` only after both current API descriptions load; no authored YAML or snapshot binding was changed.

Initial browser iterations exposed obsolete test assumptions about the previous no-fetch standalone default. Restored-page request guards now allow exact eligible declarations; a synthetic long-flowchart fixture has an explicit local contract response; manual partial-coverage cases explicitly configure manual policy; guide-help checks distinguish guide acquisition from document-authorized API loading. No existing visual/reading budgets or request-authority boundaries were relaxed.

Limitations: the final browser gate uses local fixtures/interception for contract responses and does not test illustrative API-service endpoints, API execution, full schema validity, or unfamiliar-reader comprehension. Supported external API-reference dependencies have component/invalidation coverage, but no new dedicated browser dependency fixture was added. Older development/archival walkthrough suites were not run; the current production gate is the browser acceptance evidence.
