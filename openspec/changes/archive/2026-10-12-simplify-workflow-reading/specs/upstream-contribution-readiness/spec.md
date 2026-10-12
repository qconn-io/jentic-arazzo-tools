## MODIFIED Requirements

### Requirement: Optional tools use progressive disclosure
Plain workflow viewing SHALL retain immediately available workflow selection, sequence/step reading and interaction details, with document loading, search, sharing and alternative presentations accessible through compact, understandable controls. Optional configuration SHALL use contextual, feature-specific disclosure with benefit-oriented explanations; an empty guide panel or unavailable Systems promotion SHALL NOT appear above ordinary reading. Supplied guides SHALL be accessible through a compact named guide entry and configured Systems through More views. Explicit supplied or restored optional context SHALL reveal its relevant controls and status without mandatory unrelated setup. Loading, failure, coverage and support limitations SHALL remain visible where they affect reading; diagnostic implementation metadata SHALL be available through advanced inspection. This disclosure SHALL NOT introduce profile editing or hide semantic uncertainty.

#### Scenario: Ordinary workflow without optional metadata
- **WHEN** a reader opens an ordinary document without scenario/profile/catalog context
- **THEN** its sequence is readable immediately under the implicit default, optional forms and empty panels do not occupy persistent reading space, and guide purpose/loading remains reachable through contextual help

#### Scenario: Shared authored guide
- **WHEN** a valid shared link restores a scenario manifest and waypoint
- **THEN** the relevant guide and its status are revealed without another setup step and closing details retains supported guide navigation

#### Scenario: First-time optional-feature discovery
- **WHEN** a reader deliberately seeks optional functionality through contextual help or More views
- **THEN** guide purpose and Systems metadata requirements are explained at that point, explicit loading/configuration boundaries remain intact, and ordinary workflow comprehension does not require completing that discovery task

### Requirement: Human comprehension evidence is honest
Acceptance SHALL provide separate core-reading and optional/specialist unfamiliar-reader tasks for an API Owner and a Developer. The core segment SHALL begin at the plain entry and assess explaining interactions, direct selection, following a call and returning, guards/recovery/timeout interpretation, and repeated mappings without prior guide or Systems training. Separate applicable segments SHALL retain guide discovery, unknown actor/ownership interpretation, operation entry paths and before/after impact coverage. Actual sessions SHALL record consent, assistance, task outcome, effort/time, incorrect interpretations and supporting explanations. Automated walkthroughs SHALL remain labelled operability evidence. Core success SHALL NOT be presented as optional-feature acceptance, and missing required participants, unresolved corrections or unperformed required segments SHALL leave final UX acceptance pending.

#### Scenario: Browser tests pass without participant sessions
- **WHEN** automated acceptance passes but unfamiliar-reader sessions have not occurred
- **THEN** engineering results can be reported as passing while human comprehension and final UX acceptance remain outstanding

#### Scenario: Reader infers a business outcome or ownership
- **WHEN** a participant mistakes an unknown actor for a supplied owner, a receive declaration for observed delivery or potential impact for proven failure
- **THEN** the incorrect interpretation and affected task are recorded for targeted improvement rather than counted as an unassisted success

#### Scenario: Core success and optional discovery failure
- **WHEN** a reader completes core workflow tasks but needs assistance finding guide help in the separate optional segment
- **THEN** the outcomes remain separately recorded, the optional discovery defect retains required follow-up, and the overall gate is not declared complete by deleting that coverage

#### Scenario: Candidate changes after observations
- **WHEN** presentation or behaviour changes after a participant session or screenshot review
- **THEN** affected acceptance is repeated on the identified final candidate and historical observations are retained with their original status
