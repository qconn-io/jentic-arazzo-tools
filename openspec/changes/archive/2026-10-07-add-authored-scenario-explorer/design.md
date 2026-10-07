## Context

The current stress `scenarios.json` is an array of 27 id/document/workflow/expected/evidence objects, with no structured path. The small pack documents seven failure cases in its README. Current workflow/action facts are rich enough to inspect those expectations, but they do not encode observed results. This change depends on reading and locations; contract and system views are optional enrichment.

## Goals / Non-Goals

**Goals:** A deep guide module accepting a small explicit manifest contract, with narrative waypoints linked to authored facts.

**Non-Goals:** Natural-language path inference, API execution, expression evaluation, runner integration, coverage dashboards, or converting expected prose into pass/fail assertions.

## Decisions

### Backward-compatible manifest adapter

Normalize the legacy array into a version-one `ScenarioManifest`. The enriched envelope has version, optional stable manifest identity/revision, and scenarios with id, title, document, workflow, expected, evidence, optional assumptions, category tags, and optional ordered waypoints. Each waypoint holds a `WorkflowLocation`, narrative, and an optional focus descriptor for a parameter/payload field/output/criterion/authored action. Action focus uses the location contract's authored identity, not a generated SVG row. Resolve document references relative to the manifest retrieval URI; headless hosts can supply a document map.

Only explicitly supplied manifests are loaded. Standalone exposes a manifest input/action or a `scenarios` URL field; no automatic sibling probing. Additive `scenarioManifest`, controlled `scenarioSelection`, and change callback props allow embedding. Raw expectations/evidence are preserved as text and rendered through existing safe Markdown handling, not interpreted as instructions.

### Guide navigation is a reading state machine

Selection contains manifest identity, scenario ID, and waypoint ID. Next/Previous changes that state and requests its authored location; no workflow engine state is created. A guide pane shows assumptions, expected result, current narrative, and visible authored-expectation classification. It reuses the inspector for criteria, recovery, mappings, and contracts when loaded. Leaving guide mode retains ordinary workflow navigation and does not alter the document.

Prose-only entries show their workflow plus exact text with a visible no-waypoints state. Missing references disable only the affected waypoint. Source/document loading follows explicit provider/host policy; unavailable content remains a guide-level diagnostic, not a failed scenario. Limit a manifest to 500 scenarios and 100 waypoints per scenario, with visible truncation/rejection explanations.

### Explicit example guides and address extension

Preserve all 27 existing IDs while adding manually authored waypoints tied to real criteria/actions; add a separate small-pack manifest for its seven documented failure cases. In particular, model UNKNOWN capture reconciliation separately from DECLINED abort, guarded compensation, receive timeout without command republishing, and FAILED activation with RECORDED receipt. Waypoints describe alternative authored paths without hiding contradictory branches or asserting that a criterion passed.

Use a namespaced location extension for manifest URI/revision, scenario ID, and waypoint ID. The standalone adapter restores guide state after loading; embedded hosts receive typed state. Share links require addressable manifest/documents, as ordinary workflow links do. No guide visitation metric is called scenario execution coverage.

## Risks / Trade-offs

- [Manual annotations drift] → validate waypoints against supplied fixtures and show stale-reference diagnostics; keep expected prose untouched.
- [Highlighting appears to assert execution] → persistent authored guide labeling and comprehension probes for audit receipts and unknown payment evidence.
- [Manifest becomes a second workflow DSL] → restrict it to narrative/focus addresses; no branching expressions, runtime inputs, loops, or actions.

## Migration Plan

Deliver adapter/types, guide navigation, then explicit example annotations and share restoration. Legacy manifests need no conversion. Verify every stress scenario, all seven small cases, stale waypoints, prose-only entries, cancellation, and keyboard/narrow layouts. Rollback removes optional guide integration; the scenario JSON/README remain useful outside the UI.
