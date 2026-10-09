# Newcomer workflow-reading acceptance

Use this protocol with at least one API Owner and one Developer who have not
worked on this viewer or received a demonstration. Record real observations;
automated navigation, implementer walkthroughs and simulated readers do not
substitute for these sessions. Final UX acceptance remains pending until every
critical task succeeds unassisted for both roles on the final candidate.

## Candidate, consent and preparation

1. Finish the required engineering checks. Preserve
   `packages/jentic-arazzo-ui/test-output/browser/identity.json`, candidate
   identity, command results and reviewed captures for the exact build used.
   Record HEAD, base, dirty-diff digest, runtime, build/input digests, browser,
   viewport and session date. Any relevant correction requires a fresh build
   and a new final round; do not combine results from different candidates.
2. Obtain each reader's informed consent to record task timing, screen activity,
   assistance and their explanations. Recording audio/video is optional and
   requires separate explicit consent. Use anonymous participant IDs. Readers
   can stop or withdraw at any time; record withdrawals as incomplete rather
   than successful. Do not put personal information in repository records.
3. After `npm run test:browser -w @jentic/arazzo-ui` passes, serve its identified
   build from the UI package directory:

   ```sh
   source "$HOME/.nvm/nvm.sh" && nvm use
   cd packages/jentic-arazzo-ui
   ARAZZO_BROWSER_PORT=43187 node scripts/serve-production-browser.mjs
   ```

   In a second terminal in the UI package directory run
   `node scripts/start-ux-reader.mjs 1440` (or `480`). This opens a visible
   Chromium window against the verified server, substitutes only the explicit
   authored Petstore contract URL, and blocks remote/live business requests.
   Keep its facilitator terminal separate from the reader. It prints no product
   guidance into the viewer. Use `fail-render` before the error exercise and
   `recover` before the reader retries; `fresh` returns to the bare entry.
   The launcher validates the server's build identity. Do not run it in headless
   mode and report its automation as a human session.

   Open `http://127.0.0.1:43187/` in a fresh browser context. Start each reader
   with this bare URL: no document, scenarios, profile, systemsProfile or
   workflow-location setup. Clear previous history, persisted state and copied
   links. Do not reveal controls or explain their names before the task.
4. Conduct a complete round at 1440px and 480px. Counterbalance the first width
   between roles and record order/learning effects. A small-window second round
   is usability evidence, not a second unfamiliar reader. Keep a separate
   configured-context segment after first-use tasks have been scored.
5. The facilitator may read the task prompt and ask the reader to think aloud.
   If the reader requests guidance, asks where a control is, or cannot proceed,
   record the time and exact assistance. Help may then continue the session,
   but that task is an assisted outcome and cannot pass final acceptance.
   Record wrong interpretations even when the reader later corrects them.

## Critical tasks: start with the plain entry

Every row is critical for both roles. Ask the prompt, start timing, and stop
when the reader completes the action and explains the result. The facilitator's
criteria below are not hints to be shown to the reader. There is no fixed time
cutoff; time is reported as observed evidence, not invented from automation.

| ID | Reader prompt | Completion and explanation required |
| --- | --- | --- |
| C1 | Explain what this pet ordering workflow describes and show how you would read its interactions in order. Identify the step that finds available pets and the operation it names. | Discovers Sequence diagram; distinguishes workflow from known petstoreAPI destination; recognizes five authored operations; distinguishes findAvailablePets from findPetsByStatus. Does not infer successful execution or fabricated response interactions. |
| C2 | Find out what guided walkthroughs are for, how a guide is supplied, and open an example that includes one. | Finds purpose and Guide file format through visible controls; explains separate author-provided guide content; explicitly opens the compatible guided example. Does not need a supplied URL, query parameter or coaching. Observe that help alone causes no acquisition. |
| C3 | Determine whether a Systems view is available here and explain what is needed. Return to ordinary workflow reading. | Finds contextual availability help, understands the absence of supplied participant metadata, and does not infer actors/owners from a known API name. Normal reading remains available. |
| C4 | Inspect a Petstore operation. Explain what is known before and after explicitly checking its API description. | Opens exact scoped details; identifies known API separately from unchecked operation. Initiates loading explicitly and explains that Operation found does not prove validity, compatibility or execution. Use the deterministic Petstore contract route from browser acceptance; record its test-owned substitution. Never call business operations. |
| C5 | Read the small purchase example, identify the capture guard, follow its nested workflow call and return to the starting context. | Uses the explicitly opened digital-product example, locates reserve-and-capture.capture-payment and its authored success criterion/guard, follows a standard workflow call and returns to the exact origin. Does not treat descriptive implementation associations as standard calls or executed behavior. |
| C6 | Compare the first and second items in the stress purchase. Show the amount supplied by the second call. | Selects batch-fulfilment from the stress document, expands/inspects the correct second-item occurrence, explains repeated calls as distinct scopes, and identifies the exact authored amount 2499 without substituting the first call's mapping. |
| C7 | Explain the event workflow's timeout recovery and inspect a boundary example's limitation. | Reads event-driven-purchase.await-ready, identifies timeout 12000 and authored fallback-to-authoritative-state without claiming it was taken; identifies recursion, depth or row boundary as a viewer coverage limit with access to full authored content. |
| C8 | Recover from the supplied local presentation/loading error and continue reading the selected workflow. | Notices localized error, chooses applicable Retry or descriptions/ordinary reading, retains a valid workflow location and focus, and does not interpret a failed guide retrieval/render as a failed workflow execution. Use the deterministic error exercise below. |
| C9 | Share this exact selected occurrence, reopen it in a fresh tab, then use Back and Forward to return to it. | Uses Copy link, reopens the exact occurrence and mappings, and verifies history navigation restores the relevant layout/reading view. Explain the scoped destination rather than only verifying that a page opens. |

