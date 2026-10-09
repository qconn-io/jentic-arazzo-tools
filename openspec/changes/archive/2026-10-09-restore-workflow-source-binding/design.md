## Context

See proposal.md for the regression. Baseline inspected: commit 6f74975. The original renderer at 08812b0 routed unmatched locators to the first source; its multi-source fallback must not be restored. Current inspection/facts.ts requires explicitNames.size === 1 even when only petstoreAPI is applicable. inspection.test.ts intentionally expects a single bare AsyncAPI ID to stay unassigned. sequenceModel.ts uses only that authored binding, and SequenceView does not consume ContractFactsContext. ContractPanel and systems/contracts.ts separately strip source qualifiers before resolveScopedOperation. The current resolver already distinguishes complete coverage, duplicates, errors and unsupported contracts.

Design is required because the change crosses authored inspection, private contract projections and interactive/static consumers. Requirements are in the two delta specs.

## Goals / Non-Goals

**Goals:** Recover version-appropriate single-source binding; share current lookup evidence without changing authored documents or row addresses; preserve existing candidate and acquisition boundaries.

**Non-Goals:** Restore arbitrary first-source fallback, infer system actors/ownership, fetch contracts on viewing, validate complete Arazzo 1.1, execute operations, inline external workflows or change public source/profile/location interfaces.

## Decisions

### 1. Bind a bare operation ID using the supported source scope

At the facts seam, use the supported profile and the full set of relevant non-Arazzo source descriptions. A bare operationId can identify its destination without contract loading only when there is one relevant source, that source kind is supported by the selected profile, and no conflicting locator exists. Arazzo 1.0 recognizes OpenAPI here; selected 1.1 recognizes supported OpenAPI/AsyncAPI. Unknown/unsupported non-Arazzo entries prevent a misleading single-source conclusion. Explicit valid qualification keeps precedence; malformed qualification must not fall back to the single-source rule.

Record the binding basis as private provenance, retaining verification: unverified and exact authored locators. Update the older bare-AsyncAPI test according to its selected version rather than deleting it. Parameter/output expressions and actor bindings are unrelated to source selection.

The normative source for the 1.0.1 operationId rule is the [Arazzo Step Object](https://spec.openapis.org/arazzo/v1.0.1.html#step-object): qualification is required with multiple non-Arazzo sources. The older renderer's broad first-source fallback is evidence of prior Petstore behavior, not an authority for ambiguous multi-source binding.

Alternative: qualify all Petstore IDs. Rejected because valid existing input must keep working and the repair must preserve public sample bytes. Alternative: use candidates.size alone for every locator. Rejected because unsupported source types, operationPath semantics and malformed expressions have different rules.

### 2. Reuse one scoped operation projection

Extract qualifier normalization/current candidate lookup from ContractPanel and systems/contracts.ts into private contract/stepOperation.ts. Its resolveStepOperation(model, step, loaded) consumes the current viewer model and a source-name-keyed loaded record, returns the existing lookup result plus source-name identity/provenance, and performs no I/O. Preserve explicit declared-source selection and all relevant candidates for unqualified lookup. Retrieval URI equality alone cannot establish authored source-name identity.

Keep lookup result status and authored binding status separate. A unique fully checked result can establish a displayed source even when an unqualified multi-source locator retains a qualification diagnostic. Partial, failed, unsupported or duplicate candidates never establish uniqueness. A declared destination remains known even when no operation is found there.

Alternative: change sourceBinding on contract completion. Rejected because the authored inspection snapshot must remain immutable and independent of optional lookup state.

### 3. Project current destinations into sequence presentation

Add a private optional destination-evidence input to buildSequence, preserving its existing authored-only call form for static generation/tests. SequenceView obtains current loaded facts and passes a source projection keyed by document/workflow/step identity. The model uses source identity for participant reuse while retaining row IDs, call paths and action/continuation semantics. Static mermaidGenerator calls the authored-only form unless equivalent current evidence is explicitly supplied; do not add a new public export to achieve parity.

An optional destination projection changes endpoints, not authored occurrence identity. Inspector selection and focus cannot reset when a source check updates. Systems may reuse the helper for contract lookup, but business actor/source-owner mapping still requires its explicit profile.

### 4. Exclude stale evidence before rendering

Use ContractFactsContext's existing currentLoaded scope/provider/validity filtering and SourceRegistry generation tokens. Remove invalid evidence when reload begins, not only when its replacement arrives. Test source dependency reload, same-URI revision change, provider/document replacement and late responses. The default authored-only scene stays readable throughout.

## Risks / Trade-offs

- Single-source convenience masks malformed or unsupported content -> eligibility tests across 1.0/1.1, unknown kinds, missing names and conflicting/malformed locators.
- Source-qualified and unqualified lookup diverge -> shared helper tests plus inspector/sequence parity checks.
- Live participant changes shift the scene -> stable row/occurrence IDs, retained selection and contained scrolling; no automatic workflow navigation.
- Static and live evidence differ -> disclose their evidence scope and assert only facts available to each.
- Source identity mistaken for system ownership -> retain system-actor-authority regressions and explicit actor/source-owner requirements.

## Migration Plan

Implement first in the series. Keep public samples and exports unchanged; revise private tests which encoded the erroneous policy. Run focused facts, resolver, sequence, Mermaid and freshness tests plus UI type/declaration checks. Rollback is a code revert of this repair, with no input or location migration. Final product readiness is owned by gate-workflow-ux-regressions.
