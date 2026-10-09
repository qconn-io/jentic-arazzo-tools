# Unfamiliar-reader validation protocol

Status: prepared; no participant sessions performed. Automated checks are
operability evidence. A3 remains pending until actual unfamiliar-reader evidence
is recorded. Use one API Owner and one Developer who did not implement or review
this contribution. Record prior Arazzo/viewer familiarity rather than assuming it.

## Consent and setup

Explain that the viewer inspects authored documents and does not execute the
business operations. Obtain consent before recording screens, voice or quotes;
offer observation without recording, and allow stopping at any time. Use the
fictional supplied examples and offline review snapshots, with no credentials,
customer data or business API calls. Use pseudonymous participant identifiers.
Keep raw recordings outside the public contribution; agree retention/deletion
before the session. Do not treat a participant's agreement as product approval.

Before each session, record the actual build/source identity, browser, viewport,
launch URL, fixture identity and available perspectives. Verify fixture access
without coaching the participant through the tasks. The production fixture host
may be used once its maintained acceptance runner is verified; enter its actual
launch URL in the session record, not an assumed port or stale build URL.

Give each card independently. Do not reveal the expected interpretation first.
Ask the reader to explain the evidence behind their answer. Start the task clock
when the card is understood; stop on an answer, abandonment or an agreed time
limit. Choose and record that limit before testing. Record assistance when it is
given, without resetting the clock. Do not invent times for unperformed tasks.

## Task cards

| Card | Participant prompt | Setup / facilitator interpretation |
| --- | --- | --- |
| O1 — purchase composition | Explain the purchase from the client request through reservation, payment and license issuance. Which relationships are calls and which describe an implementation? | `digital-product/arazzo.yaml`, `client-journey`, opt-in digital-product profile. One client purchase declaration encloses a descriptive `fulfil-purchase` implementation; `fulfil-purchase.reserve-and-pay` is a standard helper call. Do not count the implementation as a second business purchase or claim an observed 201 response. |
| O2 — ownership | For the helper payment interaction, identify the actor, the source owner, and any declared organizational owner. Explain what remains unknown. | `consumerWorkflow` + `entryActorProfile` in `test/fixtures/upstream-readiness.ts`, both entry calls expanded. Helper actor is unknown; Payments is the explicit source owner, Finance its declared organization. Client's entry binding does not establish the helper actor. |
| O3 — recovery uncertainty | Explain what the document says should happen when capture evidence is uncertain or a receive wait expires. What can the viewer prove happened? | Stress `capture-authorized-payment` / `reconcile-payment`; event example `event-driven-purchase` and `poll-purchase-until-ready`. Distinguish retry/goto/prerequisite and authored timeout/recovery declarations from evaluated criteria, delivery, success or failure. |
| D1 — second-item mappings | Locate the second fulfilment call, inspect its amount and caller mappings, and explain how it differs from the first call. | `digital-product-stress/arazzo.yaml`, `batch-fulfilment.second-item`. Second caller amount 2499 is distinct from first 1299; helper occurrences retain their own paths and opaque expressions are not evaluated. |
| D2 — operation consumers | Open the capture operation's consumers and find every known entry path in the supplied fixture. Open both repeated locations. Explain what partial coverage would mean. | `consumerCatalog` complete/partial/cyclic variants. One operation and one helper direct use retain first-item and second-item entry paths; unrelated entry is excluded. Recovery/descriptive/external paths retain classes and source navigation rather than invented local occurrences. |
| D3 — revision impact | Compare before and after, inspect a changed shared default or contract declaration, and explain the affected uses and limits of the result. | Supplied `revision-review/purchase.json` and durable default/literal review fixtures. Applicable defaults/overrides and both call contexts are static exposure; an unrelated entry or literal `$ref` is not evidence of consumption. Missing historic bytes are unknown, not today's network content or proven compatibility. |

Both participants may attempt all cards if feasible; at minimum the Owner must
cover O1–O3 and the Developer D1–D3. Invite each to explain unknown ownership,
declared-versus-observed delivery and potential-versus-proven impact even if
they did not complete the corresponding navigation task.

## Outcome rubric

| Field | Record actual observation |
| --- | --- |
| Consent | What was consented to, date, retention agreement; declined recording is valid. |
| Familiarity | Role, relevant domain experience and prior exposure to this viewer/Arazzo. |
| Outcome | Unassisted correct explanation; assisted correct explanation; incomplete/incorrect; abandoned. Navigation alone is not a correct explanation. |
| Assistance | None; neutral repetition; navigation hint; interpretation hint; demonstration. Record the exact assistance separately from participant explanation. |
| Effort/time | Observed duration, attempted routes, self-rated effort if voluntarily supplied. Keep unmeasured fields blank. |
| Misinterpretation | Record whether ownership, repeated mappings, calls/associations, response/delivery, timeout/recovery or impact/compatibility were confused, with the affected card and evidence. |
| Evidence | Consented quote or faithful observation, recording reference if permitted, fixture/build identity and relevant UI location. |

An assisted success does not become unassisted after correction. A declared
owner mistaken for an execution actor, receive declaration mistaken for delivery,
or static impact mistaken for proven failure is an incorrect interpretation,
even when navigation succeeded. Report participant evidence as a small study,
not a generalized measurement of all users' comprehension.

## Outstanding-session record

| Required session | Status | Participant / consent / outcomes / times |
| --- | --- | --- |
| Unfamiliar API Owner | Outstanding; no participant supplied | Unrecorded |
| Unfamiliar Developer | Outstanding; no participant supplied | Unrecorded |

No participant quotes, task times, measured ease-of-understanding results or
human product approval are available. A3 remains pending. After real sessions,
append dated consented records using the fields above and preserve this initial
outstanding record as provenance.
