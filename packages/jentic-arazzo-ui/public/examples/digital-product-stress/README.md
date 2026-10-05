# Digital product workflow stress pack

A larger companion to [the small purchase example](../digital-product/README.md), using the same
fictional domain. The main HTTP document has **18 workflows and 15 contract-backed API operations**.
The event document adds **four workflows, eight AsyncAPI send/receive operations and four message
types**. Focused fixtures exercise long metadata, recursion, depth, row limits and diagnostics.

This is broad feature coverage, not a claim to cover every possible combination or to implement
the APIs. It is intended for inspecting sequence and relationship diagrams. Runtime outcomes
remain conditional; the viewer does not evaluate criteria, choose a branch or run retries.

## Start here

Run the viewer from the repository root:

```sh
npm run dev --workspace=@jentic/arazzo-ui
```

Prepend the origin printed by Vite to one of these document paths:

| Document | URL path | Recommended starting workflow |
| --- | --- | --- |
| [HTTP orchestration](arazzo.yaml) | `/examples/digital-product-stress/arazzo.yaml` | `full-stress-journey` |
| [Event-based purchase](event-based.arazzo.yaml) | `/examples/digital-product-stress/event-based.arazzo.yaml` | `event-driven-purchase` |
| [Long metadata](boundaries/metadata-heavy.arazzo.yaml) | `/examples/digital-product-stress/boundaries/metadata-heavy.arazzo.yaml` | `metadata-heavy-entry` |
| [Recursion](boundaries/recursion.arazzo.yaml) | `/examples/digital-product-stress/boundaries/recursion.arazzo.yaml` | `recursive-A` |
| [Depth limit](boundaries/depth-limit.arazzo.yaml) | `/examples/digital-product-stress/boundaries/depth-limit.arazzo.yaml` | `layer-0` |
| [Row limit](boundaries/row-limit.arazzo.yaml) | `/examples/digital-product-stress/boundaries/row-limit.arazzo.yaml` | `row-limit` |
| [Unavailable targets](diagnostics/unavailable-targets.arazzo.yaml) | `/examples/digital-product-stress/diagnostics/unavailable-targets.arazzo.yaml` | `diagnostic-probe` |
| [Prerequisite cycle](diagnostics/prerequisite-cycle.arazzo.yaml) | `/examples/digital-product-stress/diagnostics/prerequisite-cycle.arazzo.yaml` | `cycle-A` |

Select **Sequence** to see authored interactions. Select **All workflows** for the relationship
overview. Expand deeper calls individually; direct calls are initially expanded. A fully expanded
HTTP journey contains 48 scene rows and 17 workflow/source participants, so horizontal and vertical
scrolling are expected. The default scene is smaller because deeper calls initially stay collapsed.

The current renderer still omits HTTP response arrows and uses workflow/API-source lifelines.
The [HTTP reference sequence](http-sequence.puml) and [event reference sequence](event-sequence.puml)
show the intended system-level exchanges and possible recovery paths. Adding these examples does
not change the renderer.

Captured previews: [expanded HTTP journey](previews/http-expanded-1440.png),
[compensation](previews/compensation-1440.png), and [event sequence](previews/events-1440.png).
The `previews` directory also contains captures at a constrained 480-pixel width.

## Contracts and inputs

| File | Contents |
| --- | --- |
| [coordinator.openapi.yaml](coordinator.openapi.yaml) | Purchase, activation, readiness, state read/update |
| [inventory.openapi.yaml](inventory.openapi.yaml) | Reserve, inspect and release |
| [payment.openapi.yaml](payment.openapi.yaml) | Capture, reconcile original attempt and refund |
| [license.openapi.yaml](license.openapi.yaml) | Issue, reconcile original issuance and revoke |
| [events.asyncapi.yaml](events.asyncapi.yaml) | PurchaseRequested, PurchaseCompleted, ActivationReported, AuditRecorded |
| [inputs.json](inputs.json) | HTTP root input, including structured context with false/zero/null |
| [event-inputs.json](event-inputs.json) | Event-client input |
| [worker-inputs.json](worker-inputs.json) | Server-configured purchase-worker input |
| [audit-worker-inputs.json](audit-worker-inputs.json) | Server-configured activation-audit-worker input |
| [scenarios.json](scenarios.json) | 27 named scenarios with entry points and expected behavior |

