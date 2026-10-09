## ADDED Requirements

### Requirement: Benefit-first guided walkthrough discovery
Optional scenario guides SHALL be presented as Guided walkthroughs with an adjacent explanation that they contain author-provided descriptions and links through a workflow. Supplied guides SHALL be selectable directly. Optional setup SHALL use Load guides from a URL with format help and an explicitly loadable compatible example; understanding a manifest or prior README reading SHALL NOT be required to identify the feature's purpose. Legacy array and versioned manifests, scenario selections, query parameters and restored waypoints SHALL remain supported. Guide visits SHALL remain authored inspection rather than execution or test results.

#### Scenario: No guides supplied
- **WHEN** a new reader opens a plain workflow with no guide configuration
- **THEN** the viewer briefly explains what a guided walkthrough offers and exposes optional loading without requiring setup to read the workflow or acquiring sibling files

#### Scenario: Supplied guide discovery
- **WHEN** guide content is explicitly supplied by the host or selected example configuration
- **THEN** the reader can choose a named walkthrough directly without entering another URL and sees its authored narrative and supported step navigation

#### Scenario: Format help and explicit example
- **WHEN** a reader opens guide-loading help
- **THEN** the help explains the separate guide file and accepted format with a concrete example and performs no acquisition until the reader chooses an explicit load action

### Requirement: Recoverable guide setup states
Guide loading, empty content, malformed content, unavailable URLs, incompatible document identities and stale waypoints SHALL produce feature-local explanations and applicable retry, replacement or return-to-workflow actions. Restored optional context SHALL reveal its relevant status without reopening unrelated setup. At desktop and 480-pixel widths, guide setup and details SHALL preserve keyboard operation, focus containment when covering, and valid dismissal origins.

#### Scenario: Unavailable restored guide
- **WHEN** a shared guide URL cannot be loaded
- **THEN** the guide area explains the unavailable guide and offers recovery while the valid base workflow location stays readable

#### Scenario: Empty or mismatched guide file
- **WHEN** a supplied guide file has no usable guides or refers to another document
- **THEN** the viewer explains that state without fabricating guides, selecting namesake steps or reporting an executed failure
