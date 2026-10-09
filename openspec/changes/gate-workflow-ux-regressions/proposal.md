## Why

Previous acceptance validated newer configured fixtures while omitting the default Petstore example, and treated operable controls as evidence of discoverable UX. The complete repair series needs a maintained gate that catches semantic, visual, accessibility, compatibility and first-use regressions before readiness is claimed.

## What Changes

- Require the unchanged Petstore default plus all nine existing newer Arazzo fixtures in an explicit versioned acceptance inventory, with semantic expectations and screenshots tied to the current build.
- Extend the maintained production-browser command and CI to cover first-use discovery, source-loading parity, all supported layouts/representations, optional context, error recovery and keyboard behavior at 1440 and 480 pixels.
- Verify package/declaration consumers, controlled callbacks, standalone history and restored old links; retain adversarial source authority, duplicate-source and occurrence checks.
- Add deterministic negative controls that prove the gate fails for wrong Petstore lanes, stale contract evidence, invisible render failures, undiscoverable guides and compatibility breakage.
- Record unfamiliar API Owner and Developer walkthroughs separately from automation; unresolved validation or failed critical reading tasks blocks final UX acceptance.
- Require a findings-to-evidence matrix, current baseline/head/build identities, failure records, and no unresolved discovered regressions. This is a bounded evidence-backed gate, not a promise that no future defect is possible.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `upstream-contribution-readiness`: enforced baseline, negative controls and final engineering/UX acceptance.
- `workflow-reading`: complete maintained example inventory and discovery-oriented comprehension evidence.

## Impact

Series step 4 of 4 and final acceptance change. Requires all three preceding changes implemented and individually verified on the same candidate.
Affected areas: production.spec.ts, production browser runner/config and artifact identity, package acceptance host, fixture inventory, GitHub acceptance job, compact evidence and newcomer protocol. Extend the existing production test path rather than creating a detached audit. This change must not rewrite samples or lower expectations to obtain passes. Newly found product defects return to their owning changes for correction and re-verification before this gate completes.
