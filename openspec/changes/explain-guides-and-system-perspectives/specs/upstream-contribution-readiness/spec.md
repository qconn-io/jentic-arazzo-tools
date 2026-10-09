## MODIFIED Requirements

### Requirement: Optional tools use progressive disclosure

Plain workflow viewing SHALL retain immediately available document loading, view switching, workflow navigation/search, and details. Optional setup SHALL use feature-specific, benefit-oriented disclosure with adjacent explanations rather than a mandatory generic advanced-tools control. Supplied guided walkthroughs SHALL be directly available in their guide area, and configured Systems view selection SHALL be available near the workflow reading controls. Unconfigured reading SHALL remain uncluttered and usable. Explicit supplied or restored optional context SHALL reveal its relevant controls and status. Loading, failure, coverage, and support limitations SHALL remain visible in context; diagnostic implementation metadata SHALL be available through advanced inspection without dominating normal business details. This disclosure SHALL NOT require a new profile-loading or editing workflow.

#### Scenario: Ordinary workflow without optional metadata
- **WHEN** a reader opens an ordinary document without a supplied scenario/profile/catalog context
- **THEN** its workflow can be explored immediately and optional configuration fields remain available behind a keyboard-operable disclosure

#### Scenario: Shared authored guide
- **WHEN** a valid shared link restores a scenario manifest and waypoint
- **THEN** the relevant guide and its load/status controls are discoverable without another setup step and closing details retains supported guide navigation

#### Scenario: First-time optional-feature discovery
- **WHEN** a reader interested in Jentic and Arazzo opens the viewer without knowledge of its manifest or profile formats
- **THEN** the interface explains Guided walkthroughs and Systems view through their purpose and availability, and format-specific setup is accessible only as an explained optional next step
