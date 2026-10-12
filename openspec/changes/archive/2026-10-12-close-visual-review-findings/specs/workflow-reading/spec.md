## ADDED Requirements

### Requirement: Actionable overview disclosure controls
A bulk expand or collapse control in workflow documentation SHALL be visible only when the current presentation contains workflow details that it can change. Its label SHALL describe the next available action, and activating it SHALL change the corresponding visible details. Selecting All workflows SHALL NOT expose a bulk workflow-detail control when the overview has no such details. The overview's own relationship disclosures SHALL remain independently operable.

#### Scenario: All workflows in Docs
- **WHEN** a reader selects All workflows from a selected workflow in Docs at desktop or 480-pixel width
- **THEN** the overview contains no Expand All or Collapse All control for absent workflow details, while workflow selection and relationship disclosures remain operable

#### Scenario: Selected workflow details
- **WHEN** a selected workflow has collapsible documentation details
- **THEN** the bulk control's label matches the action it will take, activation changes those details, and the label updates to the next applicable action

#### Scenario: Change overview and workflow selection
- **WHEN** a reader alternates between a selected workflow and All workflows
- **THEN** the bulk control appears only where it has an effect, and no stale expanded state makes its label disagree with the visible details
