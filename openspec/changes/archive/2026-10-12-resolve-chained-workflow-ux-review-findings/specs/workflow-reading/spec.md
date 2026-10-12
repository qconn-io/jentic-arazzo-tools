## ADDED Requirements

### Requirement: Prerequisites precede their owning interactions in sequence reading
The sequence diagram and its accessible ordered reading list SHALL present a workflow's prerequisites before that workflow's first numbered step, and each step's prerequisites before the owning numbered interaction. Prerequisites SHALL remain unnumbered, classified dependencies with their authored target and exact workflow/call occurrence available for inspection. They SHALL NOT be presented as completed operations, calls, or evaluated execution order.

#### Scenario: Root workflow and step prerequisites
- **WHEN** a selected workflow declares a workflow prerequisite and its first step declares a step prerequisite
- **THEN** both are encountered before the first numbered interaction in the visual and accessible reading order, each remains attached to its correct scope, and neither receives a step number

#### Scenario: Repeated nested callee
- **WHEN** two call occurrences expand the same callee with different mappings and that callee declares prerequisites
- **THEN** each callee's prerequisites precede that occurrence's steps, remain distinguishable by call path, and inspection opens the target and mapping context for the selected occurrence

#### Scenario: Unavailable prerequisite target
- **WHEN** a step prerequisite is external or missing
- **THEN** it remains visible before its step with the existing external or missing classification and explanation, without a guessed local link or source fetch

### Requirement: Step descriptions retain the Jentic timeline
Step descriptions SHALL display authored steps with a connected, numbered timeline using the viewer's established Jentic visual language. The timeline SHALL preserve a clear heading and direct keyboard-operable detail control for each step, readable long labels, and visible focus at desktop and narrow widths. Timeline styling SHALL NOT change authored step order, IDs, or inspection content.

#### Scenario: Unchanged Petstore descriptions
- **WHEN** the reader opens Step descriptions for unchanged Petstore at 1440 or 480 pixels
- **THEN** the five authored steps appear in order with legible numbered markers and connecting progression, and each heading opens its exact step details by pointer or keyboard

#### Scenario: Long step title and focus
- **WHEN** a step title wraps on a narrow viewer and receives keyboard focus
- **THEN** its complete label, marker, connection, and focus indication remain legible without overlapping the detail content or widening the page

### Requirement: Narrow sequence entry shows a readable path start
In the plain, untouched Petstore entry at 480×900 pixels, the first authored sequence interaction SHALL be completely visible without scrolling and the next authored interaction or an unambiguous continuation cue SHALL also be visible. The viewer SHALL achieve this with compact first-use hierarchy while retaining workflow identity, participant labels, navigation, accessible controls, and at least 12-pixel displayed diagram text. Long document information and optional setup SHALL remain available on demand.

#### Scenario: First screen at narrow width
- **WHEN** unchanged Petstore opens in the default viewer at 480×900 with no optional context or inspector open
- **THEN** the reader can identify the workflow and participants, see the complete first interaction plus the start of the next interaction path, and reach Step descriptions without scrolling past document metadata

#### Scenario: Explicit reading context
- **WHEN** a host supplies an explicit view or a restored location
- **THEN** that intent retains precedence and the compact entry does not replace the requested presentation or omit authored content

### Requirement: Inspector modality follows the occupied viewer area
An inspector that covers the usable reading area SHALL expose dialog modality, contain focus, and make the covered viewer background unavailable, regardless of browser viewport width. An inspector that leaves a usable side-by-side reading area SHALL remain nonmodal. The state SHALL follow changes to the viewer's available size while open; dismissal SHALL restore focus to the exact initiating control or a visible fallback and restore prior background accessibility state.

#### Scenario: Narrow embed in a wide browser
- **WHEN** a 400-pixel-wide embedded viewer opens details inside a 1440-pixel browser viewport
- **THEN** the covering inspector has dialog semantics, focus remains inside it, and covered controls cannot receive focus until dismissal

#### Scenario: Wide host and live resize
- **WHEN** a wide embedded viewer opens details and is then resized until the remaining reading area is unusable
- **THEN** the inspector changes from nonmodal to covering behavior while open, and reverses that behavior if usable side-by-side space returns

#### Scenario: Close after covering state
- **WHEN** the reader dismisses a covering inspector after resizing the host
- **THEN** focus returns to the initiating occurrence or visible fallback and any pre-existing background inert or hidden state is preserved