All contract URLs are relative to their Arazzo document. Keep the whole directory when using a
tool that resolves source descriptions. Servers, credentials, authorization references and
license material are fictional. Structured parameters use input expressions so the published
Arazzo schema can validate them while their JSON input examples retain full object values.

The second batch call uses a distinct purchase ID (`-B`), product (`digital-upgrade`), authorization
reference and amount (2499 minor units). It is a second separately authorized purchase, not a
retry of the first item (`-A`, 1299 minor units). Call-step outputs capture each occurrence's own
license ID immediately instead of treating the callee's latest outputs as a global shared result.

## HTTP feature coverage

| Feature | Inspect this workflow or step |
| --- | --- |
| Explicit prerequisite established before processing | `full-stress-journey.initialize`, then `batch-fulfilment.dependsOn` |
| Two differently mapped calls to the same callee | `batch-fulfilment.first-item` and `second-item` |
| Five nested call levels | full journey → batch → item → prepare → reserve/capture → leaf workflow |
| Authoritative price/product/currency checks | `reserve-inventory.reserve-product` |
| Reusable parameter value override | Operation keys derived from each purchase ID |
| Reusable failure actions and matching step override | `reserve-inventory` and its reserve step |
| Delayed bounded retry of the current operation | `reserve-inventory`, two retries at 1s |
| Recovery workflow before retry | `capture-authorized-payment` → `reconcile-payment`, three retries at 0.5s |
| Retry after a local recovery step | `step-recovery-probe.require-ready` → `refresh-state` → retry source step |
| Normal success skips a recovery-only step | `step-recovery-probe` success goto `finish` |
| Failure goto another workflow | Declined capture → `abort-purchase`; rejected issuance → `compensate-purchase` |
| Success goto another workflow | `resume-existing-purchase` → `record-ready` |
| Success goto another step | Compensation skips revoke for ABSENT/REVOKED license |
| Ordered compensation | Observe → optional revoke → refund → release → record FAILED |
| Polling and exhausted retries | `poll-purchase-until-ready`, three retries at 1s, then end |
| Success/failure termination | Reusable `finish` and `stop-and-reconcile` actions |
| Full criteria, mappings and structured data | Call/operation details and metadata fixture |

`goto` is a one-way control transfer. A workflow `retry` target is recovery work followed by
retrying the source step. A local `stepId` retry target likewise executes the recovery step and
then retries the source; it is not a transfer to the next ordinary step. Prerequisites establish
dependence and do not themselves invoke another workflow.

Retries keep the original idempotency key. An exhausted retry does not authorize subsequent
issuance or cleanup. Compensation starts from a definite issuance rejection with known captured
payment and reservation IDs, then reads the original license before deciding whether to revoke.
It does not infer that an uncertain issuance was absent. Each unsuccessful cleanup step stops
the path; the diagram does not assert that all later compensation succeeded.

Workflow-output availability and failure propagation differ across engines. The authored caller
guards require CAPTURED evidence before issuance. These fixtures specify intended relationships
and criteria; they do not certify the installed runner's handling of every exception or 1.1 field.

## Event-based flow

`events.asyncapi.yaml` uses AsyncAPI 3.0.0. Each operation declares `send` or `receive` from the
orchestration application's perspective. Arazzo steps use the matching operation and `action`.
The same channel/message contract serves the corresponding producer and consumer.

