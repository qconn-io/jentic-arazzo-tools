## Why

The stress pack defines 27 useful scenarios outside the UI, so readers must translate expected behavior into manual workflow navigation. A guided scenario view can teach recovery and business outcomes while keeping authored expectations separate from execution evidence.

## What Changes

- Load an explicitly supplied scenario manifest and show searchable expected outcomes and evidence descriptions.
- Support optional structured waypoints to exact steps, call occurrences, actions, criteria, and mappings; keep legacy prose-only entries useful without deriving a path from their text.
- Guide users through normal, uncertain, declined, compensating, event-timeout, and diagnostic cases using the existing inspector and navigation.
- Preserve a scenario's authored assumptions and expected result without executing APIs, evaluating criteria, or displaying fabricated pass/fail coverage.
- Adapt all 27 existing stress scenarios and add the small pack's documented failure cases as explicit reading guides.

## Capabilities

### New Capabilities

- `authored-scenario-exploration`: Manifest-backed reading guides with explicit waypoints and authored evidence classification.

### Modified Capabilities

None; the main spec inventory is empty.

## Impact

New manifest adapter and scenario panel, optional headless scenario props, standalone manifest loading, example manifest annotations, and browser acceptance coverage. Depends on `improve-workflow-reading` and `add-workflow-deep-links`. `inspect-api-contracts` enriches waypoints but is not required. This is a documentation/review capability, with no runner or test-execution integration.
