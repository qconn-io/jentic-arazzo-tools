## Context

See proposal.md. Requires the first two repairs. AdvancedTools creates a details disclosure and portals configured Systems controls into it. The standalone form uses Scenario manifest URL and Load scenario manifest without inline help. useStandaloneScenarios explicitly consumes props, scenarios query parameters or restored scenario extensions; it does not discover siblings. ScenarioPanel already provides narratives, waypoints and authored evidence classification. ArazzoUI exposes Perspective only when a profile is configured.

The existing upstream-contribution-readiness requirement mandates a generic advanced-tools control. This change deliberately modifies that complete requirement; configuration-only hiding does not satisfy the discovered first-use problem.

## Goals / Non-Goals

**Goals:** Explain purpose before formats; separate optional guide setup from configured system navigation; preserve supplied/restored context and normal reading.

**Non-Goals:** New profile loader/editor, inferred guides/actors, arbitrary sibling discovery, scenario execution, new public formats, or auto-loading a help example.

## Decisions

### 1. Use feature areas with one small optional entry

Replace the generic Advanced tools summary with a concise Guided walkthroughs entry and a separate Systems view entry in/near the reading navigation. An unconfigured guide area stays compact with "Follow an author-provided guide through this workflow." and an optional Load guides from a URL disclosure. When guides are supplied, show their named choices directly without requiring URL input; loading setup stays secondary. Existing scenario ID is the fallback when no title is authored.

Configured Systems view is a normal reading choice with "See the participants and their interactions using supplied system information." Unconfigured availability explains "This document has no supplied system participant information." in contextual help; it does not occupy the default page with a large setup form or imply invalid Arazzo. Keep the workflow view as the usable default. A stale supplied profile remains diagnostic rather than indistinguishable from absence.

Alternative: rename Advanced tools to Optional tools. Rejected because it still forces users to infer the unrelated features within it. Alternative: put every setup field on the default page. Rejected because basic reading should remain immediately usable.

### 2. Explain the guide file and provide an explicit demonstration

Label URL input Guide file URL with associated help: "A guide file is a separate JSON document containing walkthrough descriptions and links to workflow steps." Format help shows a minimal compatible versioned example, explains legacy arrays and links to the README's developer schema section. Its examples are author-provided expectations; concise adjacent text says "Reading a guide does not run the workflow."

Use the known digital-product document and guide file for a clearly labeled Open guided example action in help. The action explicitly selects both the example document and guide, making the document switch visible; it never silently applies that guide to unrelated Petstore. Keep the URLs addressable and shareable with existing document/scenarios parameters. Opening help causes no requests, and host-supplied guides require no additional load. Do not add sample guide files to Petstore merely to hide its empty state.

### 3. Separate view navigation from configuration

Move existing Perspective selection out of the AdvancedTools portal beside reading controls. Present Workflow view and Systems view with inline purpose/help while retaining WorkflowPerspective values workflow/systems and existing controlled callbacks. Profile data still comes from existing viewProfile/viewProfileAdapter or already supported demo configuration. Keep advanced technical profile diagnostics within Systems details. This is a placement/copy change, not a new metadata-authoring workflow.

### 4. Keep state and focus boundaries

Refactor AdvancedTools only as necessary to remove its cross-feature portal dependency; avoid a generic plugin/settings framework. Guide load/retry state remains in useStandaloneScenarios; ScenarioPanel consumes existing guide context. Separate failed retrieval, malformed guide format, empty guide list, document mismatch and stale waypoint messages. Preserve valid base locations on restoration failure. Explicit retry stays in the guide area and does not reload business API contracts.

The guide area reveals supplied/restored status but does not reopen unrelated configuration on every render. Narrow covering inspection makes surrounding navigation/setup inert, traps focus and returns it to the exact guide or visible fallback. Validate host-controlled scenario/profile updates and document replacement.

## Risks / Trade-offs

- Discoverability creates default clutter -> concise feature entries and optional purpose/help, expanded content only when selected or supplied.
- Example guide is applied to a different document -> explicitly labeled combined example navigation with existing document identity checks.
- Label updates break restored URLs -> retain parameter, manifest, namespace and waypoint values; only reader text changes.
- Disclosure refactor loses focus/inert boundaries -> migrate optional-tools tests and add first-use/restoration paths at both widths.
- Profile availability mistaken for source binding -> clarify supplied business participant metadata versus ordinary known API sources; preserve unknown-actor tests.

## Migration Plan

Apply after reading controls; no manifest or profile migration. Update all existing optional-tool tests that assert generic Advanced tools labels and README user instructions while retaining developer names. Existing links still reveal the appropriate guide or Systems context. Rollback concerns only organization/copy, not authored guide/profile state. Final independent discovery evidence belongs to the last change.
