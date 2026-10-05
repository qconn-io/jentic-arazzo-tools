## Why

The fresh Playwright review of nine documents and 45 workflows shows that useful workflow facts are available, but API Owners and Developers must read repeated JSON, scroll large control lists, and reconstruct context. Make the existing viewer readable and operable before adding new product perspectives.

## What Changes

- Present step identity, caller path, parameters, request/message payload, criteria, outputs, and recovery as structured details, with exact authored content and provenance available on demand.
- Add document-local search for workflows and authored steps, including content omitted by sequence display limits.
- Provide a readable relationship list and relationship-type filters alongside dense workflow overview graphs.
- Keep participant identity visible while scrolling, distinguish repeated occurrences in accessible labels, and expose readable full names.
- Make the standalone header, navigation, and inspector usable at narrow widths; add Escape dismissal and appropriate focus handling.
- Remove duplicated default detail sections while preserving semantic parity across Docs, Sequence, Diagram, and Split.
- Record reproducible browser acceptance tasks for all example packs.

## Capabilities

### New Capabilities

- `workflow-reading`: Structured inspection, document-local discovery, responsive presentation, and keyboard access to workflow facts.

### Modified Capabilities

None. The main spec inventory is empty. The archived `chained-workflow-visualization` spec is an implementation baseline; this change adds reading behavior while retaining its semantic and callback guarantees.

## Impact

Primarily `SelectionDetails`, `occurrenceDetails`, `WorkflowNavigation`, `SequenceView`, `DocsView`, standalone layout/styles, and their existing tests in `packages/jentic-arazzo-ui`. No parser, resolver, validator, or runner behavior changes. No mandatory new public props. This is the first delivery milestone and has no dependency on another proposed change. Evidence and delivery order are recorded in `ux-baseline.md` and `product-roadmap.md` alongside this proposal.
