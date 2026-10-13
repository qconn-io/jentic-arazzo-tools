## ADDED Requirements

### Requirement: Consistent accessible source-action targets
API-description Load, Retry and Reload actions, and manual Load API descriptions, SHALL use consistent viewer typography, colors, borders, padding and interaction states across document availability, document information and step inspection. Each action SHALL have a rendered target at least 44 CSS pixels in width and height at desktop and 480-pixel viewport widths. Long source names SHALL remain available in wrapping action labels without overlap or whole-page horizontal scrolling. Keyboard focus SHALL remain visible; unavailable or unsupported loading SHALL NOT acquire an ineffective action. Activating an action SHALL retain the existing source authority, loading policy, deduplication, current-evidence and stable-focus guarantees.

#### Scenario: Shared recovery across surfaces
- **WHEN** a failed description offers Retry in document availability, document information or step inspection
- **THEN** the action has the same viewer treatment and at least a 44×44 CSS-pixel target in each surface, and keyboard activation retries the applicable source without choosing a step or moving completion focus elsewhere

#### Scenario: Manual bulk action and long source names
- **WHEN** manual loading is available and an eligible unattempted description has a long authored name at 480 pixels
- **THEN** the bulk and per-source loading actions meet the target size, retain complete accessible names and wrap within the viewer without changing request eligibility or widening the page

#### Scenario: Loading and unavailable states
- **WHEN** an action is disabled during loading or a declaration cannot be loaded in the current host
- **THEN** the loading control retains its target size and visible disabled treatment, unsupported or unavailable declarations retain explanations without ineffective controls, and focus remains in its supported source context

### Requirement: Discoverable description and lookup meanings
On first opening document-level API availability or document information, a concise explanation SHALL precede the source entries and be visible without scrolling through them or opening technical details. It SHALL explain that Loaded means the current description was projected under a supported profile, Operation found means a selected operation declaration was located, and neither establishes schema validation or execution. Step contract inspection SHALL expose the same distinction beside the operation status before detailed source/operation content, including when the source is Loaded but the operation is missing. Detailed inspection scope and acquisition provenance SHALL remain available on demand. The collapsed summary SHALL remain compact and SHALL NOT introduce mandatory explanation into plain workflow reading or a loading panel for documents without sources.

#### Scenario: Availability first opened
- **WHEN** the reader first opens API descriptions for a document with several source entries at desktop or 480-pixel width
- **THEN** the loading/lookup/validation explanation is visible before the first entry without list scrolling, and all declared sources and detailed scope remain reachable

#### Scenario: Loaded source with missing operation
- **WHEN** a supported current description is Loaded but lacks the selected operation
- **THEN** inspection retains Loaded and Operation not found as separate states and exposes their meaning without implying source invalidity, schema validation or execution

#### Scenario: Compact untouched reading
- **WHEN** a viewer opens with the API descriptions disclosure closed or the document declares no sources
- **THEN** the clarification adds no persistent reading chrome or empty source-loading panel, and existing plain-entry reading-height and first-interaction budgets remain satisfied

### Requirement: Scoped accessible source-result announcements
An explicit per-source Load, Retry or Reload SHALL produce concise polite assistive-technology updates identifying the source, Loading, and the current resulting availability or failure/limitation. The initiating surface SHALL announce that attempt; simultaneously mounted copies SHALL NOT repeat its announcements. Manual bulk loading SHALL provide one aggregate progress/result announcement identifying current loading and settled counts, rather than one announcement per source. Announcements SHALL exclude raw documents, full provenance and unrelated authored content. Automatic background loading, unrelated rerenders or opening another representation SHALL NOT replay explicit-action announcements. Results from obsolete document/provider/revision scopes SHALL NOT be announced as current. Announcements SHALL NOT move focus, and underlying visible source states and recovery explanations SHALL remain available.

#### Scenario: Explicit retry settles
- **WHEN** a reader activates Retry for a failed description and the request first becomes Loading, then either succeeds or fails
- **THEN** the initiating surface politely reports the source and current status with a concise failure explanation when applicable, while focus stays in the source context and other mounted copies remain silent

#### Scenario: Multiple descriptions loaded explicitly
- **WHEN** the reader activates manual Load API descriptions for multiple eligible sources with mixed results
- **THEN** the initiating surface reports aggregate progress and settled loaded/failed/unsupported counts, individual visible results remain inspectable, and duplicate surfaces do not announce the batch again

#### Scenario: Replacement and unchanged rendering
- **WHEN** the document, provider or applicable revision changes before an explicitly requested result arrives, or an unchanged result is rerendered
- **THEN** obsolete results are excluded from current announcements and unchanged rendering does not replay completion feedback

#### Scenario: Background loading and view changes
- **WHEN** automatic descriptions load without an explicit source action or a reader opens another surface showing the same evidence
- **THEN** current visible availability remains available without replaying source-action announcements or generating a burst of one notification per background source
