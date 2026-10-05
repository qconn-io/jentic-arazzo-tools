# Connected workflow UX verification (2026-10-05)

Change: `visualize-chained-workflows`. This report covers tasks 11–17 and reconciles the current delta spec with automated and built-browser evidence. Earlier verification reports remain historical evidence for the semantic foundation. No standard relationship is inferred from prose or extensions.

## Packaging and verification

The user authorized exclusion of `openapi_samples`. `copy-public-assets.mjs` excludes that exact directory while copying other public assets recursively. The ignored D1 sample is neither removed nor bundled and remains outside automated tests. The production build generates both ESM/UMD entry points, CSS, rolled declarations, and the hashed standalone app.

- UI suite: **30 files, 225 tests passed**.
- UI TypeScript check passed.
- UI lint passed with **zero errors and 36 existing warnings**.
- Full build passed: ESM/UMD UI and standalone entries, CSS, declarations, hashed app. `build/openapi_samples` is absent.
- Both rolled-declaration consumer checks passed, including unavailable imports for private sequence scene, occurrence path, caller frame, detail projection and session types.
- Built Chromium walkthrough: **17 recorded task outcomes passed**, desktop and constrained widths, including all six D1 adapter calls.
- Independent review rechecked the fixes and reported no remaining Critical or Important findings.
- Strict OpenSpec validation and whitespace checks passed.

These results refer to fresh checks of the final implementation; no local sample is used by the UI test suite.

## Browser reader tasks

