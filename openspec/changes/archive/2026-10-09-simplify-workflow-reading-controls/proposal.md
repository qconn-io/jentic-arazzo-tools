## Why

Workflow reading exposes plain inspect buttons, two overlapping view selectors, IDs without readable summaries, generic operation labels, internal participant IDs, and silent flowchart failures. Readers can operate these controls without understanding what they show or how to recover.

## What Changes

- Present the document's three layouts as Workflow diagram, Read workflow, and Side by side; in the reading pane expose Step descriptions, Sequence diagram, and Flowchart as clearly scoped representations with selected-state semantics.
- Offer a direct Sequence diagram action for the selected workflow; retain the underlying public mode/subview values and legacy location restoration.
- Use readable workflow summaries alongside exact IDs and show both authored step and operation identity where they differ.
- Style step-card, document, and sequence detail controls consistently, with compact step-card header actions and visible keyboard focus.
- Remove generated participant IDs from headings; keep genuine uncertainty actionable through plain-language explanations and exact details.
- Translate contract/source statuses into reader-oriented text and recovery actions; keep technical provenance in expandable details.
- Replace blank Mermaid failures with a localized message, retry, and access to workflow descriptions.
- Preserve readable flowchart label size in a contained, keyboard-accessible scroll region at desktop and narrow widths; repair the recorded F1-flowchart-readability failure before final acceptance.
- Keep focus inside contract inspection when an explicit source-loading control becomes disabled, preserving Escape dismissal and the valid detail origin.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-reading`: explicit navigation hierarchy, meaningful labels, readable controls and localized rendering recovery.
- `api-contract-inspection`: understandable lookup/loading states and available reader actions.

## Impact

Series step 2 of 4; requires `restore-workflow-source-binding`. Step 3 builds its feature explanations into this navigation hierarchy; step 4 verifies the combined experience.
Affected areas: ViewModeControl, DocsView, WorkflowNavigation/Overview, StepNode, SequenceView, ContractPanel, shared styles and reader documentation. Label changes require maintained test-selector updates; public `ViewerMode`, subviews, props, callbacks, controlled selection, URL/history ownership and supported old links remain unchanged. No generic redesign or rendering-library replacement is proposed.