## Configured-context segment

Only after C1–C4 discovery scores are recorded, the facilitator may supply
explicit example document URLs for C5–C9. Supplying a document is setup for
that reading task; it never retroactively counts as plain-entry discovery.

From the same local base URL use:

- `/examples/digital-product/arazzo.yaml` for the small purchase.
- `/examples/digital-product-stress/arazzo.yaml` for repeated item mappings.
- `/examples/digital-product-stress/event-based.arazzo.yaml` for timeout recovery.
- `/examples/digital-product-stress/boundaries/recursion.arazzo.yaml`,
  `depth-limit.arazzo.yaml` or `row-limit.arazzo.yaml` for declared limitations.

For configured Systems, open `/consumer/?surface=systems` after the unconfigured
discovery task. This installed ESM host supplies the real digital-product
document and explicitly selects its public `viewProfileAdapter` prop.
The `profile`/`systemsProfile` URL settings belong to the development app;
the built default app does not expose those setup parameters.
Ask the reader to explain the supplied Systems perspective, navigate an exact
payment occurrence, and return to its Systems context. Record configured
operability separately from discovery. Participant metadata is descriptive;
it does not establish execution, event delivery or ownership beyond its scope.

For C4 use the launcher's browser route that fulfills only the authored
`https://petstore3.swagger.io/api/v3/openapi.json` URL with the maintained
test-owned complete Petstore contract fixture. Do not rely on the live service
or change the Arazzo sample. Record the fixture digest and intercepted URL.

For C8 use the launcher's `fail-render`/`recover` commands for the render-error exercise,
or explicitly load a missing guide URL while retaining a current base workflow
location. Record which fault and exact expected error/recovery were used.
No tracked input is mutated. The human task evaluates recognition and recovery;
the negative gate evaluates whether automation detects injected regressions.

## Result template

Copy this template into `human-results.md` only with actual observations.
Until readers complete the sessions, label it PENDING with no fabricated data.

```text
Candidate HEAD/base/dirty-diff SHA-256:
Build/input identity file and SHA-256:
Engineering command results and capture paths:
Participant ID / role / unfamiliarity screening:
Consent to observations / optional recording / withdrawal status:
Date, browser, viewport, round and width order:

Task ID:
Start time / elapsed time:
Actions and exact inspected location:
Reader explanation (verbatim short quote or clearly labeled paraphrase):
Wrong interpretations and later corrections:
Assistance requested or supplied, timestamp and exact wording:
Outcome: UNASSISTED SUCCESS / ASSISTED / INCORRECT / INCOMPLETE
Supporting capture or observation reference:
Facilitator assessment against the task's criteria:
Discovered defect, owning repair and permanent regression reference:

Final-round task matrix for both roles and both widths:
Open corrections or unavailable sessions:
Final UX acceptance: PENDING / FAIL / PASS
```

Only UNASSISTED SUCCESS meets a critical task. Assisted recovery, an omitted
task, reader absence, an unresolved incorrect interpretation or a relevant
candidate change blocks final UX acceptance. Correct product defects in their
owning repair, add permanent targeted coverage, rerun affected engineering
checks, and conduct a new final round. Preserve earlier failures rather than
relabeling them as passes. Engineering results and visual review may be
reported independently while human acceptance remains pending.
