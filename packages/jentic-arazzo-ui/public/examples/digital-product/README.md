# Digital product purchase and activation

A small fictional example for reading composed workflows and comparing a workflow diagram with
an end-to-end system sequence. It contains **three Arazzo workflows, four OpenAPI contracts, six
API operations and five system participants**. Every downstream API interaction is authored as
an operation step rather than left only in prose. None of the domain names, endpoints or schemas
come from the D1 sample.

The client buys one digital product. The Purchase Coordinator reserves inventory, captures the
authorized payment and issues one license. The client then retrieves device-bound material and
reports whether activation succeeded or failed.

## Files

| File | Contents |
| --- | --- |
| [arazzo.yaml](arazzo.yaml) | Arazzo 1.1.0 entry document and all three workflows |
| [coordinator.openapi.yaml](coordinator.openapi.yaml) | Purchase, bundle retrieval and activation notification |
| [inventory.openapi.yaml](inventory.openapi.yaml) | Reserve one product and return its current price |
| [payment.openapi.yaml](payment.openapi.yaml) | Capture payment and report its actual state |
| [license.openapi.yaml](license.openapi.yaml) | Issue one license for a paid reservation |
| [client-inputs.json](client-inputs.json) | Example inputs for the client journey |
| [fulfilment-inputs.json](fulfilment-inputs.json) | Example inputs for inspecting the coordinator implementation |
| [sequence.puml](sequence.puml) | Reference system sequence with request/response arrows and business notes |

All source URLs are relative to `arazzo.yaml`. API servers use the reserved `example.test` domain;
they do not host running services. Bearer tokens, payment authorization references and protected
license material are fictional placeholders. Amounts use minor currency units: `1299 EUR` means
EUR 12.99.

## Workflows and perspectives

| Workflow | Perspective and steps |
| --- | --- |
| `client-journey` | Client → Coordinator: purchase → retrieve bundle → report activation |
| `fulfil-purchase` | Coordinator: call `reserve-and-capture` → issue license |
| `reserve-and-capture` | Coordinator → Inventory: reserve; Coordinator → Payment: capture |

`client-journey.purchase` invokes `POST /purchases`. The coordinator performs `fulfil-purchase`
inside that exchange, before returning its response. Its `reserve-and-pay` step makes a standard
Arazzo local workflow call to `reserve-and-capture`, with explicit input and output mappings.
That nested call introduces no extra network request and no extra business-system participant.

The client-facing operation and its server implementation are two views of one exchange. Running
`client-journey` and then running `fulfil-purchase` as another client step would misrepresent that
ordering and could repeat the purchase. They are alternative entry points for inspecting different
perspectives, not instructions to perform the transaction twice.

The coordinator allocates `purchaseId` once, scopes it to the authenticated customer and original
purchase key, and obtains `serviceToken` from its server configuration. These are server inputs;
the client does not supply either one. Before sending 201, the endpoint durably associates the
confirmed purchase with the returned license. This persistence boundary belongs to the endpoint's
contract and is not depicted as another HTTP call.

## Expected system sequence

The PlantUML reference uses the following five lifelines:

```text
Client → Purchase Coordinator → Inventory Service
                             → Payment Service
                             → License Service
Client → Purchase Coordinator (bundle retrieval, then activation notification)
```

The successful path contains these contract-backed exchanges:

| Caller → API owner | Request | Required response/evidence |
| --- | --- | --- |
| Client → Coordinator | `POST /purchases` | `201`, purchaseId, licenseId, READY |
| Coordinator → Inventory | `POST /reservations` | `201`, reservationId, matching product/amount/currency, RESERVED |
| Coordinator → Payment | `POST /captures` | `200`, paymentId, matching reservation/amount/currency, CAPTURED |
| Coordinator → License | `POST /licenses` | `201`, matching purchaseId, licenseId, READY |
| Client → Coordinator | `GET /purchases/{purchaseId}/bundle?deviceId=...` | `200`, matching purchase/license/device, protectedBundle, READY |
| Client → Coordinator | `POST /purchases/{purchaseId}/activation-events` | `204`, report received |

The coordinator's three downstream exchanges occur **before the first exchange's response**.
The reference diagram draws that nesting explicitly. Responses show required contract outcomes
on a planned successful path; they are not observations from a running service. Payment decline
or uncertainty stops the path before license issuance.

Device activation takes place outside the HTTP workflow. `activationOutcome` supplies the actual
device result when replaying the example. An event containing `FAILED` can receive 204: receipt
of that report does not mean the device activated successfully. This is an ordinary inbound HTTP
notification, not an OpenAPI Callback Object or an AsyncAPI message.

## Explicit example metadata

Standard Arazzo workflow calls express composition, but do not define an operation-to-server-
implementation relationship or assign business actors to workflow lifelines. This example uses
these clearly scoped extensions to document those additional facts:

