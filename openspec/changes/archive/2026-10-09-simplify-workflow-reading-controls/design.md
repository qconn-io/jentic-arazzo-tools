## Context

See proposal.md and its delta specs. Requires restore-workflow-source-binding. ViewModeControl renders diagram/docs/split buttons with styling-only selection; DocsView has a second docs/sequence/flowchart switch and a raw strip of Inspect buttons. WorkflowNavigation options contain IDs only. SequenceView prints participant.kind and P-number IDs, labels operations with a step ID and generic Operation, and maintains a separate ordered list below the SVG. StepNode's Details button has no class and sits in the content body. The shared CSS control selector omits those locations. MermaidDiagram catches rejection and leaves an empty container.

Design is required because navigation, private session state, controlled mode requests and versioned links must remain coherent.

## Goals / Non-Goals

**Goals:** Make the existing modes understandable; preserve exact destinations and callbacks; give every visible representation consistent controls and recoverable errors.

**Non-Goals:** Change ViewerMode or location schemas, replace React Flow/Mermaid, add a second selection state, remove accessible ordered interactions, redesign catalog/revision tools or fabricate API outcomes.

## Decisions

### 1. Keep two concepts but explain and scope them

Use a Layout-labeled control with Workflow diagram -> diagram, Read workflow -> docs, Side by side -> split. The selected reading workflow has one Reading view control with Step descriptions -> docs, Sequence diagram -> sequence, Flowchart -> flowchart. Place the reading control near the selected workflow heading; avoid repeated competing controls for the same setting. Use aria-pressed button groups with distinct accessible group names and current values.

Provide a visible Sequence diagram action for a selected workflow in the common reading navigation. If the reading pane is absent, request docs through the existing onViewChange path; if split is active retain it. Set the selected workflow's private subview through ViewerSessionContext only as the accepted layout becomes visible. Controlled hosts remain authoritative: do not force a pane before their prop changes or emit duplicate callbacks. A pending request is cancelled on unrelated document/workflow replacement. Overview offers relationships, not an invented sequence.

Alternative: replace public modes with a new flat union. Rejected because existing hosts and version-1 locations use the current values. Alternative: just rename Docs. Insufficient because sequence discovery would still depend on finding its nested switch.

### 2. Format identity at the presentation boundary

A small private reading-label helper formats authored workflow summary plus exact workflow ID, falling back to ID; step labels retain stepId and the operation locator's readable identity when different. Keep the exact original locator in details/title access. Do not derive ownership, HTTP methods, response outcomes or actors from label text. Flowchart identity remains distinct from Sequence diagram.

Sequence participant headings show names and useful source/workflow context, with no P-number IDs. Genuine uncertainty gets a localized explanation and an inspect action. Keep occurrence-specific uncertain participants when equivalence is not established; do not merge unknown destinations for aesthetics. Full long labels remain keyboard-readable and have contained scrolling. Derive sizing from visible identities without adding an unbounded canvas.

### 3. Use scoped shared control styles

Define one reusable compact detail-action class in styles/index.css and apply it to StepNode header, DocsView step actions and SequenceView list controls. Include existing navigation and optional-feature typography/states where applicable without styling unrelated host buttons globally. Header actions stop propagation, preserve React Flow drag/select behavior and use the existing session inspection methods. Keep the ordered sequence list as an accessible path; make row identity and the related diagram clear rather than deleting it as duplication.

Use the same reader label View details with a scoped accessible name. New CSS must account for current fixed 420-pixel cards and contained zoom/scroll at 480 pixels.

### 4. Translate status without changing its meaning

ContractPanel and InspectionStatus present API description not loaded, Checking API description, Operation found, Operation not found, Multiple matching operations, Unsupported API description and API description unavailable as applicable, with Load API description/Retry/Reload actions. Keep source identity, actual errors and incomplete candidate coverage explicit; do not translate located into valid. The technical status, exact locators, revision and acquisition details move into labeled expandable sections. No provider means loading unavailable in this viewer; host configuration advice belongs in developer help.

### 5. Treat render failures as scoped presentation state

Move MermaidDiagram into a private MermaidDiagram.tsx component if needed for focused tests. Track current generation, loading/error/success and a retry counter. Rejection shows Unable to draw this flowchart, Retry diagram and Read step descriptions. Retry requests only rendering, never source acquisition. Successful current render clears the message; obsolete renders cannot update error or SVG state. The selected workflow and other views remain usable. Error disclosure must provide useful technical detail without a default stack dump.

## Risks / Trade-offs

### Approved corrective scope: readable flowcharts

The final gate reproduced F1-flowchart-readability on 2026-10-09: unchanged
Petstore's 16px Mermaid labels shrink to 9.51px at 1440 and 2.96px at 480.
Preserve the generated SVG's intrinsic viewBox width inside a contained
scrollable Flowchart region rather than fitting the whole graph to the pane.
The region is keyboard focusable so arrow-key scrolling reaches off-screen
content. Keep SVG label text, rendering recovery, exact selection, generation
guards and other reading representations intact. Normal-size and long-label
graphs must have labels at least 12 displayed pixels with no page-wide overflow.
Permanent production-browser assertions measure screen-space label size,
contained scrolling and keyboard access at both maintained viewport widths.
This corrective work belongs to this repair; the final gate verifies it rather
than waiving the failure. The user authorized the correction and resumption of
the final gate on 2026-10-09.

- Label changes break automation -> update semantic role/name selectors and keep public values/old-link compatibility tests.
- Direct sequence action races with controlled selection -> accept layout updates through existing callback policy and test cancellation/replacement.
- Summaries obscure IDs -> always retain scoped IDs and full labels, including duplicate/absent summaries.
- Compact buttons lose targets or keyboard cues -> focused-state checks, contrast/target inspection and desktop/mobile captures.
- Diagram errors reset reading state -> generation-scoped retry and focus restoration tests.

## Migration Plan

### Integrated gate correction: source-loading focus

Gate task 6.2 routes regressions across the agreed reading surfaces to their
owning repairs. Current Chromium evidence at both widths shows that explicit
source loading disables the focused API-description button and moves focus to
body; Escape then cannot close the inspector. Before initiating loading from a
focused button, focus its stable named Source region. Do not transfer focus after
the asynchronous result, steal focus from unrelated navigation or alter loading
authority. Preserve focusable source context with a visible keyboard focus cue.
Reverify actual keyboard dismissal and exact live origin after lookup/reload;
fresh-session restored details use their existing valid navigation fallback.

Apply after source binding. Existing location query/hash values and callbacks remain unchanged, so no serialized migration is required. Update README and screenshots to show the new terminology. Revert reader presentation as one slice if necessary without reverting semantic bindings. Focused component/keyboard/render-recovery checks precede the final packaged acceptance.
