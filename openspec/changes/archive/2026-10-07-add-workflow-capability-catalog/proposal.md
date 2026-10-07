## Why

The viewer currently begins with one document and a flat workflow list; it does not expose a product's capabilities, responsible teams, or reverse API usage. A supplied catalog can make workflows discoverable and governable across products without requiring a new hosted platform.

## What Changes

- Introduce a versioned, optional catalog manifest of stable document revisions, workflow entry points, product/capability labels, ownership, lifecycle, and source associations.
- Add a standalone catalog landing view and an embeddable catalog entry point, retaining ordinary single-document loading.
- Search/filter by supplied product, capability, owner, lifecycle, API, and workflow metadata; distinguish business entry points from helper workflows only when declared.
- Build document-scoped reverse usage for standard calls, prerequisites, transfers, API operations, and explicitly supplied descriptive associations.
- Show index completeness and failed/unloaded sources so absence of an entry never proves absence of consumers.

## Capabilities

### New Capabilities

- `workflow-capability-catalog`: Supplied portfolio discovery, explicit ownership, and provenance-aware reverse usage.

### Modified Capabilities

None; no main spec is registered.

## Impact

New catalog manifest/index modules and presentation in `packages/jentic-arazzo-ui`, built on the source registry and stable workflow locations. Depends on `improve-workflow-reading`, `add-workflow-deep-links`, and `inspect-api-contracts`. A sample catalog will include all nine documents, labeling intentional diagnostics explicitly and leaving unknown ownership unknown. Authentication, persistent storage, remote catalog synchronization, and inferred organizational ownership are outside this change.