Run from the repository root with Playwright and Chromium installed independently of production dependencies:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node openspec/changes/visualize-chained-workflows/ux-browser.mjs
```

In this environment Chromium needed separately extracted system libraries; `LD_LIBRARY_PATH=/tmp/arazzo-browser-libs/extracted/usr/lib/x86_64-linux-gnu` supplied them. Evidence is in [observations.json](browser-evidence/ux/observations.json). Screenshots include overview, mapping details, sequence, canvas close-ups, recursion, difficult fixtures, and Docs/Diagram/Split modes at 1440×1000 and 480×1000. This is a scripted browser reader-task walkthrough plus screenshot inspection, not an independent human usability study.

Passed journeys: default Docs → All workflows → workflow → Sequence; two differently mapped occurrences; expand only one deeper call; inspect downstream steps; inspect falsy caller mappings and callee declarations; keyboard expansion, detail close and exact caller return; expansion retention across modes; collapse; recursion, external, missing and ambiguous explanations. SVG text stays at 11–13px; bounding boxes fit the canvas, and narrow canvases actually scroll horizontally. The narrow workflow selector has at least 180px usable width. Visual inspection found and corrected an initially cramped selector; long authored names remain available in the selector, details and list.

Failed runs are accounted for: the first harness used uppercase mode accessible names, whereas actual names are lowercase. The preserved [first-walkthrough.json](browser-evidence/ux/first-walkthrough.json) records a later overly strict D1 assertion requiring more than three interaction rows. A valid call + downstream operation + structural return has exactly three rows. The harness now checks the actual callee operation derived from the loaded document. These were instrumentation failures; they do not establish reader-task failures. Review exposed actual behavior failures documented below, all corrected and retested.

## D1 standard sample

Local file: `packages/jentic-arazzo-ui/public/openapi_samples/workflows/d1-wallet-adapter-standard.arazzo.yaml`.

SHA-256: `e999c9f24b90c61b99e1a788a01597ce5e61d9f8d56ccfc1881599255cab58bb`.

Overview discovers exactly six standard adapter calls. Every selected adapter shows its actual downstream operation and structural continuation. Descriptive client workflows retain zero inferred call edges. Selected workflows, callee IDs, operation IDs and screenshots are recorded in observations.

| Adapter workflow | Callee | Observed operation |
| --- | --- | --- |
| adapter-google-bootstrap-catalogue-offers | abt-catalogue-discovery | query-products |
| adapter-shared-initial-wallet-purchase-purchase | abt-initial-issuance-basket | create-basket |
| adapter-wallet-stored-value-topup-offers | abt-catalogue-discovery | query-products |
| adapter-wallet-stored-value-topup-purchase | abt-stored-value-topup-order | create-basket |
| adapter-wallet-product-purchase-offers | abt-catalogue-discovery | query-products |
| adapter-wallet-product-purchase-purchase | abt-fare-product-order | create-basket |

## Review and failed-check reconciliation

An independent review found no critical issues and three important failures: unavailable/recursive calls dropped conditional actions; graph Call buttons depended on bounded sequence rows; rejected caller requests survived unrelated controlled selection. Fixes retain actions after boundary markers, construct graph root call occurrences directly, and cancel pending caller requests on selection changes and explicit selection/clear requests even when a controlling prop remains unchanged. Regression tests cover each case plus related callee selection acceptance.

Minor findings were also resolved: missing recovery targets have no fabricated return arrow or return label; workflow prerequisite annotations open complete context details; row-limit controls open complete workflow documentation, including omitted root content. Details close restores keyboard focus. Caller return preserves exact occurrence focus and expansion across modes.

Meaningful red runs reproduced action loss, nonresponsive graph calls and stale caller frames. Integrated lint initially raced the build's clean phase while scanning the deleted build directory; lint was rerun after build. A large-document test initially timed out and then queried the graph's accessible label in Docs, producing a large failure report; it now checks `Inspect large.step209` and allows time for the 210-step rendering. Screenshot review also found and removed a duplicate general-status paragraph in Diagram; the shared status control is now the single home for those explanations across modes. Semantic coverage previously tied to raw JSON on the canvas now asserts full unchanged values in details/documentation and concise summaries in diagrams.

## Scenario reconciliation

All named checks below are package-local test files under `packages/jentic-arazzo-ui/test`. Current suites cover the retained foundation and expanded scenarios together. Browser outcomes supplement automated semantics for navigation, readable geometry, keyboard focus and real D1 comprehension.

### Versioned Inspection and Honest Capability Reporting

| Scenario | Checks / outcomes |
| --- | --- |
| Patch version and description version | inspection.test.ts; component-loading.test.tsx; documentation.test.ts |
| Selected Arazzo 1.1 inspection | inspection.test.ts; component-loading.test.tsx; documentation.test.ts |
| New feature in an older feature version | inspection.test.ts; component-loading.test.tsx; documentation.test.ts |
| Parseable unsupported Arazzo version | inspection.test.ts; component-loading.test.tsx; documentation.test.ts |
| Unsupported parsing capability | inspection.test.ts; component-loading.test.tsx; documentation.test.ts |
| Unsupported action kind | inspection.test.ts; component-loading.test.tsx; documentation.test.ts |

### Transport-Neutral Operation Inspection

| Scenario | Checks / outcomes |
| --- | --- |
| Asynchronous send and receive | inspection.test.ts; model.test.ts; workflow-flow-card.test.tsx; documentation.test.ts |
| Opaque source locators | inspection.test.ts; model.test.ts; workflow-flow-card.test.tsx; documentation.test.ts |
| Unknown or ambiguous source | inspection.test.ts; model.test.ts; workflow-flow-card.test.tsx; documentation.test.ts |
| Conflicting locators | inspection.test.ts; model.test.ts; workflow-flow-card.test.tsx; documentation.test.ts |
| Querystring value preservation | inspection.test.ts; model.test.ts; workflow-flow-card.test.tsx; documentation.test.ts |

### Unknown Content and Document Provenance Preservation

| Scenario | Checks / outcomes |
| --- | --- |
| Unknown fields and extensions | loader.test.ts; inspection.test.ts; architecture-review.test.ts |
| Reused declaration provenance | loader.test.ts; inspection.test.ts; architecture-review.test.ts |
| Authored identity differs from retrieval location | loader.test.ts; inspection.test.ts; architecture-review.test.ts |
| Unsupported schema dialect | loader.test.ts; inspection.test.ts; architecture-review.test.ts |
| No injected source metadata | loader.test.ts; inspection.test.ts; architecture-review.test.ts |
| Authored field resembles viewer bookkeeping | loader.test.ts; inspection.test.ts; architecture-review.test.ts |

### Document Overview Access and Navigation Compatibility

| Scenario | Checks / outcomes |
| --- | --- |
| Uncontrolled initial view | navigation.test.tsx; connected-navigation.test.tsx; browser observations (both widths) |
| Explicit overview and round-trip navigation | navigation.test.tsx; connected-navigation.test.tsx; browser observations (both widths) |
| Overview from default Docs mode | navigation.test.tsx; connected-navigation.test.tsx; browser observations (both widths) |
| Switching view modes | navigation.test.tsx; connected-navigation.test.tsx; browser observations (both widths) |
| Many workflows and limited width | navigation.test.tsx; connected-navigation.test.tsx; browser observations (both widths) |
| Controlled workflow selection | navigation.test.tsx; connected-navigation.test.tsx; browser observations (both widths) |
| Overview callback compatibility | navigation.test.tsx; connected-navigation.test.tsx; browser observations (both widths) |

### Deterministic Loading and Authored Reference Preservation

| Scenario | Checks / outcomes |
| --- | --- |
| Missing component before or after valid references | loader.test.ts; loading-cancellation.test.tsx; architecture-review.test.ts |
| Missing component collection | loader.test.ts; loading-cancellation.test.tsx; architecture-review.test.ts |
| Reused action contains a missing parameter | loader.test.ts; loading-cancellation.test.tsx; architecture-review.test.ts |
| Document retrieval after recovery | loader.test.ts; loading-cancellation.test.tsx; architecture-review.test.ts |
| Reference-shaped literal data | loader.test.ts; loading-cancellation.test.tsx; architecture-review.test.ts |
| Fatal load failure | loader.test.ts; loading-cancellation.test.tsx; architecture-review.test.ts |

### Consistent Semantics and Scoped Step Identity

| Scenario | Checks / outcomes |
| --- | --- |
| Identical step IDs with different actions | model.test.ts; docs-ownership.test.tsx; occurrence-details.test.ts |
| Bare local prerequisite is context dependent | model.test.ts; docs-ownership.test.tsx; occurrence-details.test.ts |
| Replacement changes only shared components | model.test.ts; docs-ownership.test.tsx; occurrence-details.test.ts |

### Action Precedence and Channel Separation

| Scenario | Checks / outcomes |
| --- | --- |
| Inspection ordering is not execution prediction | model.test.ts; workflow-flow.test.ts; documentation.test.ts |
| Step action precedes an overlapping default | model.test.ts; workflow-flow.test.ts; documentation.test.ts |
| Partial override and additional action | model.test.ts; workflow-flow.test.ts; documentation.test.ts |
| Empty step action list | model.test.ts; workflow-flow.test.ts; documentation.test.ts |
| Equal names across channels or types | model.test.ts; workflow-flow.test.ts; documentation.test.ts |
| Unresolved action alongside defaults | model.test.ts; workflow-flow.test.ts; documentation.test.ts |

### Reusable Action Parameter Overrides

| Scenario | Checks / outcomes |
| --- | --- |
| Override and omitted override | loader.test.ts; model.test.ts; verification-review.test.tsx |
| Falsy and structured literals | loader.test.ts; model.test.ts; verification-review.test.tsx |
| Authored expressions | loader.test.ts; model.test.ts; verification-review.test.tsx |

### Complete Document Relationship Graph

| Scenario | Checks / outcomes |
| --- | --- |
| Workflow prerequisite direction | graph-overview.test.ts; graph-edges.test.tsx; workflow-flow.test.ts |
| Sub-workflow and action transitions | graph-overview.test.ts; graph-edges.test.tsx; workflow-flow.test.ts |
| Same label across parallel action channels | graph-overview.test.ts; graph-edges.test.tsx; workflow-flow.test.ts |
| Explicit self-loop | graph-overview.test.ts; graph-edges.test.tsx; workflow-flow.test.ts |
| Unlinked document | graph-overview.test.ts; graph-edges.test.tsx; workflow-flow.test.ts |

### Cycle Discrimination and Readable Layout

| Scenario | Checks / outcomes |
| --- | --- |
| Runtime and mixed relationships | graph-layout.test.ts; graph-overview.test.ts; graph-edges.test.tsx |
| Prerequisite cycle and unrelated edges | graph-layout.test.ts; graph-overview.test.ts; graph-edges.test.tsx |
| Prerequisite self-loop | graph-layout.test.ts; graph-overview.test.ts; graph-edges.test.tsx |
| Dense and disconnected relationships | graph-layout.test.ts; graph-overview.test.ts; graph-edges.test.tsx |

### Step Prerequisites and Authored Order

| Scenario | Checks / outcomes |
| --- | --- |
| Multiple local prerequisites | workflow-flow.test.ts; workflow-flow-card.test.tsx; model.test.ts |
| Cross-workflow prerequisite | workflow-flow.test.ts; workflow-flow-card.test.tsx; model.test.ts |
| Missing or external prerequisite step | workflow-flow.test.ts; workflow-flow-card.test.tsx; model.test.ts |

### Classified Target Navigation

| Scenario | Checks / outcomes |
| --- | --- |
| Local workflow navigation | navigation.test.tsx; sequence-ui.test.tsx; workflow-flow-card.test.tsx |
| External source versus local name collision | navigation.test.tsx; sequence-ui.test.tsx; workflow-flow-card.test.tsx |
| Invalid external source or missing target | navigation.test.tsx; sequence-ui.test.tsx; workflow-flow-card.test.tsx |
| Return to the calling occurrence | navigation.test.tsx; sequence-ui.test.tsx; workflow-flow-card.test.tsx |
| Same callee reached from different calls | navigation.test.tsx; sequence-ui.test.tsx; workflow-flow-card.test.tsx |

### Destination-Aware Step Focus

| Scenario | Checks / outcomes |
| --- | --- |
| Cross-workflow step focus | diagram-focus.test.tsx; injected-navigation.test.tsx; navigation.test.tsx; sequence-ui.test.tsx |
| Already-active destination | diagram-focus.test.tsx; injected-navigation.test.tsx; navigation.test.tsx; sequence-ui.test.tsx |
| Superseding navigation with duplicate IDs | diagram-focus.test.tsx; injected-navigation.test.tsx; navigation.test.tsx; sequence-ui.test.tsx |
| Cancellation or replacement | diagram-focus.test.tsx; injected-navigation.test.tsx; navigation.test.tsx; sequence-ui.test.tsx |
| Controlled destination accepts the request | diagram-focus.test.tsx; injected-navigation.test.tsx; navigation.test.tsx; sequence-ui.test.tsx |
| Missing destination step | diagram-focus.test.tsx; injected-navigation.test.tsx; navigation.test.tsx; sequence-ui.test.tsx |
| Controlled node selection | diagram-focus.test.tsx; injected-navigation.test.tsx; navigation.test.tsx; sequence-ui.test.tsx |
| Clearing a controlled highlight | diagram-focus.test.tsx; injected-navigation.test.tsx; navigation.test.tsx; sequence-ui.test.tsx |

### Documentation Prerequisites and Ownership

| Scenario | Checks / outcomes |
| --- | --- |
| Workflow and step prerequisites in documentation | docs-ownership.test.tsx; documentation.test.ts; occurrence-details.test.ts |
| Calling workflow owns the card | docs-ownership.test.tsx; documentation.test.ts; occurrence-details.test.ts |
| Legacy call-node ownership | docs-ownership.test.tsx; documentation.test.ts; occurrence-details.test.ts |
| Duplicate step IDs in documentation | docs-ownership.test.tsx; documentation.test.ts; occurrence-details.test.ts |
| Effective action details | docs-ownership.test.tsx; documentation.test.ts; occurrence-details.test.ts |

### Mermaid Relationship Semantics

| Scenario | Checks / outcomes |
| --- | --- |
| Prerequisites and multiple transitions | documentation.test.ts; verification-review.test.tsx; connected-mermaid.test.ts |
| Goto versus retry recovery | documentation.test.ts; verification-review.test.tsx; connected-mermaid.test.ts |
| Labels requiring escaping | documentation.test.ts; verification-review.test.tsx; connected-mermaid.test.ts |

### Mermaid Inspection Sequence

| Scenario | Checks / outcomes |
| --- | --- |
| Authored asynchronous interaction | documentation.test.ts; connected-mermaid.test.ts; resolution-status.test.tsx |
| Ambiguous source participant | documentation.test.ts; connected-mermaid.test.ts; resolution-status.test.tsx |
| Declared source has not been fetched | documentation.test.ts; connected-mermaid.test.ts; resolution-status.test.tsx |
| Action and parameter parity | documentation.test.ts; connected-mermaid.test.ts; resolution-status.test.tsx |
| Participant identity and escaped labels | documentation.test.ts; connected-mermaid.test.ts; resolution-status.test.tsx |
| Unsupported version sequence | documentation.test.ts; connected-mermaid.test.ts; resolution-status.test.tsx |

### Connected Local Workflow Sequences

| Scenario | Checks / outcomes |
| --- | --- |
| Direct call contains downstream interactions | sequence-model.test.ts; sequence-ui.test.tsx; connected-mermaid.test.ts; browser observations |
| Deeper call expansion and collapse | sequence-model.test.ts; sequence-ui.test.tsx; connected-mermaid.test.ts; browser observations |
| Repeated callee with distinct mappings | sequence-model.test.ts; sequence-ui.test.tsx; connected-mermaid.test.ts; browser observations |
| Structural return is not an outcome assertion | sequence-model.test.ts; sequence-ui.test.tsx; connected-mermaid.test.ts; browser observations |
| Goto, retry, and prerequisite distinctions | sequence-model.test.ts; sequence-ui.test.tsx; connected-mermaid.test.ts; browser observations |
| Recursion and bounded expansion | sequence-model.test.ts; sequence-ui.test.tsx; connected-mermaid.test.ts; browser observations |
| External or missing callee | sequence-model.test.ts; sequence-ui.test.tsx; connected-mermaid.test.ts; browser observations |
| Descriptive implementation association | sequence-model.test.ts; sequence-ui.test.tsx; connected-mermaid.test.ts; browser observations |

### Readable Diagrams and Details on Selection

| Scenario | Checks / outcomes |
| --- | --- |
| Metadata-heavy workflow | occurrence-details.test.ts; sequence-ui.test.tsx; workflow-flow-card.test.tsx; browser observations and screenshots |
| Input and output mapping inspection | occurrence-details.test.ts; sequence-ui.test.tsx; workflow-flow-card.test.tsx; browser observations and screenshots |
| Relevant participants and long labels | occurrence-details.test.ts; sequence-ui.test.tsx; workflow-flow-card.test.tsx; browser observations and screenshots |
| Keyboard interaction | occurrence-details.test.ts; sequence-ui.test.tsx; workflow-flow-card.test.tsx; browser observations and screenshots |

### Contextual Inspection Status

| Scenario | Checks / outcomes |
| --- | --- |
| Sources not checked | resolution-status.test.tsx; connected-fixtures.test.ts; sequence-ui.test.tsx |
| Reference expansion bypassed | resolution-status.test.tsx; connected-fixtures.test.ts; sequence-ui.test.tsx |
| Missing target needs attention | resolution-status.test.tsx; connected-fixtures.test.ts; sequence-ui.test.tsx |

### Workflow Chaining Comprehension Acceptance

| Scenario | Checks / outcomes |
| --- | --- |
| Find and follow a chain | ux-browser.mjs → browser-evidence/ux/observations.json and screenshots |
| D1 standard composition and its boundary | ux-browser.mjs → browser-evidence/ux/observations.json and screenshots |
| Usability across modes and difficult documents | ux-browser.mjs → browser-evidence/ux/observations.json and screenshots |
