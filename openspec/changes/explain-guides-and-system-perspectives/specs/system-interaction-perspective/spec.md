## ADDED Requirements

### Requirement: Explained system-view availability
Systems view SHALL explain that it shows participants and their interactions using explicitly supplied association metadata. When configured, its view switch SHALL be discoverable beside workflow reading controls rather than hidden in unrelated guide setup. Without metadata, a concise availability explanation SHALL preserve ordinary workflow reading and SHALL NOT imply invalid Arazzo content or prompt a mandatory profile authoring/loading workflow. Explicit actor and source-owner boundaries SHALL remain unchanged.

#### Scenario: Configured systems view
- **WHEN** the host supplies a supported participant profile
- **THEN** the reader can discover Systems view from the normal reading controls, understand its purpose, switch to it and return to the same supported workflow occurrence

#### Scenario: Workflow without participant metadata
- **WHEN** Petstore is opened without a participant profile
- **THEN** the UI explains that Systems view needs supplied participant information, retains ordinary API/workflow views, and neither invents actors nor asks the reader to complete unexplained setup
