## MODIFIED Requirements

### Requirement: Explained system-view availability
Systems view SHALL remain an optional perspective enabled by explicitly supplied participant/association metadata or a deliberately selected adapter. When configured, its entry SHALL be available through More views and identify it as a viewer perspective using supplied system information, not a required Arazzo concept. An explicit host or restored Systems selection SHALL retain its supported behaviour. Without metadata and without an explicit Systems request, ordinary reading SHALL contain no Systems availability panel or disabled promotion; contextual help SHALL explain the optional capability without suggesting invalid Arazzo or mandatory setup. Explicit requests with missing, stale or invalid metadata SHALL receive a local explanation and access to ordinary workflow reading. Actor, source-owner, organizational-owner and descriptive-association boundaries SHALL remain unchanged, with no inferred identities or new profile-authoring workflow.

#### Scenario: Configured systems view
- **WHEN** the host supplies a supported participant profile
- **THEN** More views offers Systems with its supplied-information distinction, and the reader can enter it and return to the same supported workflow occurrence

#### Scenario: Workflow without participant metadata
- **WHEN** Petstore opens without participant metadata or an explicit Systems request
- **THEN** no unavailable Systems control occupies the reading area, and contextual help explains the optional metadata requirement without inventing actors or requiring setup

#### Scenario: Restored Systems context cannot be satisfied
- **WHEN** an explicit host or shared location requests Systems using absent, stale or incompatible metadata
- **THEN** the viewer explains the unavailable context locally, preserves the valid base workflow and does not substitute guessed participants
