# Local issue and PR drafts

All drafts are unpublished. Maintainer feedback is pending. These drafts use the
design's S1–S8 boundaries; actual predecessor refs and signed mappings are recorded below.
Per-prefix acceptance uses their isolated artifacts, rather than substituting the
working-tree results. All eight prefixes and the final content/DCO audit are verified locally.

The feature request accompanying each slice should contain the problem/scope
below and ask whether the proposed interface and dependency order fit upstream.
The PR body should retain that scope, add its actual predecessor ref and current
verification, and describe selected Arazzo 1.1 inspection without claiming
validation, execution, business compatibility or issue closure.

## S1 — Chained workflow inspection foundations

Issue title: Support scoped chained-workflow inspection and connected sequences

Readers need to follow authored local calls, repeated contexts, prerequisites
and recovery relationships while retaining exact step ownership and original
values. Introduce private inspection/model/sequence projections, finite rendering
and compatible navigation. Unknown or unsupported targets remain inspectable.

PR title: `feat(ui): add chained workflow inspection foundations`

Predecessor: pinned upstream base `49dd8ef814637b481c0a1998f586ce2785812f5d`.
Interface inventory: existing viewer modes, diagram types, node/edge/workflow
callbacks and read-only document access; shared relationship data where delivered
in this prefix. Private snapshots, profiles and projection models stay private.
Evidence: prefix build/types/tests/declarations and installed browser cases pass.

## S2 — Workflow reading

Issue title: Make authored workflow details and occurrence context easier to find

Provide readable selected details, authored search and relationship navigation,
retaining caller mappings and finite-display explanations. Responsive inspection
contains focus and restores the initiating control. This provides inspection
access to declared bodies and located methods; it does not by itself satisfy a
request to place those fields on every step card.

PR title: `feat(ui): improve workflow reading and details`

Predecessor: S1 `2370fb5a` (`feature/arazzo-ui-submission-s1`). Interface inventory: existing viewer
callbacks and modes, responsive details/search behavior; private session/details
projections excluded from public declarations. Acceptance evidence is verified for this prefix.

## S3 — Exact locations

Issue title: Share and restore exact authored workflow occurrences

Versioned workflow locations retain document/revision identity, root, selection
and the complete ordered call occurrence. Unavailable locations produce a
diagnostic rather than a nearby fallback. Standalone owns its URL/history;
embedded controlled viewers report requests to the host.

PR title: `feat(ui): add exact workflow locations and sharing`

Predecessor: S2 `c272cc12` (`feature/arazzo-ui-submission-s2`). Interface inventory: `WorkflowLocation`, selection,
call-site/action address, status/adapter/codec types and location callbacks plus
document identity/revision inputs. Native model/session state stays private.
Acceptance: controlled host history and standalone restoration/sharing, including
both repeated occurrences, verified in prefix tests and installed location consumers.

## S4 — Explicit contract inspection and source authority

Issue title: Inspect declared API sources through one explicit source authority

API and external workflow inspection should load only on an explicit operation
through the configured provider. Supplied content never becomes a retrieval URI;
denial cannot trigger default HTTP/file fallback. Preserve local declarations,
returned retrieval/revision provenance, bounds and cancellation. The private UI
bridge declares the already-used ApiDOM reference dependency directly.

PR title: `feat(ui): add provider-governed contract inspection`

Predecessor: S2 foundations; S3 `b716c5d0` immediately precedes it in the verified series.
Interface inventory: source request/content/provider/provenance and external
navigation callback types, existing viewer and standalone entries. OpenAPI 3.x,
AsyncAPI 3.0 and selected Arazzo inspection limits must be explicit; native
construction and registry internals remain private. Acceptance: provider denial,
URI aliases/pins/bounds/reload/cancellation and declaration consumers verified per prefix.

## S5 — Systems perspective

Issue title: Inspect declared Systems actors and source ownership without inference

Add an opt-in Systems perspective over explicit profile bindings. Every interaction
uses its owning step/workflow actor or Unknown. Caller and enclosing exchange
owners do not supply an unbound helper actor. Keep actor, source owner and declared
organization distinct, including receive direction and repeated mapping contexts.

PR title: `feat(ui): add explicit Systems inspection`

Predecessor in series: S4 `cf40e6a0`; also requires S3 location interfaces. Interface inventory: versioned
`WorkflowViewProfile`, participant/actor/source-owner/implementation/event
association/provenance types, perspective callback and explicit example adapter.
Systems is a perspective, not a legacy viewer mode or a business execution engine.
Acceptance: unknown actors, explicit overrides, scene/inspector parity and cross-view
locations, verified per prefix.

## S6 — Authored scenarios

Issue title: Navigate authored scenarios while keeping normal reading immediate

