## Context

See [proposal.md](proposal.md) for motivation and the [delta spec](specs/chained-workflow-visualization/spec.md) for behavior. `extractFacts` already records workflow and step parameter facts separately, including reusable-reference diagnostics. `buildViewerModel` derives effective actions but leaves step parameters authored-only. Sequence details, call relationships, generated documentation, and flowchart summaries then read that step-only list. The existing `mergeParametersForDisplay` documents name-plus-location matching but operates on plain values and is not used by these fact consumers.

`sourceBinding` finds explicitly named sources but its final supported check considers the source's kind without checking which locator selected it. The binding already has `unsupported` status and diagnostics, and sequence consumers already avoid treating that status as a declared destination. The viewer reports inspection, not validation or execution support.

## Goals / Non-Goals

**Goals:**
- Compute one provenance-preserving applicable parameter projection per step and use it in every step interaction consumer.
- Distinguish a known source declaration from a locator/source-kind combination the selected inspection profile cannot support.
- Preserve the current authored-data, source-authority, and public API boundaries.

**Non-Goals:**
- Evaluate parameter expressions, validate complete Arazzo schemas, fetch source contracts, or predict execution.
- Rework the viewer's action precedence or add new public configuration.

## Decisions

### Keep authored and applicable parameters separate

Add an effective parameter projection beside `ViewerStep.parameters` in the shared viewer model. Preserve the original workflow and step facts unchanged. Match a resolved step parameter to a resolved workflow parameter only when both have a known equal `name` and `in` location; for workflow calls, both may legitimately omit `in`. Keep unresolved entries with their diagnostics rather than guessing an override. Put unmatched workflow entries before step entries, matching the existing display helper's rule, and carry origin, override status, use-site path, declaration path, and owning step.

Using the plain-value `mergeParametersForDisplay` directly would discard fact status and provenance. Duplicating the merge separately in documentation and sequence details would let them drift. The shared projection is the smallest seam that keeps authored facts and display policy distinct.

Update sequence selected details and readable rows, generated documentation and parameter provenance, call relationship mappings, and flowchart parameter counts to consume that projection. Preserve authored step-list presence separately so an omitted list is not reported as an authored list of inherited values. Keep default diagrams concise; full values remain in inspectable details.

### Check locator role after explicit source identification

In `sourceBinding`, retain the matched source's name, type, declaration, and original locator. Before assigning `declared`, require a compatible combination: `workflowId` with Arazzo, `channelPath` with selected-1.1 AsyncAPI, and `operationId`/`operationPath` with a supported OpenAPI or AsyncAPI source. Keep existing ambiguity precedence for multiple locators or source matches. A mismatched known source becomes `unsupported` with a source-kind diagnostic scoped to the step; an unfetched but compatible source stays `declared` and unverified.

Checking only whether a source type is known admits impossible locator roles. Dropping its identity or changing it to an unknown source would hide useful authored evidence. No new status or external source request is needed.

### Keep verification focused

Use one table of locator-kind cases and one parameter fixture covering inheritance, override, reusable/unresolved values, call mappings, and view parity. Run focused tests, types, build/declaration checks where the touched public documentation model requires them, and `git diff --check` after removing only the six reported archived-log EOF blank lines. The existing uncommitted reading work is outside this change and must not be overwritten.

## Risks / Trade-offs

- **More values in step details** → Show origin and override labels; retain compact default diagrams and authored-only raw content.
- **Unresolved parameter with unknown identity** → Keep both possible values and diagnostics; avoid suppressing a declaration on an inferred match.
- **A source named in an invalid locator appears in details** → Label the binding unsupported while retaining its name and authored declaration; do not present it as a supported diagram destination.
- **Consumer drift** → Switch all current `step.parameters` display consumers together and assert cross-view parity in a focused regression.
