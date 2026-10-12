## Context

See proposal.md for motivation. This is a cross-cutting presentation change over the existing semantic model, session navigation and public location contract, so a design artifact is required.

### Fresh observations, not acceptance claims

On 2026-10-11, Playwright/Chromium 153.0.8010.12 inspected the running Vite app at `http://localhost:3000`, serving this workspace at clean HEAD `db98e5b87ecac6a6619056c9567c8adfdf798962`. Viewports were 1440x1000 and 480x900. Sixteen screenshots and `observations.json` were generated under `/tmp/arazzo-ui-fresh-HtwqX4/`. These temporary files are supplementary exploration evidence, not durable or packaged-production acceptance; the findings below remain understandable if those files disappear.

| Observed behaviour | Evidence / reproduction | Design response |
| --- | --- | --- |
| Overview workflow buttons use 13.3333px Arial, zero padding and a native outset border | Open All workflows in Read workflow; captures 02, 09, 13 and 14 | Shared control styling and concise entries |
| Default narrow reading pane starts at y=572 and is 328px high in a 900px viewport | Bare Petstore; capture 07 and measured bounding rectangle | Compact shell and a measurable reading-space budget |
| Five Petstore operations yield ten equally numbered rows with interleaved retries | Open Sequence diagram and scroll to its list; capture 04 | Number authored steps; disclose possible recovery at its step |
| Card titles and SVG labels open details; numbered-list labels and description headings do not | Pointer probes; captures 05 and 16 | Direct identity activation in every representation |
| Following reserve-and-pay opens callee descriptions; Back restores parent sequence | Digital-product fulfil-purchase sequence, Open workflow; capture 15 | Preserve the reading journey on accepted call navigation |
| Stress overview has 18 workflow entries and 56 buttons | Digital-product-stress All workflows; captures 13 and 14 | Relationships collapsed by default, not removed |
| Systems introduces a separate perspective, participant vocabulary and descriptive associations | Explicit `profile=digital-product`; capture 11 | Configured alternative with contextual provenance |

Fresh source inspection identified `DocsView.tsx`'s implicit `docs` fallback and detached detail-button bank; `SequenceView.tsx`'s flat `scene.rows` list and separate detail buttons; `WorkflowOverview.tsx`'s always-expanded relationship groups; the empty `ScenarioPanel.tsx` section; and separate navigation, layout and Systems controls in `ArazzoUI.tsx` / `ArazzoUIStandalone.tsx`. `ViewerSessionContext.tsx` already preserves the caller view but does not set the accepted callee's view. Existing tests in `reading-discovery.test.tsx` and `reading-sequence.test.tsx` encode the current presentation and need deliberate expectation changes, not blanket deletion.

## Goals / Non-Goals

**Goals:** Make the existing sequence and occurrence model understandable with fewer initial choices; retain direct access to full authored content; use the existing navigation, provider and location authorities; make improvement observable in fresh browser evidence and actual reader tasks.

**Non-Goals:** A second renderer or semantic model, inferred business participants, execution simulation, deleting alternative views or extensions, adding public mode values, changing source acquisition, redesigning catalog/revision review, a new setup workflow, or claiming full Arazzo 1.1 validation/execution conformance. No implementation, main-spec sync, archive, commit or publication occurs in this planning change creation.

## Decisions

### 1. Keep the model; simplify presentation at existing boundaries

Reuse the current inspection/model/contract facts, `SequenceRow` occurrence identity and selection details. Introduce a small private reading projection only where grouping and display numbering require it, following the existing `utils/readingLabels` and occurrence-details pattern. It consumes existing rows and scoped effective action facts; it neither resolves sources nor evaluates expressions. Avoid a new public view-profile abstraction or duplicated model.

Alternative considered: remove the advanced feature implementations. Rejected because it would discard useful support and introduce public compatibility risk. Styling alone is also insufficient: it leaves the duplicate controls, empty panels and broken reading continuity intact.

### 2. One reading entry point, with explicit intent taking precedence

