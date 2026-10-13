## Why

The focused review of `improve-api-description-loading` found 19px source-list actions versus 35px inspector actions, loading/validation explanations below a scrolling list, and source-result updates without live announcements. These weaken recovery accessibility and status discovery even though scripted discovery and Retry worked; unfamiliar-reader comprehension remains unverified.

## What Changes

- Give shared per-source Load, Retry and Reload actions, and manual bulk loading, consistent viewer styling and at least 44×44 CSS-pixel targets across the availability summary, Document information and inspector.
- Put a compact explanation before the source list: Loaded means a supported description is available; Operation found means the selected declaration was located; neither establishes schema validation or execution. Retain detailed Inspection scope and provenance on demand.
- Politely announce results of explicit per-source actions at the initiating surface, including loading, success, failure and limitations. Give manual bulk loading one concise progress/result announcement without duplicate announcements from other mounted views.
- Verify fresh production rendering, keyboard recovery, accessibility semantics and actual assistive-technology behavior; keep reader acceptance separate and pending until actual sessions or explicit user-confirmed outcomes support closure.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-contract-inspection`: Add requirements for consistent source-action targets, discoverable status meanings and scoped accessible source-result announcements.

## Impact

This is a small follow-up to the implemented but unarchived `improve-api-description-loading` change. It depends on that change's shared source components and loading semantics. Its three added requirements supplement that change's deltas; main specs still describe the earlier explicit-only acquisition behavior, so this proposal does not copy or restore that older policy.

Implementation is limited to the existing shared source/status/inspector components, scoped CSS, focused UI tests and existing production-browser acceptance cases. No dependency or public prop changes are planned. API acquisition authority, retry bounds, external workflow loading, authored YAML and ordinary-reading budgets retain their existing contracts.

Reference: `../improve-api-description-loading/evidence/design-review.md`, FINDING-001 through FINDING-003. This proposal creates planning artifacts only; it does not implement fixes, alter the review evidence, sync/archive either change, or close task 4.3.
