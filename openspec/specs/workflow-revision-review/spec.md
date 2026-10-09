# workflow-revision-review Specification

## Purpose

Support API Owner and Developer review of explicit workflow and contract revisions through deterministic authored differences and provenance-aware potential usage impact.

## Requirements

### Requirement: Explicit identified snapshots
Comparison SHALL use two supplied snapshots with logical document identity, distinct revision identity, authored workflow content, and any explicitly pinned source contract content. Baseline sources SHALL NOT be silently replaced with the current contents of mutable URLs. Missing, incompatible, or incomplete snapshot identities SHALL be visible before comparison results are presented.

#### Scenario: Historic contract unavailable
- **WHEN** a baseline names an old payment contract revision but its content is absent
- **THEN** workflow comparison remains possible, contract comparison is marked unavailable, and the current contract is not substituted as the baseline

### Requirement: Deterministic authored differences
Comparison SHALL report added/removed workflows and steps, declaration and mapping changes, criteria, prerequisites, action kind/target/order, retry/timeout changes, and supported API contract declaration differences. Workflow and step matching SHALL use stable scoped IDs; renames without an explicit supplied match SHALL appear as removal/addition. Mapping key order and formatting alone SHALL NOT create semantic change findings, while authored sequence/action order changes SHALL remain observable.

#### Scenario: Recovery policy changed
- **WHEN** a supplied revision changes capture retry limit or replaces retry recovery with goto
- **THEN** the comparison shows exact before/after policy and target changes with owning workflow/step/action identity

#### Scenario: Formatting-only edit
- **WHEN** the same authored content differs only in whitespace or object key ordering
- **THEN** no behavioral difference is reported for those edits

### Requirement: Bounded static impact
Impact inspection SHALL show direct authored users and transitive potential entry-point exposure using classified supplied catalog relationships. Standard calls, prerequisites, conditional transfers, and descriptive associations SHALL retain distinct labels. Cycles SHALL terminate with inspectable provenance. Unresolved sources and partial index coverage SHALL remain visible; affected usage SHALL NOT be described as a proven runtime failure or automated compatibility verdict.

#### Scenario: Payment response declaration changed
- **WHEN** a supplied contract revision changes the capture response declaration
- **THEN** the review identifies known workflow uses and potential entry-point exposure, separately from any criterion changes, and leaves actual business compatibility undetermined

### Requirement: Before and after inspection
Each finding SHALL link to the relevant revision's authored location and readable before/after details, including removed content. Views SHALL clearly identify which snapshot is being inspected, and selection SHALL never combine old mappings with the new contract or occurrence context. Independent before/after inspection SHALL remain possible when only one profile is semantically supported.

#### Scenario: Removed compensation step
- **WHEN** the reviewer opens a removed revoke-license finding
- **THEN** baseline content and its caller context remain inspectable while the candidate clearly shows absence

### Requirement: Portable review output
Reviewers SHALL be able to export a deterministic JSON or Markdown summary identifying snapshot revisions, differences, scoped locations, relationship classes, and coverage limitations. Export SHALL not include private viewer/session objects, credentials acquired outside the supplied documents, or fabricated approval/test status. The product SHALL not label a comparison as approved merely because it was viewed or exported.

#### Scenario: Share a partial review
- **WHEN** the reviewer exports results with one unavailable contract revision
- **THEN** the summary includes that limitation and both supplied revision identities alongside the available findings
