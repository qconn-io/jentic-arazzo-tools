## ADDED Requirements

### Requirement: API descriptions are discoverable from document reading
For a supported workflow document declaring API sources, every ordinary reading presentation and All workflows SHALL expose one compact document-level control named API descriptions with current counts and an understandable loading or attention state. One activation SHALL reveal the declared source list and applicable load/retry/reload actions without selecting a workflow step, opening technical details, or following a link to raw YAML. Source entries SHALL identify authored source name, kind and URL, current description status, and available contract profile; raw source links SHALL remain distinct from loading actions. Unsupported or unknown declarations SHALL remain visible with contextual limitations rather than disappearing from coverage. Complete sources and provenance SHALL remain reachable through Document information where offered, using consistent live facts. In Split mode there SHALL be only one document-level summary. Without API sources, no empty API-loading controls SHALL consume reading space, while general inspection scope remains available.

#### Scenario: First-time source discovery
- **WHEN** a reader opens the digital-product sequence and wants to know whether its APIs were loaded
- **THEN** API descriptions is visible beside the reading controls, its summary reports current coverage, and one activation reveals all four source descriptions and available actions without knowing the name Contract & Source

#### Scenario: Manual bulk load without step inspection
- **WHEN** a reader opens the API descriptions surface in manual mode and activates Load API descriptions
- **THEN** all eligible unattempted API descriptions begin bounded loading and their individual outcomes appear without navigation away from the workflow

#### Scenario: Views and overview share recovery
- **WHEN** the reader switches among Sequence diagram, Step descriptions, Workflow diagram, Flowchart, Side by side, and All workflows while one source is unavailable
- **THEN** the same source state and retry action remain reachable, no view restarts the batch, and Side by side has no competing duplicate document-level status panels

#### Scenario: Narrow viewport and keyboard use
- **WHEN** the viewer is 480 pixels wide and a keyboard reader opens the source list and retries a failed source with a long name or URL
- **THEN** controls wrap without page-wide overflow, accessible names distinguish the source actions, focus stays in a stable context while status changes, and the collapsed summary preserves the existing plain-entry reading-height and first-interaction budgets

#### Scenario: No API sources or unsupported declarations
- **WHEN** a supported document has no API sources, or includes an unknown source kind alongside API descriptions
- **THEN** the former has no empty API-loading panel and still offers inspection scope, while the latter retains the unknown declaration and its limitation without automatically acquiring guessed content

### Requirement: Generated source declarations do not claim live loading outcomes
Authored-only generated documentation SHALL describe source entries as declared sources with their authored names, kinds and resolved links. It SHALL NOT report that sources were fetched, were not fetched, are currently loading, failed, or are permanently unverified when live acquisition evidence was not supplied to that generation. It SHALL explain its authored-only evidence scope where inspection support is included, without implying that an interactive lookup was performed. Interactive documentation SHALL expose current description availability through the shared live source surface rather than embedding stale loading claims in generated source cards. Schema-validation, execution, and Arazzo-profile limitations SHALL remain distinct from source availability.

#### Scenario: Authored-only export after interactive loading
- **WHEN** a reader generates authored-only documentation for a document whose APIs were loaded in an interactive viewer
- **THEN** exported source entries say Declared OpenAPI source or the applicable authored kind, their links retain the declaring document base, and the output makes neither a fetched/not-fetched claim nor an interactive verification claim

#### Scenario: Interactive documentation after source retry
- **WHEN** a failed source is successfully retried while Step descriptions or Document information is open
- **THEN** its live source availability updates consistently with the document summary and inspector, and no generated source card continues to claim unverified authored declaration or source documents were not fetched

## MODIFIED Requirements

### Requirement: Understandable origin of displayed information
Details and optional-feature explanations SHALL distinguish authored Arazzo content, current API-contract content loaded under the configured manual or automatic policy, and supplied viewer metadata using concise reader-facing labels. Standard 1.1 asynchronous/dependency facts SHALL NOT be relabelled as proprietary extensions. Participant profiles, descriptive implementation associations and guide narratives SHALL NOT be presented as standard Arazzo fields or inferred execution. General source-checking and execution limitations SHALL be consolidated; source availability SHALL reflect current acquisition and projection evidence, while genuine missing/ambiguous facts SHALL remain visible at the affected interaction. Exact authored extensions, falsy values, expressions and provenance SHALL remain inspectable without silently discarding unsupported content or claiming full 1.1 conformance.

#### Scenario: Standard async fields and supplied associations
- **WHEN** a reader inspects a receive step and a Systems implementation association
- **THEN** correlation/timeout/dependencies are identified as workflow declarations and the implementation association is identified as supplied viewer metadata with its source

#### Scenario: Unloaded contract and opaque extension
- **WHEN** a known-source operation has no loaded API description and contains an unrecognized extension
- **THEN** source-checking status and complete authored extension content remain accessible in details without repeated generic warnings on every operation or inferred extension semantics

#### Scenario: Loaded contracts and selected Arazzo 1.1 scope
- **WHEN** all digital-product API descriptions are loaded and their operations are found
- **THEN** the source status reflects successful loading, applicable step details reflect located operations, and the separately labeled inspection scope still explains unestablished full Arazzo 1.1 conformance, schema validation, and execution support
