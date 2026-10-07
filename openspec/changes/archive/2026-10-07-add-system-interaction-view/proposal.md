## Why

The small purchase example has five business participants, yet its client operation and server implementation remain separate views; the stress sequence also presents workflow helpers as lifelines. Owners need a system perspective, and Developers need to move between system exchanges and their exact workflow implementation.

## What Changes

- Add an optional Systems perspective alongside the existing workflow sequence.
- Accept explicit participant, source-owner, workflow-actor, and operation-implementation associations through a typed view profile; provide an opt-in adapter for the digital-product examples.
- Show an associated implementation inside its HTTP exchange as a descriptive association, distinct from a standard workflow call.
- Share explicitly loaded contract projections between the inspector and Systems, retaining resolved channel/message declaration identity and reload provenance.
- Represent AsyncAPI send/receive relationships using resolved contract identity and explicit associations; do not infer delivery from similar names.
- Add selected mapping/dependency overlays and contract response alternatives with clear provenance, without evaluating expressions or claiming outcomes.

## Capabilities

### New Capabilities

- `system-interaction-perspective`: Provenance-aware business participants, API exchanges, implementation associations, and event relationships.

### Modified Capabilities

None. The archived spec forbids inferred extension call edges; this change retains that rule in existing views and introduces a separate explicitly configured descriptive perspective.

## Impact

New profile projection and system scene modules, view controls, inspector integration, and additive public profile types in `packages/jentic-arazzo-ui`. Depends on `improve-workflow-reading`, `add-workflow-deep-links`, and `inspect-api-contracts`. No Arazzo extension is promoted to standard execution semantics. No actor/owner identity is inferred from workflow IDs or prose.
