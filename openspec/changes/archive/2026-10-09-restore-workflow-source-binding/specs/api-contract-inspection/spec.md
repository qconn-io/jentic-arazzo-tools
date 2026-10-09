## ADDED Requirements

### Requirement: Current operation evidence informs sequence destinations
Explicitly loaded current API contract evidence SHALL inform the interactive sequence's operation destination when it establishes a unique match with complete relevant candidate coverage. Evidence SHALL remain distinct from authored source binding and SHALL NOT mutate the workflow, assert conformance for an unqualified multi-source locator, establish business-system ownership, or trigger acquisition. Known source identity SHALL remain visible even if its operation is missing or unchecked. Static output without supplied equivalent evidence SHALL retain authored-only coverage.

#### Scenario: Unique operation after complete candidate loading
- **WHEN** a bare operation ID has several relevant API sources and an explicit check of every candidate establishes exactly one operation
- **THEN** the interactive sequence and inspector identify the same current source and operation while retaining any authored qualification diagnostic and making no validity or execution claim

#### Scenario: Partial coverage and duplicate matches
- **WHEN** only one of several candidates is loaded, a candidate fails or is unsupported, or two loaded candidates contain the operation
- **THEN** the sequence retains the corresponding uncertainty, explains its reason, and does not promote the first match to a unique destination

#### Scenario: Reload removes old lookup evidence
- **WHEN** a previously unique operation changes source, disappears, or becomes duplicated after explicit source or dependency reload
- **THEN** obsolete destination evidence is excluded immediately and only current complete evidence can establish the new destination

#### Scenario: Replacement with repeated occurrences
- **WHEN** the document or provider is replaced while lookup is pending and repeated calls use the same step
- **THEN** late evidence cannot attach to the replacement and each occurrence retains its existing selection and call-path identity