Scenario waypoints link to declared evidence, mappings and recovery with narrative
expectations. They do not execute workflows or demonstrate outcomes. Existing setup
and configured profile controls use Advanced tools; supplied/restored contexts
reveal relevant loading/errors, and mobile details preserve guide navigation/focus.

PR title: `feat(ui): add authored scenario navigation`

Predecessor in series: S5 `7c4d73e8`; requires S3/S4 location and source handoff foundations. Interface
inventory: versioned scenario manifest/waypoint/focus/selection/control types and
their existing callbacks. No profile editor/loader or public disclosure-state
interface is introduced. Acceptance: cancellation, shared locations, no acquisition
from disclosure and covering-inspector behavior, verified per prefix.

## S7 — Capability catalog

Issue title: Discover capabilities and operation consumers across supplied revisions

The catalog indexes declared metadata, direct uses and classified entry paths
within a supplied scope. Opening an operation shows both repeated call locations
without selecting another workflow. Prerequisites, transfers, descriptive and
external paths retain their classes; only representable local calls become exact
occurrence links. Missing/bounded scope stays visibly partial.

PR title: `feat(ui): add scoped workflow capability catalog`

Predecessor in series: S6 `107b670a`; requires S3/S4 foundations. Interface inventory: `ArazzoCatalog`, versioned
catalog manifest/document/identity/metadata/coverage/selection/association types,
normalization utility and typed ESM-only `./catalog` path. Graph/effective-use/path
helpers remain private. Acceptance: operation paths, scope/revision isolation,
installed exports and module-retention assertions, verified per prefix; comparative cost measurements use the final repaired source.

## S8 — Revision review

Issue title: Review authored revision differences with justified potential impact

Compare explicit pinned snapshots offline. Structural reference roles distinguish
real declarations from literal examples/defaults/extensions. Shared default action
changes retain effective step uses and overrides; unrelated entries are excluded.
Missing historic bytes stay unknown, and impact describes potential exposure.

PR title: `feat(ui): add pinned workflow revision review`

Predecessor: S7 `41a55801` (`feature/arazzo-ui-submission-s7`). Interface inventory: review component, immutable
snapshot/address/match/options/evidence/effect/impact/result types, compare/export
utilities and export/location callbacks. No runtime approval/compatibility state
is inferred. Acceptance: literal-reference negatives, effective defaults, before/
after navigation, offline coverage, deterministic exports and installed consumer,
verified per prefix.

## Shared submission fields

For each draft, attach the actual signed commit/predecessor refs, included/deferred
file manifest, source-to-series mapping, exact source/build/fixture identities,
the required per-prefix commands/results and a link to compact selected captures.
Record failed/unperformed checks and human/maintainer pending states separately.
Use Conventional Commit subjects within repository limits and DCO trailers in
every submitted commit. No actual issue-number closure language is supplied here.

## Verified local prefix inventory

Feedback remains pending for every slice. These are local refs, not published PRs.

| Slice | Ref | Commit | Predecessor | Passing UI tests | Maintainer feedback |
| --- | --- | --- | --- | ---: | --- |
| S1 | `feature/arazzo-ui-submission-s1` | `2370fb5a` | `49dd8ef8` | 225 | Pending |
| S2 | `feature/arazzo-ui-submission-s2` | `c272cc12` | `2370fb5a` | 244 | Pending |
| S3 | `feature/arazzo-ui-submission-s3` | `b716c5d0` | `c272cc12` | 273 | Pending |
| S4 | `feature/arazzo-ui-submission-s4` | `cf40e6a0` | `b716c5d0` | 403 | Pending |
| S5 | `feature/arazzo-ui-submission-s5` | `7c4d73e8` | `cf40e6a0` | 429 | Pending |
| S6 | `feature/arazzo-ui-submission-s6` | `107b670a` | `7c4d73e8` | 458 | Pending |
| S7 | `feature/arazzo-ui-submission-s7` | `41a55801` | `107b670a` | 491 | Pending |
| S8 | `feature/arazzo-ui-submission-s8` | `f013d233` | `41a55801` | 540 | Pending |

Full exported-name differences are recorded in the separately preserved
`test-output/submission/public-interface-inventory.json`; the inventories above
describe the user-facing interface and required predecessor choices. S4 introduces
the direct existing ApiDOM reference dependency and the aligned YAML adapter range.
S6 disclosure state stays private. S7 adds the typed ESM-only catalog subpath.
S8 adds the review interface and final maintained gates; its fresh advertised-range probes and 14 production-browser cases pass.

The signed final range is `49dd8ef8..f013d233`. All eight commits have matching
DCO trailers and pass commitlint. Final production content matches 276 included
candidate paths except the stress-example README archive-link disposition; no
code/test/interface/runtime-data difference remains. Original tooling and bulk
archives stay separately recoverable. No draft claims issue #206/#207 closure,
complete Arazzo 1.1 validation/execution, observed delivery or proven compatibility.
