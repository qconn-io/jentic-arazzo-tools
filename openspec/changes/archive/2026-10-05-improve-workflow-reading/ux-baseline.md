# Fresh workflow UX baseline

## Scope and method

Assessed current source at commit `87f272b32f629a2332f19f399acf7e35fb8cac09`, served by Vite at `http://127.0.0.1:4175`, using headless Chromium through Playwright. The audit covered all nine Arazzo documents, all 45 workflow sequences at desktop width, all 27 authored stress scenarios' relevant detail surfaces, and all seven small-pack steps. All nine roots were inspected at 480 pixels as well as 1440; root flowchart/split views were checked. The source examples contain 325 authored steps.

The audit generated 183 fresh screenshots and recorded no browser errors in its observation log. This planning change preserves a selected screenshot set and the complete observation JSON; it does not claim to preserve all 183 images. Scenarios were inspected as authored expected cases, not executed against business services. This is a browser/heuristic assessment through Owner and Developer tasks, not measured human-user research.

The development server used:

```bash
source /home/mkogan/.nvm/nvm.sh
nvm use
BROWSER=none npm run dev --workspace=@jentic/arazzo-ui -- --host 127.0.0.1 --port 4175 --strictPort
```

Open `/?document=http%3A%2F%2F127.0.0.1%3A4175%2Fexamples%2Fdigital-product%2Farazzo.yaml` or the equivalent stress path. Use All workflows, select each workflow, open Sequence and its interaction details; inspect root Flowchart/Split and repeat root navigation at 480 pixels. Expand the full stress journey to reveal repeated calls and helper structure. Select first-item/second-item mappings, follow a callee and return, reload a noninitial workflow, click a source contract, and exercise narrow details with Escape/Shift+Tab. Boundary cases have their own documented expansion and documentation controls. Future implementation tasks add a checked-in reproducible Playwright suite.

## Document inventory

| Path relative to examples | Workflows | Authored steps |
| --- | ---: | ---: |
| digital-product/arazzo.yaml | 3 | 7 |
| digital-product-stress/arazzo.yaml | 18 | 30 |
| digital-product-stress/event-based.arazzo.yaml | 4 | 13 |
| digital-product-stress/boundaries/metadata-heavy.arazzo.yaml | 2 | 2 |
| digital-product-stress/boundaries/recursion.arazzo.yaml | 2 | 4 |
| digital-product-stress/boundaries/depth-limit.arazzo.yaml | 12 | 12 |
| digital-product-stress/boundaries/row-limit.arazzo.yaml | 1 | 250 |
| digital-product-stress/diagnostics/unavailable-targets.arazzo.yaml | 1 | 5 |
| digital-product-stress/diagnostics/prerequisite-cycle.arazzo.yaml | 2 | 2 |

## Findings mapped to changes

| Observed current behavior | User implication | Proposed change |
| --- | --- | --- |
| Details contain repeated authored/effective/provenance JSON; request body is primarily in Authored content | Important data/recovery facts require manual reconstruction | Reading |
| Flat workflow selector and separate long Inspect control lists; step 250 exists in docs beyond the 200-row scene | Complete content is accessible, but finding it is laborious | Reading |
| Full stress sequence expands to 48 rows and 17 technical lanes; 3910-pixel scene width and 4938-pixel scroll height | Workflow-control context obscures a business-system explanation | Reading + Systems |
| Whole stress overview fit reaches roughly 0.291 zoom | Graph labels alone are too small to read at whole-document fit | Reading + catalog list discovery |
| 480-pixel header/control overlap and covering details; Escape leaves details open, Shift+Tab reaches background | Narrow and keyboard review are disrupted | Reading |
| Second-item retains 2499, digital-upgrade, and -B mappings; caller return retains occurrence context | Valuable existing identity/navigation behavior to preserve | Reading + locations |
| Reloading capture-authorized-payment returns to full-stress-journey/default Docs | A reviewer cannot reproduce the same finding by copying the current URL | Locations |
| Correct sibling source links open raw YAML in the same browser tab | Source contracts are available but not integrated with workflow inspection | Contracts |
| Client purchase and descriptive server implementation remain separate; standard reserve-and-capture call expands correctly | Existing semantics are sound; a separate explicit system perspective is needed | Systems |
| Event receive timeout/correlation and prerequisites are authored and inspectable; producer/consumer workflows are not connected as system interactions | Event review requires manual cross-workflow reconstruction | Contracts + Systems + guides |
| All 27 scenarios live in a manifest outside current UI navigation | Expected recovery/business cases are useful teaching material but not discoverable in the viewer | Scenario guides |
| Actor metadata is supplied, responsible-team metadata is not | Product ownership requires explicit catalog input | Catalog |
| Viewer loads one current document and has no revision comparison surface | Change-impact review is a new product capability rather than a small diagram tweak | Revision review |

## Existing strengths and limits to retain

Scoped first/second call mappings and caller return work. All nine root flowcharts rendered. Recursion terminates with a visible marker; the depth marker offers layer-9 as a new root; the row marker offers complete documentation, including observation-250. Missing local, unfetched external, and ambiguous targets remain distinguishable. Prerequisite-cycle warnings are visible. These cases do not justify removing bounds or claiming source/execution validation.

The expanded stress scene contains **two** capture operation occurrences. Six similarly named Inspect controls include operation plus retry/goto action controls; they are not six payment operations. Observation files use the corrected count.

## Preserved evidence

- [Summary](browser-evidence/ux-baseline/summary.json), [workflow walkthrough](browser-evidence/ux-baseline/walkthrough.json), [scenario inspection](browser-evidence/ux-baseline/scenarios-inspected.json), [mode checks](browser-evidence/ux-baseline/view-checks.json), and [narrow checks](browser-evidence/ux-baseline/narrow.json).
- [Mapping/return/reload checks](browser-evidence/ux-baseline/interaction-checks.json), [source and keyboard checks](browser-evidence/ux-baseline/extra-checks.json), [boundaries](browser-evidence/ux-baseline/boundaries.json), and [small-step details](browser-evidence/ux-baseline/small-details.json).
- [Small default Docs](browser-evidence/ux-baseline/small-default-docs-1440.png), [client sequence](browser-evidence/ux-baseline/small-client-sequence-1440.png), and [coordinator sequence](browser-evidence/ux-baseline/small-coordinator-sequence-1440.png).
- [Expanded stress desktop](browser-evidence/ux-baseline/http-full-expanded-1440.png), [expanded stress narrow](browser-evidence/ux-baseline/http-full-expanded-480.png), and [overview fit](browser-evidence/ux-baseline/http-overview-fit-1440.png).
- [Second-item mappings](browser-evidence/ux-baseline/mapping-second-item-1440.png), [timeout details](browser-evidence/ux-baseline/scenario-completion-timeout-1440.png), [narrow landing](browser-evidence/ux-baseline/d0-landing-480.png), [narrow details](browser-evidence/ux-baseline/d0-details-480.png), and [source navigation](browser-evidence/ux-baseline/source-contract-navigation-1440.png).

Implementation acceptance must regenerate evidence against the implemented source/build; these images establish the proposal baseline, not future-feature verification.
