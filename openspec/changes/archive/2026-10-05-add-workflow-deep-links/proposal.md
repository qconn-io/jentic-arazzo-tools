## Why

The current standalone URL preserves the document but loses the selected workflow, view, and repeated call occurrence on reload. Reviewers need a link that reproduces the exact authored context behind a finding.

## What Changes

- Introduce a versioned, public workflow location value identifying the document, root workflow, scoped step, call occurrence, and supported view.
- Add standalone Copy link, reload restoration, and browser Back/Forward behavior.
- Restore the minimum expansion needed to reveal a nested occurrence within existing display limits; explain stale or unavailable destinations.
- Offer an optional headless location interface without exposing private sequence rows, caller frames, or models.
- Preserve existing document query/hash loading and controlled workflow/node callback behavior.

## Capabilities

### New Capabilities

- `workflow-locations`: Stable, shareable authored locations and deterministic restoration across viewer sessions.

### Modified Capabilities

None; no main specs are currently registered. Existing scoped ownership and navigation behavior remain compatibility constraints.

## Impact

`ArazzoUIStandalone`, public viewer types/exports, `ArazzoViewerContext`, `ViewerSessionContext`, and navigation tests. Additive public contract requires declaration-consumer checks. Depends on `improve-workflow-reading` for visible destination/focus behavior. URL persistence belongs to the standalone adapter; embedded viewers remain free of browser-history side effects.
