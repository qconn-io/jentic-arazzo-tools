## Context

The current sequence derives lifelines from workflow control and declared API sources. Example-specific `x-example-participants`, `x-example-actor`, `x-example-target`, and `x-example-implementation` describe a different perspective. The archived spec correctly forbids inventing standard calls from those extensions. Contract facts and stable occurrence addresses arrive in `inspect-api-contracts` and `add-workflow-deep-links`; readable details arrive in `improve-workflow-reading`.

## Goals / Non-Goals

**Goals:** Add a deep system-scene projection using explicit profile associations and contract facts while keeping the existing standard workflow projection unchanged.

**Non-Goals:** Inferring systems/owners from prose, treating example extensions as Arazzo execution instructions, message delivery simulation, evaluated data lineage, or automatic scenario branch selection.

## Decisions

### Optional typed view profile

Add a versioned `WorkflowViewProfile` containing participants, workflow-actor bindings, source-owner bindings, operation implementation associations, and declared event associations. Every binding carries an authored document/field location or host-provided provenance. Profile errors are localized. An explicit example adapter translates the digital-product extensions; it is selected by host/manifest configuration, not automatically for every document with similarly named keys. Organizational ownership belongs to the catalog and is not implied by actor identity.

Event associations explicitly identify producer and consumer workflow locations plus contract channel/message identities. Contract facts verify that the referenced declarations match; shared names alone produce no relationship. This is stronger than visually connecting every send/receive pair and safer than asking users to interpret an unexplained inferred event graph.

### Shared contract facts and declaration identity

Extend the existing bounded reference projector to retain channel/message declaration identities: retrieved document, final resolved pointer, revision when available, authored reference/use occurrence and resolution status. Equal message names or declaration values do not establish equal identities. Preserve aliases, chained/external references and localized unresolved diagnostics without flattening schemas.

Move explicitly loaded source projections from ContractPanel component state into a viewer-local projection store shared with Systems. Reuse acquisition validity tokens, generation/scope invalidation and dependency-closure reload. Reading this store never triggers acquisition; hosts still supply providers and users explicitly load sources. A document/provider replacement or dependency reload immediately excludes obsolete facts.

### Separate scene with shared locations

Build a private system scene from inspected workflows, loaded contract facts, and the view profile. Business participant identity comes from the profile. Workflow calls become control groups/annotations, not additional systems. Associated implementations appear inside a descriptive exchange group, labeled with provenance; standard calls retain their existing call semantics. Conflicting/missing actor bindings use explicit unknown participants without dropping steps.

Use the existing scene budgets as starting limits: depth eight and 200 interaction rows, counting association expansion too. Active-path recursion keys include document, workflow, and association identity. Collapse helper structure by default, then expose its authored steps through selection/expansion. Add Systems as an optional workflow perspective without widening existing `ViewerMode`/`DiagramType` unions; use a separate optional perspective setting and a namespaced location extension. Existing default Docs/Sequence/Flowchart selections remain unchanged.

### Focused data and response overlays

A selected interaction can show exact caller inputs, outputs, and explicit prerequisite relations. Only references recognized by the supported inspection grammar become navigable producer/consumer links; interpolation or opaque expressions stay exact text. Response alternatives are an opt-in contract layer, never assumed successful responses. A matching event association shows declared publisher/receiver endpoints with correlation and timeout details, not an observed message transit.

All interactions refer to stable workflow locations and reuse the inspector. Provide keyboard-equivalent list controls and contained scene scrolling. Do not add a second expression interpreter or use screenshot/reference PlantUML arrows as semantic input.

## Risks / Trade-offs

- [Profiles drift from documents] → validate references/revisions, retain provenance, and make stale associations visible.
- [A descriptive group looks executable] → distinct legend/group styling and comprehension tasks that ask readers whether a second purchase request occurs.
- [Dense event/system diagrams] → relevant participants, collapsed helper structure, selected overlays, and bounded scene markers; inspect full content outside the canvas.

## Migration Plan

Requires reading, locations, and contract inspection. Introduce profile types/adapter, then pure scene projection and optional perspective controls. Update example documentation with the profile's authority and limits. Verify five-participant small purchase, repeated mappings, event correlation associations, invalid profiles, recursion, and both viewport widths. Rollback removes the optional Systems perspective/profile adapter without changing standard diagrams or authored documents.
