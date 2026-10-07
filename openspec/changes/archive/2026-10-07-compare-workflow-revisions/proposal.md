## Why

Finding a workflow is only part of an API Owner's work: they must also assess how a changed contract or recovery policy affects consumers. An explicit two-revision review can connect changes to authored workflow usage without claiming automated business compatibility.

## What Changes

- Compare two supplied, identified workflow/catalog snapshots, including pinned source contracts when available.
- Present additions, removals, mapping/criteria changes, action/target changes, and contract declaration changes with before/after provenance.
- Highlight statically affected usage paths, distinguishing direct usage, transitive potential exposure, and unknown coverage.
- Link a finding to the exact revision and authored workflow location in the existing inspector.
- Export a deterministic review summary for sharing; leave approval and compatibility judgments to the reviewer.

## Capabilities

### New Capabilities

- `workflow-revision-review`: Deterministic snapshot comparison and bounded static change-impact inspection.

### Modified Capabilities

None; the main spec inventory is empty.

## Impact

New comparison projection and review view/export, reusing catalog identities, reverse usage, source contract facts, readable details, and workflow locations. Depends on `add-workflow-capability-catalog` and its foundational changes. Scenario and system views are optional enrichments. No Git hosting integration, approval backend, execution replay, or universal schema-compatibility engine is included.
