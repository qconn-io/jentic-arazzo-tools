## Why

The sequence-first viewer now communicates the chained-workflow goal more clearly, but the latest UX review found misplaced prerequisite context, a step-description timeline regression, a covering inspector that depends on browser width instead of embed width, and an unsupported-profile fallback that drops host sizing and classes. On the 480×900 default Petstore entry, the first complete sequence interaction sits at the bottom edge of the first screen; these issues need correction and current acceptance evidence before the feature can be proposed upstream as one coherent contribution.

## What Changes

- Put workflow prerequisites before the workflow's numbered steps and step prerequisites before their owning interaction in the visible sequence list, preserving their authored classifications, call occurrence, and inspectable targets.
- Restore the Jentic step-description timeline and make the narrow initial sequence show a meaningful start to the interaction path without hiding content or shrinking labels.
- Determine whether the inspector covers its viewer from the actual viewer/panel geometry, including embedded hosts and resizes; keep modal focus/background behavior aligned with that state.
- Preserve public `className` and `style` on the unsupported semantic-profile raw view, while keeping its authored content and inspection limitation visible.
- Add focused regressions and current desktop/narrow production captures; reconcile findings with the existing `simplify-workflow-reading` and `gate-workflow-ux-regressions` evidence. Keep unfamiliar-reader acceptance pending until the recorded API Owner and Developer sessions actually occur.
- Prepare a truthful, focused upstream handoff for the single chained-workflow feature, including the feature-issue/feedback state and the intended reviewable scope. Preparation does not publish or rewrite the branch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-reading`: correct prerequisite reading order, restore the step timeline, improve narrow first-screen sequence comprehension, and make covering-inspector behavior depend on the viewer's actual bounds.
- `chained-workflow-visualization`: preserve embedded viewer styling and sizing in the raw unsupported-profile presentation.

## Impact

The likely UI touch points are `sequenceModel.ts`, `SequenceView.tsx`, the documentation formatter and `DocsView.tsx`, `SelectionDetails.tsx`, `ArazzoUI.tsx`, their nearby CSS, and focused component/production-browser acceptance. Public view modes, location formats, callbacks, source-provider authority, authored samples, and inspection semantics stay compatible. The existing upstream-readiness requirements already govern issue feedback, contribution slices, current evidence, and human comprehension; this change implements and records those obligations without a duplicate spec delta. The two active OpenSpec changes remain separate and their pending reader tasks are not marked complete by this proposal.
