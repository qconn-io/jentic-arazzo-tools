# Restore workflow source binding verification

Verified on 2026-10-09. This slice restores source identity and current optional lookup evidence; final production-browser UX acceptance remains with `gate-workflow-ux-regressions`.

## Regression evidence

The original `public/petstore-order-workflow.arazzo.yaml` is unchanged. SHA-256:

```text
8bd096d24c2cabd7536dc2feb9cb8b9157ffebbadf931bcc26230de4b1989569
```

Before repair, the production loading/inspection/sequence test observed one workflow lane and five unknown destinations (`loginUser`, `findAvailablePets`, `placeOrder`, `retrieveOrderedPetDetails`, `verifyOrderConfirmation`). After repair, all five use the single `petstoreAPI` participant. Bare IDs and sample bytes are preserved; the supplied secondary provider is never called. Documentation/card source projections and static Mermaid retain this authored binding with unverified operations and no fabricated responses.

Eligibility is profile-sensitive: single OpenAPI is supported in 1.0/selected 1.1, and single AsyncAPI in selected 1.1. Unknown kinds, unsupported older async fields, unknown selected-1.1 action intent, multiple API candidates, missing/duplicate names (including an API/Arazzo name collision), malformed qualification, pointers and conflicting locators cannot use the convenience rule. An unrelated, distinctly named Arazzo source does not affect bare operation-ID API scope. Caller input and exact authored locators remain unchanged.

`resolveStepOperation` is private and performs no I/O. ContractPanel and Systems share its qualification normalization, lookup coverage and source-name identity. Equal retrieval URIs cannot select an authored alias. Partial, failed, unsupported or duplicate candidates do not establish uniqueness; declared source identity survives a missing operation. A complete unique lookup can update a displayed destination while the immutable authored multi-source qualification diagnostic remains.

Sequence destination projections are keyed by document/workflow/step identity. Endpoints can change while repeated row IDs, call paths, expansion, selection and focus remain stable. Static Mermaid states its authored-only evidence scope. Interactive sequences explain current lookup status and uncertainty without conformance or execution claims. Business actors and source owners remain subject to explicit profile authority.

Freshness tests observe immediate removal on source/dependency invalidation, same-URI pin changes and provider/document replacement, including late responses, operation disappearance and duplicate matches. Review exposed two additional cases, both reproduced before fixing and passing afterward:

- Unknown 1.1 action `dance` previously bound a bare ID and allowed located lookup despite `unsupported-async-intent`; it now stays unsupported.
- Unpinned acquisition followed by a new pin previously captured the older unpinned validity key. Contract facts now reserve the requested acquisition before capturing its token; direct pinned invalidation immediately removes its destination.

The existing Systems event identity test now uses selected Arazzo 1.1 for its positive AsyncAPI case and explicitly rejects its 1.0 counterpart.

## Verification commands and results

All Node/npm commands use `source "$HOME/.nvm/nvm.sh" && nvm use` and the repository `.nvmrc` (Node 26.3.1).

- Focused binding, resolver, sequence/UI, documentation and Mermaid tests: 79 tests passed across 9 files before the two final review regressions; those regressions and the affected contract/source/cancellation suites subsequently passed (150 tests across 18 files).
- Authority/cancellation/contract/source/revision suites: 115 tests passed across 19 files.
- `npm test -w @jentic/arazzo-ui`: passed: 573 tests across 91 files, zero failures.
- `npm run typescript:check-types -w @jentic/arazzo-ui`: passed after final code changes.
- `npm run build -w @jentic/arazzo-ui`, followed by `npm run test:declarations -w @jentic/arazzo-ui` and `npm run test:package:built -w @jentic/arazzo-ui`: all passed after both final review fixes. Build/package consumers emitted their existing large-chunk advisories. Declaration boundaries also exclude `resolveStepOperation`, `StepOperationResult`, `destinationKey` and `requestedRevision` from both public entry declarations.
- ESLint on changed source/test files: zero errors, 14 existing `no-explicit-any` warnings; no new explicit-any annotations.
- `openspec validate restore-workflow-source-binding --strict`: passed.
- `git diff --check`: passed. Sample digest independently confirmed with `sha256sum`.

## Delta scenario coverage

Test paths below are relative to `packages/jentic-arazzo-ui/test/`. All mapped tests are part of the final UI suite. Browser checks listed separately are not replaced by automated component tests.

| Delta scenario | Automated evidence |
| --- | --- |
| Unique operation after complete candidate loading | `step-operation.test.ts`, `sequence-destination.test.ts`, `sequence-ui.test.tsx` complete candidate checks and inspector/sequence parity |
| Partial coverage and duplicate matches | `step-operation.test.ts`, `sequence-destination.test.ts`, `sequence-source-freshness.test.tsx` |
| Reload removes old lookup evidence | `sequence-source-freshness.test.tsx` dependency invalidation, pending reload, disappearance/duplication and pin transition |
| Replacement with repeated occurrences | `sequence-source-freshness.test.tsx` late provider/document response exclusion; `sequence-ui.test.tsx` repeated endpoint/selection/focus stability and replacement selection cancellation |
| Asynchronous send and receive | `documentation.test.ts` authored transport details and sequence parity; `inspection.test.ts` selected async metadata |
| Opaque source locators | `inspection.test.ts` braced webhook locator preservation; `utils/contract/PointerLookup.test.ts` scoped pointer lookup |
| Unknown or ambiguous source | `inspection.test.ts` single-source eligibility matrix; `step-operation.test.ts` complete/partial/unsupported scope |
| Conflicting locators | `inspection.test.ts` conflicting locator preservation; `utils/contract/OperationStatusResolver.test.ts` lookup status |
| Querystring value preservation | `documentation.test.ts` full querystring details; `inspection.test.ts` older-profile raw-value preservation |
| Unchanged single-source Petstore | `petstore-source-binding.test.ts` real sample digest, production seams, five operations and no acquisition |
| Profile-sensitive source uncertainty | `inspection.test.ts` versioned eligibility and unsupported metadata; `step-operation.test.ts` unknown intent/source kind; `system-events.test.ts` older async rejection |
| Authored asynchronous interaction | `documentation.test.ts` sequence send/receive/actions without predicted responses; `connected-mermaid.test.ts` parseable static scenes |
| Ambiguous source participant | `sequence-destination.test.ts`, `sequence-source-freshness.test.tsx`, `documentation.test.ts` |
| Declared source has not been fetched | `petstore-source-binding.test.ts`, `contract-panel.test.tsx` no implicit loading and preserved destination |
| Action and parameter parity | `documentation.test.ts` effective actions, property-presence overrides and full details |
| Participant identity and escaped labels | `documentation.test.ts` punctuation-safe participant labels and parse checks; `connected-mermaid.test.ts` repeated groups |
| Unsupported version sequence | `documentation.test.ts` unsupported profiles suppress sequences and retain raw documentation |
| Single-source static and interactive parity | `petstore-source-binding.test.ts` authored scene, static Mermaid and documentation/card projections; interactive scene uses the same model |
| Different supplied evidence scopes | `petstore-source-binding.test.ts` authored-only Mermaid disclosure; `sequence-destination.test.ts` optional evidence; `sequence-ui.test.tsx` live lookup with retained authored ambiguity |

## Pending final-browser acceptance

`gate-workflow-ux-regressions` owns final production-browser checks for Petstore lane readability, live destination/inspector comprehension, contained scrolling, keyboard focus and repeated-occurrence clarity across the complete series. This slice's passing model/component/package checks do not establish human comprehension, execution support or final UX acceptance. No scenarios are silently deferred from implementation.
