## Why

API Owner feedback and fresh Playwright inspection show that the viewer's controls, optional features and technical explanations obscure its original purpose: helping people understand chained workflows through sequence diagrams. On the inspected candidate, narrow-screen controls consume 572 of 900 pixels, five Petstore operations appear as ten equally numbered interactions, overview buttons use native styling, and following a call switches from sequence to step descriptions.

## What Changes

- Make sequence reading the initial experience when no explicit view or restored reading intent exists; retain explicit host settings, saved locations and alternative representations.
- Present one compact reading control with Sequence diagram and Step descriptions, with graph, flowchart and side-by-side alternatives under More views; prioritize the diagram over document metadata and optional setup.
- Style All workflows consistently with single-workflow reading and present concise workflow entries, with classified incoming/outgoing relationships and filters disclosed on demand.
- Make operation titles the direct, keyboard-accessible detail controls in cards, diagrams, numbered interactions and step descriptions; remove redundant View details buttons and the detached description-button bank.
- Keep numbered authored steps and nested calls, while placing possible recovery/actions beneath their owning step and treating structural continuations as unnumbered annotations. Preserve conditional cues, exact occurrence identity and display-limit markers.
- Keep sequence reading when following a local call and restore the exact caller context on return.
- Remove empty guide panels and unavailable Systems promotion from ordinary reading. Retain contextual access to guide help/loading, supplied guides and explicitly configured Systems; explain which information comes from Arazzo, API contracts or optional viewer metadata.
- Amend acceptance expectations to prioritize unassisted workflow comprehension, while retaining separate optional-feature discovery, semantic, compatibility and production-browser coverage.

## Capabilities

### New Capabilities

None. This change simplifies the presentation of existing capabilities.

### Modified Capabilities

- `workflow-reading`: sequence-first hierarchy, consistent direct selection, compact overview, numbered-step hierarchy, call-follow continuity, useful reading space and core reading acceptance.
- `authored-scenario-exploration`: contextual guide discovery without empty default panels, preserving configured and restored guides.
- `system-interaction-perspective`: optional Systems availability and explicit distinction between supplied participant metadata and standard workflow semantics.
- `upstream-contribution-readiness`: progressive disclosure and separate core-reading/optional-feature comprehension evidence.

## Impact

Primarily `@jentic/arazzo-ui`: standalone shell, viewer/session context, navigation/view controls, overview, sequence, descriptions, inspector entry points, optional-feature presentation, CSS, README and maintained component/production-browser tests. No new runtime dependency or public mode/location format is intended. The implicit initial reading presentation changes deliberately; explicit modes, callbacks, source-provider authority and restored locations remain compatible.

The active `gate-workflow-ux-regressions` acceptance protocol and overlapping deltas require explicit reconciliation during implementation, followed by fresh evidence; this proposal does not edit or close that change. Existing selected Arazzo 1.1 inspection support, exact authored extensions, source/contract facts, provenance, bounded expansion and diagnostics remain intact. Full 1.1 validation/execution support, new visualizations, profile authoring, catalog/revision redesign, Git history changes and publication are outside scope.
