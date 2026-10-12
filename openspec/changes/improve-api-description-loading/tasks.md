## 1. Loading policy and shared lifecycle

- [x] 1.1 Add optional `apiDescriptionLoading: 'manual' | 'automatic'` to viewer props and thread it through the existing contexts; verify embedded manual default, standalone document automatic default, explicit overrides, and unchanged catalog/review defaults with focused entry-point tests.
- [x] 1.2 Extend ContractFactsProvider with idempotent background loading after primary-model/provider readiness; verify unchanged digital-product's four OpenAPI 3.1 descriptions and six API operations load without step selection, ordinary reading appears while requests are pending, and StrictMode/effect replay or view changes do not duplicate active acquisition/projection.
- [x] 1.3 Implement declared-source eligibility and single-attempt scope tracking without an alternate transport; verify AsyncAPI under 1.1, incompatible/unknown/duplicate-name sources, unsupported Arazzo profiles, relative URLs with supplied bases, missing/unsupported bases, provider absence/denial, and no guessed sibling, guide, primary-schema, or external-Arazzo requests.
- [x] 1.4 Preserve cancellation, revision pins, provenance and stale-projection guards for automatic and manual actions; verify delayed document/provider/revision replacement and unmount cannot publish old facts, a rejecting authority has no fallback request, and automatic-to-manual prevents new attempts while already authorized work can settle.
- [x] 1.5 Keep failed/limited attempts settled and explicit reload behavior bounded; verify load-action overlap shares an attempt, Retry targets its source, source/dependency reload removes affected evidence while preserving unrelated facts, invalidated sibling descriptions offer fresh Load, and exceeding registry budgets neither blocks reading nor creates retry/invalidation loops.

## 2. Document-level source discovery and recovery

- [x] 2.1 Evolve the shared InspectionStatus surface into one compact API descriptions summary with an actionable source list; verify all four digital-product declarations and current counts are reachable in one activation from initial sequence entry and All workflows without selecting a step, opening technical details, or navigating to YAML.
- [x] 2.2 Add manual Load API descriptions and shared per-source Load/Retry/Reload controls using the existing loader; verify bulk loading attempts only eligible unattempted descriptions, source-specific recovery works under both policies, and no-provider or ambiguous declarations expose explanations without ineffective/first-match loading actions.
- [x] 2.3 Derive availability consistently from current revision-scoped projections; verify Loaded, Loading, Not loaded, Failed, Unsupported and Loading unavailable labels, malformed/unsupported acquired bytes, loaded-but-missing operations, partial/duplicate operation coverage, and exact URI/revision provenance agree across the source list, inspector and sequence.
- [x] 2.4 Integrate consistent live sources into DocsView's Document information and retain contextual operation checking in ContractPanel; verify ordinary view changes preserve state, Split has one persistent summary, no-source documents have no empty loading panel, and external Arazzo declarations remain distinct explicit actions.
- [x] 2.5 Style the collapsed summary and contained source list using existing viewer conventions; verify long names/URLs, keyboard activation, stable focus during loading/retry, no completion focus theft, no whole-page overflow at 480 pixels, and preservation of plain-entry reading-height/first-interaction budgets.

## 3. Truthful status and generated documentation

- [x] 3.1 Consolidate live API availability and separately labeled Inspection scope without mutating authored snapshot support; verify successful loading removes blanket unfetched claims while Arazzo 1.1/resolution/validation/execution limits and genuine occurrence diagnostics remain available.
- [x] 3.2 Replace permanent unverified source-card wording and categorical not-fetched statements in authored-only documentation with neutral declared-source labels and evidence-scope wording; verify documentation tests retain correct relative links, provenance, authored-only static Mermaid behavior, and no invented live acquisition or verification claims.
- [x] 3.3 Update README loading guidance and public declaration/consumer fixtures for both defaults and the manual rollback option; verify obsolete blanket no-fetch guidance is reconciled and generated declarations plus packed consumers accept the additive prop without callback/location/entry-point regressions.

## 4. Browser and reader acceptance

- [x] 4.1 Update production-browser cases that assume standalone explicit Load to assert automatic current results, preserving manual-mode coverage; verify unchanged default Petstore and all nine inventoried digital-product/stress inputs without mutating their authored YAML or relying on illustrative API service URLs.
- [x] 4.2 Capture fresh production walkthrough evidence at 1440×1000 and 480×900 for untouched entry, no-step source discovery, loading while reading, delayed/failing source Retry, loaded-but-missing lookup, views/overview, long source labels, and keyboard focus; record candidate/build/input identities and actual outcomes in this change's evidence directory.
- [ ] 4.3 Record unfamiliar API Owner/Developer sessions or explicit user-confirmed feedback in `evidence/human-results.md` for locating API availability, recovering a failed source without step-specific coaching, and distinguishing Loaded, Operation found, and validation; keep this task and final UX acceptance pending until actual evidence supports closure.

## 5. Integration verification and handoff

- [x] 5.1 Use `.nvmrc` and run focused regressions followed by UI full tests, typecheck, lint, build/declarations and packed-consumer checks; verify outcomes for the final candidate and record commands/results without equating engineering success with human UX acceptance.
- [x] 5.2 Run the production-browser gate and applicable negative controls, strict OpenSpec validation, and whitespace checks; verify the new source-policy/UX cases are present in required coverage, record remaining limitations, and do not relax existing budgets or comprehension gates to mark completion.
