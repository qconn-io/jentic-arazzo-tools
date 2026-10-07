# Systems comprehension walkthrough — 2026-10-06

This is a recorded, source-grounded automated walkthrough and review, not a human usability study. No unfamiliar Owner/Developer sessions or task-time measurements were conducted. No workflow was executed, and no transaction result is fabricated.

## Five-participant purchase

**Question:** Who participates, and does the client make two purchase requests?

**Recorded explanation:** The explicitly selected example adapter supplies Client application, Purchase Coordinator, Inventory Service, Payment Service and License Service. There is one authored `client-journey.purchase` exchange. `fulfil-purchase` appears within its descriptive implementation group; that association does not add an executable call or second client purchase request. `fulfil-purchase.reserve-and-pay` remains a separate standard call to `reserve-and-capture`, represented as workflow control rather than a sixth business participant. Expanding it exposes the authored reserve/capture exchanges. The canvas labels descriptive versus standard groups, and the inspector retains association provenance and exact authored mappings.

**Evidence:** `system-profile.test.ts`, `system-scene.test.ts`, the two purchase cases in `test/e2e/systems.spec.ts`, and production purchase screenshots/observations. Keyboard inspection focuses Close details; closing restores the initiating exchange control. Opening the payment's standard occurrence and returning restores its original Systems context.

**Interpretation check:** None of these arrows proves a payment was captured or a license was issued. Operation names, criteria, and contract responses are declarations.

## Event worker and completion relationships

**Question:** What connects publishing readiness to awaiting it, and what does that prove?

**Recorded explanation:** The event profile explicitly declares producer `purchase-event-worker.publish-ready` and consumer `event-driven-purchase.await-ready`, with channel `purchaseCompleted` and message `PurchaseCompleted` declaration pointers. Before explicit source loading, the relationship remains diagnostic. After loading the matching contract, the inspector offers navigation to the declared endpoint. Correlation remains exact `$inputs.purchaseId`; timeout remains the authored `12000`. The profile also explicitly declares purchase-command, activation-report and audit-completion relationships. Send/receive arrows, correlation expressions and matching contract identities do not establish observed delivery, correlation success, subscription, execution order or a completed purchase.

**Evidence:** `system-events.test.ts` verifies all four associations, different identical-content messages, absent associations and stale revisions. Browser completion cases at both widths exercise explicit loading and worker navigation. Built UMD observations verify zero contract requests before Load source and one afterward. The optional response layer labels alternatives as unobserved declarations.

## Repeated mappings

**Question:** Which caller does the second amount belong to?

**Recorded explanation:** The second fulfilment occurrence retains `batch-fulfilment.second-item` and its authored literal `2499`. It does not display first-item's `1299` in that selected occurrence. Standard call paths and the incoming call path at every descriptive association boundary remain part of semantic identity. A separate adversarial regression repeats a wrapper whose operation has a descriptive implementation; its two implementation descendants remain distinct and retain only their own caller mappings. Expressions are never evaluated. Exact supported unique declared output references provide scoped producer navigation; missing outputs and interpolated expressions remain opaque text.

**Evidence:** Scene/profile/UI regressions and the second-occurrence browser screenshot. The independent review reproduced the association-boundary collision before repair and verified the second occurrence after repair.

## Unknown associations and limits

**Question:** What is omitted or unknown, and can its authored content still be inspected?

**Recorded explanation:** Missing or contradictory actor/source-owner associations use explicitly named Unknown participants. Similar workflow or API names do not select a business actor. Invalid profiles remain diagnostic. A 200-row marker points to complete authored workflow content; the eight-group depth marker opens the named callee. Active-path recursion terminates with an inspectable marker. Collapsing a helper or implementation removes its rows from the scene without changing the underlying document; expansion and exact workflow navigation expose the authored content again.

**Evidence:** Bounded scene tests, row-limit/unknown screenshot, depth/recursion browser navigation, conflicting profile regressions, and malformed/unavailable location-extension tests. The scene has contained scrolling at 1440 and 480 pixels.

## Human follow-up protocol

For an unfamiliar Owner/Developer, ask the four question groups above without giving the recorded explanation first. Record their answer, evidence found, assistance, effort/time and any claim of a second client request or observed delivery/result. The expected explanations above are a rubric, not participant responses. Human comprehension effectiveness remains unmeasured.
