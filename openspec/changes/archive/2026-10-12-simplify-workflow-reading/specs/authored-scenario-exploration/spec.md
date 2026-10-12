## MODIFIED Requirements

### Requirement: Benefit-first guided walkthrough discovery
Optional scenario guides SHALL be presented as Guided walkthroughs with an explanation that they contain author-provided descriptions and links through a workflow. Without supplied or restored guide context, the reader SHALL encounter no empty guide panel or persistent guide-loading row; guide purpose, Load guides from a URL, format help and an explicitly loadable compatible example SHALL remain reachable through contextual help or a feature-specific disclosure. Supplied guides SHALL be directly selectable through a compact named guide entry without re-entering a URL, and an active or restored guide SHALL reveal its narrative, navigation and applicable status. Legacy array and versioned manifests, scenario selections, query parameters and restored waypoints SHALL remain supported. Guide visits SHALL remain authored inspection rather than execution or test results.

#### Scenario: No guides supplied
- **WHEN** a new reader opens a plain workflow with no guide configuration
- **THEN** ordinary reading contains no empty Guided walkthroughs section or guide URL form, and opening contextual guide help explains the optional capability without acquiring content

#### Scenario: Supplied guide discovery
- **WHEN** guides are supplied by the host or explicitly selected example configuration
- **THEN** a compact guide entry gives direct access to named walkthroughs, and selecting one reveals its authored narrative and supported step navigation

#### Scenario: Format help and explicit example
- **WHEN** a reader opens guide-loading help from its contextual entry
- **THEN** the separate guide format and compatible example are explained and nothing is acquired until an explicit loading action

#### Scenario: Restored unavailable guide
- **WHEN** a shared guide location cannot retrieve its manifest
- **THEN** its feature-local status and recovery are revealed while its valid base workflow remains readable, without silently hiding the requested context