| Extension | Meaning |
| --- | --- |
| Root `x-example-participants` | Participant identifiers and their displayed business-system names |
| Operation-step `x-example-actor` | Participant sending this API request |
| Operation-step `x-example-target` | Participant hosting the API operation |
| Purchase-step `x-example-implementation` | Local implementation workflow enclosed by this request, before its response |

The implementation association contains request-body → workflow-input mappings, descriptions of
server-owned inputs, and workflow-output → response-field mappings. Its expression values are
descriptive bindings for this example; an ordinary Arazzo engine must not execute them as another
step. An actor assigned to an operation step describes the sender of the request; the response
returns in the opposite direction. No `action: receive` is added to a synchronous HTTP step.

These extensions are **example conventions, not standardized Arazzo fields or newly implemented
viewer features**. The current viewer preserves them as authored content and does not use them
to connect the client operation to the server workflow, merge workflow lifelines, or draw HTTP
responses. `sequence.puml` is the explicit reference for that system-level view.

## Inspect in the current viewer

From the repository root:

```sh
npm run dev --workspace=@jentic/arazzo-ui
```

Open the address printed by Vite, then load the example from the same origin:

```text
/examples/digital-product/arazzo.yaml
```

If the URL input requires an absolute URL, prepend the origin shown by Vite. Alternatively,
upload `arazzo.yaml`; the current viewer can inspect the workflows without fetching the source
documents. Uploading only that file does not make its sibling API contracts available to other
tools, so retain the complete directory for source-resolution checks.

1. Open **All workflows**. Expect three workflows and one standard call relationship:
   `fulfil-purchase` → `reserve-and-capture`.
2. Select **fulfil-purchase**, then **Sequence**. Expect the nested reservation and capture
   operations, structural continuation to the caller, and license issuance afterward.
3. Open details on `reserve-and-pay` to inspect caller inputs and declared callee outputs.
4. Select **client-journey** to inspect purchase, bundle retrieval and activation reporting.
5. Compare the current workflow lifelines with `sequence.puml`, which keeps all internal
   orchestration on the Purchase Coordinator lifeline.

This document declares Arazzo 1.1.0 and intentionally uses synchronous HTTP composition. Authored
step order and output references supply its dependencies; no unnecessary asynchronous fields or
redundant step prerequisites are introduced. It is not an exhaustive demonstration of 1.1 features.
Its shape follows the [Arazzo 1.1.0 specification](https://spec.openapis.org/arazzo/v1.1.0.html).

## Failure examples

| Condition | Expected behavior |
| --- | --- |
| Inventory returns a different product, amount or currency | Stop before payment |
| Capture returns DECLINED or UNKNOWN, even with HTTP 200 | Stop before license issuance |
| Capture evidence belongs to a different reservation or amount/currency | Stop before license issuance |
| Issuance response names another purchase | Reject the result; do not confirm the client |
| Bundle names another purchase, license or device | Stop before reporting activation |
| Actual device outcome is FAILED | Record FAILED and acknowledge receipt; failure follow-up is separate |
| Response is lost or a service returns 503 | Stop and reconcile the original attempt; no automatic blind replay |

Mutating operations require stable, operation-specific idempotency keys. Reservation, capture
and issuance derive their keys from the coordinator's stable purchaseId. Activation uses its own
event key. Reusing a key with a different payload is a 409 conflict. A key supports correlation
and deduplication; it does not turn an uncertain outcome into confirmed success.

Workflow failure actions end inspection of the failing path, and the caller checks CAPTURED
evidence explicitly before proceeding. The sample does not claim a particular engine's failure
propagation behavior. Release, refund and reconciliation workflows are outside this small example.

## Validation

The authoring checks include the published Arazzo 1.1 schema, the published OpenAPI 3.1 document
schema, local operation references, request/response examples, generated request payloads, nested
workflow inputs/outputs, and the explicit server-implementation bindings. The real viewer loader
and sequence model are also checked. Example-value probes check price drift, mismatched evidence,
declined/unknown captures and FAILED activation reporting. They do not execute live APIs.

The repository validator can be run independently:

```sh
node packages/jentic-arazzo-validator/bin/arazzo-validator.mjs \
  packages/jentic-arazzo-ui/public/examples/digital-product/arazzo.yaml --format json
```

Published schema references:

- [Arazzo 1.1 schema, 2026-04-15](https://spec.openapis.org/arazzo/1.1/schema/2026-04-15)
- [OpenAPI 3.1 document schema, 2022-10-07](https://spec.openapis.org/oas/3.1/schema/2022-10-07)

Schema validation checks document shape; the operation, mapping and example checks supply
additional evidence. The server contracts and reference sequence remain fictional.