Recompose `WorkflowNavigation`, `ViewModeControl`, the standalone header and the workflow reading toggle into one compact hierarchy. Selected workflows expose Sequence diagram and Step descriptions; More views contains Workflow diagram, Flowchart and Side by side, plus Systems only when explicitly configured. When an alternative is active, its name stays visible on the collapsed control. Do not keep an additional Sequence diagram shortcut beside an identical selected reading toggle. Overview uses workflow selection and its graph/list alternative; it has no cross-workflow sequence.

Keep the existing `ViewerMode` and subview values, callbacks and codec. The UI translates reader choices to those values:

| Reader action | Existing state intent |
| --- | --- |
| Sequence diagram | `docs` layout with `sequence` subview, or retain an explicitly chosen `split` layout |
| Step descriptions | `docs` layout with `docs` subview, or retain the selected `split` layout |
| Workflow diagram | `diagram` layout |
| Flowchart | `docs` layout with `flowchart` subview, or retain selected `split` |
| Side by side | Toggle between `split` and `docs`, retaining the selected workflow's reading representation |

Primary Sequence diagram or Step descriptions actions leave an active Systems perspective through its existing perspective request path before applying the requested reading state. Preserve controlled-host authority for both requests; do not switch the visible representation until the applicable request is accepted. Retain the Systems return context for the existing supported return action. Side by side is a reversible choice so readers can return to a single reading pane without detouring through another diagram.

Preserve current host-versus-location precedence. Within the applicable authority, explicit/restored subviews win, then session choices; legacy locations missing a subview keep their existing decoder interpretation. Explicit `view` / `initialView` settings with no subview keep their legacy initial representation (including `docs` -> step descriptions). Only an implicit first opening chooses sequence. An explicit document-only URL selects a document, not a reading representation, so it receives the new implicit default.

Carry that distinction privately through initialization rather than adding a public mode or changing codecs. The standalone wrapper currently always passes a concrete view, so it must also preserve whether that view was explicit or default when initializing the shared reading session. Do not let an internally supplied default masquerade as explicit host intent. Document replacement clears document-scoped state; supported restored locations and explicit requests are applied through the existing restoration path.

For controlled layout/workflow changes, retain the pending-request handshake, cancellation generation and existing callback values. Applying a default is initialization, not a reason to emit a synthetic host change event. Existing mounted hosts can opt into a sequence using supported location/subview inputs.

### 3. Give the diagram the first useful screen

The ordinary content order becomes compact workflow identity and authored summary, reading controls, sequence, then numbered steps. Document description, versions, source declarations and provenance move behind a clearly labelled Document information disclosure. Full values remain accessible; long summaries can be shortened visually with access to the complete text. A compact inspection-status affordance remains, while per-interaction missing/ambiguous cues stay visible.

Use the existing shell and CSS; avoid five independent non-scrolling rows. Document loading, search and sharing remain reachable through named compact controls. At 480px, expanded search or document loading can occupy a temporary dismissible area rather than permanently consuming reading height. No empty ScenarioPanel or guide setup row is mounted for unconfigured reading.

The proposed acceptance budget is at least 60% of viewport height available to plain reading at 1440x1000 and 480x900, with the first Petstore sequence interaction visible on initial load. This is a design target, not a claim achieved by the inspected build. Measure the actual usable pane, not a full-height hidden wrapper; inspect screenshots as well as geometry. Do not meet the target by shrinking diagram/control text. Open inspectors, deliberately expanded information and active optional context are evaluated for usability separately from the plain-entry height budget.

### 4. Make identities interactive and retain accessibility

Use semantic identity buttons in description headings and numbered rows, styled as readable titles rather than extra action chips. Preserve the whole-card pointer selection already supported by DiagramView; make its keyboard identity activation use the same selection path exactly once. Sequence SVG identities need explicit keyboard semantics and a usable hit target, backed by the accessible ordered list. Avoid nested buttons, duplicated callback propagation and focusable text that has no activation behaviour.

