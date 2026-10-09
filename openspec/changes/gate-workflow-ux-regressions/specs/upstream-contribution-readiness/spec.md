## ADDED Requirements

### Requirement: Baseline-inclusive production acceptance inventory
Maintained acceptance SHALL enumerate the unchanged default Petstore Arazzo 1.0.1 document, all nine existing digital-product and stress Arazzo documents, and adversarial supported 1.0/1.1 source-binding fixtures. Inventory entries SHALL identify expected source/operation relationships, exercised representations, version and fixture digest. Missing entries or expectations SHALL fail coverage. Current built standalone and installed ESM viewer consumers SHALL be tested at 1440 and 480 pixels; ordinary entry tests SHALL start without preconfigured guide/profile query parameters.

#### Scenario: Default document regression
- **WHEN** the production acceptance command opens the default entry without document or optional setup parameters
- **THEN** it verifies unchanged Petstore's five interactions use one known petstoreAPI destination, checks its labels/detail controls and captures the result from the identified current build

#### Scenario: An example is omitted
- **WHEN** an existing inventoried Arazzo example or required representation is missing from the acceptance run
- **THEN** coverage fails instead of reporting all examples accepted from a smaller configured subset

### Requirement: Acceptance gates detect their target failures
The maintained gate SHALL demonstrate deterministic failure for wrong known-source destinations, stale lookup evidence, silent rendering failure, undiscoverable optional guidance, and incompatible legacy locations or public consumers. Negative checks SHALL assert the relevant failure reason; a missing server, unrelated crash or dependency failure SHALL NOT count as successful detection. Fixture perturbations SHALL use isolated test inputs or ignored output without altering authored public samples or tracked source.

#### Scenario: Petstore destination fault
- **WHEN** an isolated negative input recreates per-step unknown lanes for unchanged single-source Petstore
- **THEN** the destination assertion fails for that exact mismatch and the normal unmodified candidate still passes

#### Scenario: Setup-only discovery coverage
- **WHEN** optional-guide acceptance is changed to bypass the normal entry and use a preconfigured guide URL
- **THEN** the discovery coverage check rejects the missing first-use path even if subsequent waypoint clicks succeed

#### Scenario: Stale or blank presentation
- **WHEN** a controlled negative case leaks old operation evidence or produces a blank failed diagram
- **THEN** acceptance fails its freshness or localized-error assertion rather than relying only on console-error or geometry checks

### Requirement: Final series readiness requires current complete evidence
Final readiness SHALL require the three preceding repairs individually verified and integrated on the same identified candidate, passing required engineering checks, complete example/compatibility/discovery coverage, reviewed visual evidence, successful gate negative controls, and completed unfamiliar-reader tasks. Every discovery SHALL map to a requirement, owned implementation task and current evidence. Any failing mandatory check, unresolved discovered regression, unperformed required reader session or unexplained evidence gap SHALL block final UX acceptance. Automation-only engineering success SHALL be reportable separately. The gate SHALL make no absolute future-defect guarantee and SHALL NOT waive a failure by editing samples, deleting coverage or silently lowering an expectation.

#### Scenario: Engineering passes but human validation is pending
- **WHEN** package/browser checks pass and unfamiliar-reader sessions have not been conducted
- **THEN** engineering success is recorded separately and final UX acceptance remains pending with the missing tasks identified

#### Scenario: A new regression is discovered
- **WHEN** integration or a newcomer task exposes a defect introduced by the series
- **THEN** it is assigned to the owning repair, fixed and reverified with permanent targeted coverage before final acceptance can pass

#### Scenario: Stale acceptance artifacts
- **WHEN** evidence predates a relevant candidate, fixture or production artifact change
- **THEN** it is rejected as current evidence and the affected acceptance is rerun with fresh identity and failure records
