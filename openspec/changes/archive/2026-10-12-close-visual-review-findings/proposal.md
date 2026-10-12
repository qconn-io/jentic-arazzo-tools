## Why

The committed chained-workflow branch leaves two visible defects and two unresolved reading questions in the default Petstore journey. An in-flight reading change addresses much of this, but the visual-review findings need explicit closure against the resulting UI, including the overview control that still appears to do nothing.

## What Changes

- Make the All workflows Docs overview show an expand/collapse control only when it controls visible, collapsible content; keep its label and action in sync.
- Close the sequence-numbering finding: only authored steps, including call steps, receive primary list numbers; retries, prerequisites, structural continuations and display limits remain unnumbered and correctly associated. This implements and verifies the existing `simplify-workflow-reading` requirement rather than introducing a second numbering rule.
- Close the two UX questions with observed browser evidence: Petstore detail entry stays with its step identity at 480 pixels, and an unsupplied guide does not occupy the plain reading path while guide help and explicitly supplied/restored guides remain reachable. These behaviors are already specified by `simplify-workflow-reading`.
- Recheck the committed branch's default Petstore behavior against `main`, and verify the resulting candidate through the relevant example/view paths at desktop and 480 pixels. Record screenshots and distinguish automated operability from unassisted human comprehension.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-reading`: The overview's bulk disclosure control must be actionable, accurately labeled, and absent when there are no collapsible workflow details.

## Impact

The likely remaining implementation area is `packages/jentic-arazzo-ui/src/components/DocsView.tsx` and its focused UI checks. Closure also inspects `SequenceView.tsx`, its reading projection, guide entry in `ScenarioPanel.tsx`, responsive styles, and the existing reading/guide/browser tests. This change depends on reconciling the in-flight `simplify-workflow-reading` and `gate-workflow-ux-regressions` artifacts before any spec sync; it changes no public mode, location, provider, or source-acquisition contract.
