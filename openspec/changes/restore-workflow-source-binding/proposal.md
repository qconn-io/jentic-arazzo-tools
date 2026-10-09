## Why

Adding version-aware chained workflows replaced Petstore's working single-API sequence with five unknown destination lanes. The viewer conflates a source identifiable from the authored document with an operation whose external contract has not been checked, and loaded contract facts do not update sequence destinations.

## What Changes

- Restore bare operation-ID binding when the supported Arazzo profile identifies exactly one applicable API source, retaining the original Petstore file byte-for-byte.
- Separate authored source identity, contract lookup coverage, and business-system ownership; unknown actors remain unknown without explicit bindings.
- Reuse current, explicitly loaded contract lookup results for interactive sequence destinations when coverage establishes a unique operation, and remove obsolete results on reload/replacement.
- Preserve actual ambiguity, conflicting locators, unsupported semantics, no implicit acquisition, and occurrence identity.
- Carry the same authored binding rules into Docs, cards, and static Mermaid; static output without supplied contracts must disclose its narrower coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chained-workflow-visualization`: distinguish known source declarations from unverified operations and retain valid single-source Arazzo 1.0 behavior in sequences.
- `api-contract-inspection`: share current operation lookup evidence with sequence destination presentation without mutating authored bindings.

## Impact

Series step 1 of 4. No predecessor. Steps 2 and 3 consume this corrected distinction; step 4 verifies the complete series.
Affected areas: inspection facts, private destination projection, sequence model/rendering, static documentation, ContractFactsContext, source freshness, focused model/component regressions. Public viewer entries, callbacks, source authority, versioned locations, and scenario/profile formats remain compatible. No product dependencies or parser/runner support expansion is proposed.