Remove the separate View details button where its identity already performs that action, including the detached bank in DocsView. Keep expand/collapse and follow-call as secondary actions with distinct accessible names and event handling. Register the identity control as the inspector's return-focus origin. Closing details or collapsing a selected subtree must not focus a removed button. Existing narrow focus containment, inert background and Escape behaviour remain mandatory.

For step descriptions, render an actual React identity control at each scoped step heading using the existing structured documentation workflow/step data; retain markdown for authored prose. Avoid a global text-match click handler or injecting executable markup into authored Markdown. Duplicate labels must never replace workflow/step ownership when dispatching selection.

### 5. Group steps and recovery without changing semantic identity

Derive a presentation tree from existing sequence parent/path context. Number root authored steps 1, 2, 3; number expanded callee steps under their call, for example 2.1 and 2.2. Repeated callees keep separate call prefixes. Use the same display numbers in the diagram and list. Numbers are presentation only; existing row IDs, action addresses, occurrence paths and links remain the identity source.

At each step, a compact Conditions and recovery disclosure exposes applicable authored/effective actions and criteria. The initial diagram uses a compact labelled cue at that step rather than allocating every possible retry a full peer operation row. Expanding the cue reveals the existing action distinctions and diagram annotations. Include terminal actions available in the scoped action facts even if they are not separate sequence arrows; do not lose end/failure criteria while grouping only existing transfer rows. Prerequisites and structural returns remain clearly distinguished, unnumbered context. Do not describe the collapsed presentation as an evaluated happy path.

Keep the underlying scene traversal and budgets intact. Hiding action content does not bypass the row/depth budget or silently erase its boundary marker. Missing targets and coverage boundaries stay visible without opening a generic help panel. Selecting or restoring a specific action automatically reveals its owning disclosure and ancestor call context. Disclosure state is private presentation state; no new location format is required to reveal a selected action. Provider/document replacement invalidates obsolete evidence through the existing contexts.

### 6. Preserve sequence continuity on accepted calls

Extend the existing session pending-navigation handling: once the requested local callee is actually accepted, carry the sequence reading representation into it, even if it previously had a descriptions session choice. Back restores the saved caller frame's representation, expansions, exact row and focus. Do not optimistically apply a callee view before a controlled host accepts it. Explicit host/location replacement cancels pending state as today.

This rule applies to following calls from sequence. Normal workflow-selector navigation can retain the selected workflow's session preference. Existing external-source navigation remains a host/standalone acquisition boundary, with no inferred local expansion or automatic contract loading introduced here.

### 7. Optional features enter through context

`ScenarioPanel` renders meaningful supplied/active/restored guide content only. A compact Guided walkthroughs entry is available when guides are supplied; it opens the existing named guide list. Contextual help retains guide purpose, format, loading and explicit guided example without mounting these above plain reading. Explicit loading failures and restored missing manifests reveal their relevant local status, rather than disappearing because content is absent.

Systems appears in More views only when a host supplies metadata or selects a supported adapter. An explicit Systems location/host request with invalid or missing metadata receives a local explanation and return to workflow reading. Generic help can explain why optional metadata is needed without a persistent unavailable-feature panel. A configured Systems view identifies its participant/implementation information as supplied viewer metadata. Existing profiles, adapters, callbacks and return locations remain supported; no setup editor is added.

In details, group information by origin: Workflow declaration, API description and Supplied system information (or Authored guide). Preserve existing exact source/provenance details beneath concise labels. Correlation, timeout and prerequisites are standard workflow facts; descriptive implementation associations and guide narratives are extra supplied conventions. The Arazzo specification's support for `x-` fields does not standardize our extension meanings. References: [Arazzo 1.1.0 step semantics](https://spec.openapis.org/arazzo/v1.1.0.html#step-object) and [extension mechanism](https://spec.openapis.org/arazzo/v1.1.0.html#specification-extensions), inspected during the preceding exploration. Retain the repository's selected-1.1-support qualification.

### 8. Reconcile the existing gate rather than bypass it