```text
Orchestrating client -- PurchaseRequested --> broker --> Purchase worker
Purchase worker -- supplied HTTP fulfilment workflow --> confirmed READY state
Purchase worker -- PurchaseCompleted --> broker --> Orchestrating client
Orchestrating client -- ActivationReported --> broker --> Audit worker
Audit worker -- record actual outcome --> Coordinator HTTP API
Audit worker -- AuditRecorded --> broker --> Orchestrating client
Orchestrating client -- read authoritative state after both receives --> Coordinator HTTP API
```

These are three independent actors/workflow instances. Start the relevant consumers before
publication. Purchase IDs scope correlation; stable event IDs support deduplication. Service
credentials come from worker configuration, never from an event payload. The example workers are
scoped to a supplied purchase ID; a real consumer dispatcher would start an instance for each
accepted purchase.

The purchase worker's standard external call points to the supplied `fulfil-item` workflow in
`arazzo.yaml`. The current viewer classifies it as external and does not inline it. Open the HTTP
document separately to inspect its internal calls. Before publishing readiness, the worker reads
the authoritative coordinator state rather than assuming a workflow return implies READY.

Receive steps match `correlationId` against `$message.header#/correlationId` and wait up to 12,000ms.
The completion receive also requires READY and a matching purchase ID. An unrelated event does
not complete it. The client has two bounded receive retries at 0.5s intervals, followed by a
one-way HTTP polling fallback. It does not republish the purchase command. A FAILED completion
fails the same criteria; retrying the receive and polling cannot turn FAILED state into READY.

The audit receipt must name the original activation event ID as well as the purchase. The final
HTTP read depends on both `await-ready` and `await-audit`, demonstrating an explicit asynchronous
join. `RECORDED` acknowledges receipt of the actual device outcome, including FAILED; it is not
an activation-success claim. `action: send` does not assert broker acknowledgment or delivery.

## Boundary fixtures and validity

| Fixture | Status and expected observation |
| --- | --- |
| Main HTTP/event documents | Well-formed, contract-backed reference descriptions; conditional outcomes are unevaluated |
| Metadata | Well-formed; long identity and structured defaults/extensions remain inspectable |
| Row limit | Well-formed synthetic read-only workload; 250 authored steps, 200 displayed rows with an omission marker |
| Depth limit | Well-formed finite call chain; expansion stops visibly beyond eight levels |
| Recursion | Structurally valid but intentionally nonterminating execution graph; inspect only |
| Unavailable targets | Deliberately incomplete/semantically invalid: missing local target, absent external file, unqualified operation |
| Prerequisite cycle | Deliberately semantically invalid; prerequisite-cycle diagnostics must remain visible |

An external source that the viewer did not fetch is not automatically an invalid source. The
diagnostic fixture includes both a supplied external document and an actually absent one so that
the distinction is visible. A structural schema pass alone cannot establish reference correctness
or rule out prerequisite cycles. The recursion probe is not a bounded business retry loop.

No single valid business workflow naturally reaches every rendering boundary. These fixtures
make the limits explicit without introducing broken references into the reference purchase flow.

## Verification

Checks use the published [Arazzo 1.1 schema](https://spec.openapis.org/arazzo/1.1/schema/2026-04-15),
the published [OpenAPI 3.1 document schema](https://spec.openapis.org/oas/3.1/schema/2022-10-07),
and the official [AsyncAPI parser](https://github.com/asyncapi/parser-js). Local checks validate
operation/action/prerequisite targets, required workflow mappings, HTTP and event examples, and
input examples. The real viewer loader/model checks repeated occurrences, transfer/recovery
classes, event direction and boundary markers; generated Mermaid is checked for parseability.

Built-browser checks cover default navigation, expansion, event direction, details and limits.
They inspect the current built viewer rather than execute APIs or broker transports. The 27
scenarios are documented expectations; a schema pass or screenshot does not prove their live
runtime outcomes. See [verification.json](verification.json) for the recorded checks and limits.

The event semantics follow [Arazzo 1.1.0](https://spec.openapis.org/arazzo/v1.1.0.html) and
[AsyncAPI 3.0.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0).