This proposal supersedes specific presentation expectations, not engineering or semantic coverage. During implementation, amend the active gate's planning/protocol/test mappings explicitly before the final acceptance round. Do not modify archived predecessor records or silently change previous results.

| Existing contract / artifact | Reconciliation |
| --- | --- |
| workflow-reading hierarchy and compact-detail controls | Replace two simultaneous toolbars and separate detail actions with the new deltas; keep public values and exact selection |
| workflow-reading overview and readable context | Preserve relationships, origins, boundaries and filters behind disclosure; change default density and numbering |
| authored-scenario-exploration benefit-first discovery | Contextual discovery replaces empty-panel promotion; preserve no-acquisition help and explicit loading |
| system-interaction-perspective availability | No default unavailable panel; configured entry and explicit-request failure remain |
| upstream-contribution-readiness progressive disclosure and human evidence | Core reading first; separate optional/specialist tasks remain required for their feature claims |
| gate-workflow-ux-regressions workflow-reading delta | Use the new complete Shared facts and comprehension evidence text so a later sync cannot restore mandatory optional-feature training |
| gate acceptance-protocol C1-C9 | Put workflow explanation, selection, chain/return, guard, repeated mapping, timeout, recovery and sharing first; move C2/C3 guide/Systems tasks to a separate optional segment |
| gate optional-discovery negative check and design inventory | Exercise the new visible contextual help path from a bare URL; still reject replacing discovery with preconfigured setup |
| gate final readiness and evidence closure | Retain complete coverage, actual reader sessions and pending/failure status; add this repair as an integrated prerequisite |

Unchanged requirements in chained-workflow-visualization still govern supported semantics, initial first-workflow versus explicit-null overview, first-level local call expansion, bounded traversal, contextual diagnostics and authored provenance. No need to duplicate or weaken those requirements. Existing gate inventory remains ten documents and 46 workflow sequences unless a separately justified fixture change requires an explicit inventory amendment.

## Risks / Trade-offs

- [Implicit sequence default surprises existing users] -> Respect explicit props, legacy locations and session intent; document the default change and test standalone plus installed ESM entry points.
- [Disclosures conceal significant branches] -> Visible per-step action/condition cues, automatic reveal for selected actions, persistent dependency/limit markers and human recovery tasks.
- [Fewer buttons reduce discoverability] -> Clearly styled identity targets, pointer/keyboard parity and actual newcomer inspection tasks; do not rely on hover-only cues.
- [Nested numbers are mistaken for stable addresses or execution order] -> Retain exact authored IDs and occurrence links; display numbers describe the authored reading structure only.
- [Optional features become inaccessible] -> Preserve contextual help, directly supplied guide entry and configured Systems entry; retain separate discovery and restoration tests.
- [Broad testing merely blesses new screenshots] -> Assert independent semantic and interaction expectations, review fresh geometry/screenshots and require actual unfamiliar readers; old passing captures are not evidence for the redesign.
- [Overlapping OpenSpec deltas overwrite the new contract] -> Reconcile the active gate as an explicit task and validate the combined requirements before any separately authorized sync/archive.

## Migration Plan

1. Implement within this change in reviewable groups: shared controls/direct selection, sequence grouping and continuity, then compact shell and optional presentation. Keep semantic fixes outside scope unless required to preserve an existing invariant and explicitly documented.
2. Update README and focused tests with the intended default/disclosure changes; reconcile the active gate's design, workflow-reading delta, protocol and pending-task evidence references. Preserve previous observations and unchecked human tasks.
3. Run the existing focused regressions and required package gates under `.nvmrc`; build fresh production standalone and installed ESM artifacts and run positive/negative browser acceptance. No new test harness is needed.
4. Review fresh desktop/narrow captures and execute the revised consented API Owner/Developer protocol. Record core and optional outcomes separately; final UX acceptance remains pending until all required evidence and corrections are complete.
5. Sync/archive or contribution publication requires a later explicit user request. If rollback is needed during implementation, restore the prior presentation commits without touching authored documents, profiles, public location formats or semantic models; retain failure evidence and rerun affected gates.
