# Verification: visualize-chained-workflows

Date: 2026-10-05. Schema: spec-driven. Implementation, automated verification and browser smoke testing are complete.

Package-local Vitest: 155/155 tests passed in 21 test files; zero failed, skipped or pending tests. An unmatched test filter was independently checked to exit 1. The old Mocha bootstrap is excluded from discovery and UI type checking.

Commands run with `nvm use` (Node 26.3.1):

- `npm test -w @jentic/arazzo-ui` (also JSON reporter for the named evidence below).
- `npm run typescript:check-types -w @jentic/arazzo-ui`.
- `npm run lint -w @jentic/arazzo-ui`: zero errors; 36 open-data/legacy `any` warnings.
- `npm run build -w @jentic/arazzo-ui`: ESM and UMD for both entries, both API Extractor declaration bundles, CSS and hashed standalone app artifacts.
- `openspec validate visualize-chained-workflows --strict`.

## Browser acceptance

The initial connected-browser blocker was resolved by the user's explicit authorization to use Playwright in VS Code. Playwright is installed outside the repository in `/tmp/arazzo-browser-smoke`; no browser-test dependencies or test runners were added to other packages. The checked-in smoke script starts a temporary localhost server, loads the actual built standalone assets and mounts existing regression fixtures through the production imperative API. Chromium 153.0.8010.12 ran headless at 1440 by 1000 pixels. All 16 smoke observations passed with zero browser page/console errors and zero external requests. The temporary browser and server close on completion.

Reproduce after building the UI and installing Playwright/Chromium (Node from `.nvmrc`):

```bash
source "$HOME/.nvm/nvm.sh" --no-use
nvm use
PLAYWRIGHT_MODULE=/tmp/arazzo-browser-smoke/node_modules/playwright/index.mjs node openspec/changes/visualize-chained-workflows/browser-smoke.mjs
```

Use `PLAYWRIGHT_MODULE` to point to another Playwright installation, or omit it when `playwright` is resolvable normally. The script imports existing TypeScript fixtures using Node's native type stripping. [Script](browser-smoke.mjs) and [measured observations](browser-evidence/observations.json).

| Browser observation | Evidence |
| --- | --- |
| Packaged standalone boots, fetches its bundled sample and switches views | Script's `/app` boot check |
| Dense SCC/hierarchy has six disjoint cards, eleven distinct finite arrow routes, self-loops and parallel edges; repeated positions are identical | [Dense overview](browser-evidence/dense-cyclic-overview.png), measured card rectangles and SVG paths in JSON |
| Only the three cyclic prerequisite edges are warned; call/recovery and mixed cycles have no prerequisite-cycle warning | Dense, call/recovery and mixed fixtures in script/JSON |
| Seven unlinked workflows form a bounded three-column grid | [Unlinked overview](browser-evidence/unlinked-overview-grid.png) |
| Local prerequisites use two negative-X side routes without reordering the authored step array | [Local prerequisites](browser-evidence/local-prerequisites.png) |
| Expanded authored action/step details stay within disjoint card bounds; call-card selection opens flowA ownership without opening target flowB | [Calling ownership](browser-evidence/calling-workflow-ownership.png), expanded bounds assertion |
| Cross-workflow duplicate init navigation highlights flowB.init, centers its measured rectangle within 3 pixels of the diagram center and scrolls its owning documentation; later effects retain selection | [Destination focus](browser-evidence/cross-workflow-destination-focus.png), center delta and scroll rectangles in JSON |
| Docs-only prerequisite links focus and scroll the scoped destination | [Docs-only focus](browser-evidence/docs-only-prerequisite-focus.png) |
| External/missing targets retain original classification and remain inert | Disabled-chip and unchanged-destination assertions |
| Async send/receive, timeout zero, correlation expression and whole querystring survive cards and docs; both real Mermaid views produce visible SVGs | [Async inspection](browser-evidence/async-receive-inspection.png), [Mermaid sequence](browser-evidence/async-mermaid-sequence.png) |
| Older profile features remain authored with visible limitations and no guessed prerequisite edges | [Older-profile limits](browser-evidence/older-profile-limits.png) |
| Parseable future version has exact raw authored output, matching imperative retrieval and no semantic graph | [Raw fallback](browser-evidence/unsupported-version-raw.png) |
| Unknown content, authored identity, custom dialect and opaque references survive browser imperative retrieval | Exact document equality assertion |

Visual inspection confirms ownership, focus, metadata, warnings and raw fallback in these captures. Dense graphs still have crossings and some overlapping edge-label text; full labels and provenance remain in SVG hover titles. Card non-overlap and distinct occurrence routes are verified; no optimal-crossing or label-collision-free layout is claimed.

## Acceptance boundaries

| Design criterion | Evidence |
| --- | --- |
| Separate parser/resolver/validator/runner/viewer responsibilities | Private loading uses real parser/resolver; inspection has no I/O or runner imports; only UI and its dependencies changed. No validator/executor guarantees are asserted. |
| Native context and authored data survive projection | Loader native snapshot tests, copied placeholders, both workflow orders, unknown extensions, authored IDs, separate identity/retrieval metadata, custom dialect bypass, valid reusable occurrence extension preservation and imperative retrieval. |
| Specification facts remain separate from display policy | Inspection retains original success/failure lists; model applies labeled step-first policy. Contract tests and all consumers use the same facts. |
| Operation inspection does not require HTTP shape | AsyncAPI intent, channel-only steps, opaque locators, source ambiguity and complete querystring values are tested in model, cards, docs and Mermaid. |
| Unsupported semantics remain visible without guessed edges | Older profile features and unknown actions retain generic details; parseable 1.2 raw fallback; unrepresentable major 9 parsing errors; unknown profile semantic diagrams suppressed. |
| Profile can provide existing facts without changing consumers | Synthetic private future-profile tests drive the unchanged model, overview, docs and Mermaid consumers. |

These contract checks pass, with the browser evidence above confirming the rendered responsibilities, inspection labels, transport-neutral metadata, unsupported fallback and authored-data preservation. The synthetic future-profile seam remains a contract test rather than a browser feature.

## Scenario accounting

The file associations below are an inventory, not proof of every combination. Named review regressions below explicitly cover the previously missing combinations. Browser-sensitive presentation observations are recorded above for tasks 8.3 and 9.6/9.8.

| Specification scenario | Regression files |
| --- | --- |
| Patch version and description version | `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Selected Arazzo 1.1 inspection | `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| New feature in an older feature version | `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Parseable unsupported Arazzo version | `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Unsupported parsing capability | `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Unsupported action kind | `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Asynchronous send and receive | `inspection.test`, `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Opaque source locators | `inspection.test`, `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Unknown or ambiguous source | `inspection.test`, `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Conflicting locators | `inspection.test`, `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Querystring value preservation | `inspection.test`, `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Unknown fields and extensions | `loader.test`, `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Reused declaration provenance | `loader.test`, `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Authored identity differs from retrieval location | `loader.test`, `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Unsupported schema dialect | `loader.test`, `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| No injected source metadata | `loader.test`, `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Authored field resembles viewer bookkeeping | `loader.test`, `inspection.test`, `model.test`, `component-loading.test`, `documentation.test` |
| Uncontrolled initial view | `navigation.test`, `graph-overview.test` |
| Explicit overview and round-trip navigation | `navigation.test`, `graph-overview.test` |
| Controlled workflow selection | `navigation.test`, `graph-overview.test` |
| Overview callback compatibility | `navigation.test`, `graph-overview.test` |
| Missing component before or after valid references | `loader.test`, `loading-cancellation.test`, `component-loading.test` |
| Missing component collection | `loader.test`, `loading-cancellation.test`, `component-loading.test` |
| Reused action contains a missing parameter | `loader.test`, `loading-cancellation.test`, `component-loading.test` |
| Document retrieval after recovery | `loader.test`, `loading-cancellation.test`, `component-loading.test` |
| Reference-shaped literal data | `loader.test`, `loading-cancellation.test`, `component-loading.test` |
| Fatal load failure | `loader.test`, `loading-cancellation.test`, `component-loading.test` |
| Identical step IDs with different actions | `model.test`, `workflow-flow.test`, `navigation.test`, `docs-ownership.test`, `documentation.test` |
| Bare local prerequisite is context dependent | `model.test`, `workflow-flow.test`, `navigation.test`, `docs-ownership.test`, `documentation.test` |
| Replacement changes only shared components | `model.test`, `workflow-flow.test`, `navigation.test`, `docs-ownership.test`, `documentation.test` |
| Inspection ordering is not execution prediction | `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Step action precedes an overlapping default | `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Partial override and additional action | `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Empty step action list | `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Equal names across channels or types | `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Unresolved action alongside defaults | `model.test`, `workflow-flow-card.test`, `documentation.test` |
| Override and omitted override | `model.test`, `loader.test`, `workflow-flow-card.test`, `documentation.test` |
| Falsy and structured literals | `model.test`, `loader.test`, `workflow-flow-card.test`, `documentation.test` |
| Authored expressions | `model.test`, `loader.test`, `workflow-flow-card.test`, `documentation.test` |
| Workflow prerequisite direction | `model.test`, `graph-overview.test`, `graph-edges.test` |
| Sub-workflow and action transitions | `model.test`, `graph-overview.test`, `graph-edges.test` |
| Same label across parallel action channels | `model.test`, `graph-overview.test`, `graph-edges.test` |
| Explicit self-loop | `model.test`, `graph-overview.test`, `graph-edges.test` |
| Unlinked document | `model.test`, `graph-overview.test`, `graph-edges.test` |
| Runtime and mixed relationships | `model.test`, `graph-layout.test`, `graph-overview.test`, `graph-edges.test` |
| Prerequisite cycle and unrelated edges | `model.test`, `graph-layout.test`, `graph-overview.test`, `graph-edges.test` |
| Prerequisite self-loop | `model.test`, `graph-layout.test`, `graph-overview.test`, `graph-edges.test` |
| Dense and disconnected relationships | `model.test`, `graph-layout.test`, `graph-overview.test`, `graph-edges.test` |
| Multiple local prerequisites | `inspection.test`, `model.test`, `workflow-flow.test`, `workflow-flow-card.test`, `documentation.test` |
| Cross-workflow prerequisite | `inspection.test`, `model.test`, `workflow-flow.test`, `workflow-flow-card.test`, `documentation.test` |
| Missing or external prerequisite step | `inspection.test`, `model.test`, `workflow-flow.test`, `workflow-flow-card.test`, `documentation.test` |
| Local workflow navigation | `inspection.test`, `model.test`, `navigation.test`, `workflow-flow-card.test` |
| External source versus local name collision | `inspection.test`, `model.test`, `navigation.test`, `workflow-flow-card.test` |
| Invalid external source or missing target | `inspection.test`, `model.test`, `navigation.test`, `workflow-flow-card.test` |
| Cross-workflow step focus | `navigation.test`, `injected-navigation.test`, `diagram-focus.test`, `docs-ownership.test` |
| Already-active destination | `navigation.test`, `injected-navigation.test`, `diagram-focus.test`, `docs-ownership.test` |
| Superseding navigation with duplicate IDs | `navigation.test`, `injected-navigation.test`, `diagram-focus.test`, `docs-ownership.test` |
| Cancellation or replacement | `navigation.test`, `injected-navigation.test`, `diagram-focus.test`, `docs-ownership.test` |
| Controlled destination accepts the request | `navigation.test`, `injected-navigation.test`, `diagram-focus.test`, `docs-ownership.test` |
| Missing destination step | `navigation.test`, `injected-navigation.test`, `diagram-focus.test`, `docs-ownership.test` |
| Controlled node selection | `navigation.test`, `injected-navigation.test`, `diagram-focus.test`, `docs-ownership.test` |
| Clearing a controlled highlight | `navigation.test`, `injected-navigation.test`, `diagram-focus.test`, `docs-ownership.test` |
| Workflow and step prerequisites in documentation | `docs-ownership.test`, `workflow-flow-card.test`, `documentation.test` |
| Calling workflow owns the card | `docs-ownership.test`, `workflow-flow-card.test`, `documentation.test` |
| Legacy call-node ownership | `docs-ownership.test`, `workflow-flow-card.test`, `documentation.test` |
| Duplicate step IDs in documentation | `docs-ownership.test`, `workflow-flow-card.test`, `documentation.test` |
| Effective action details | `docs-ownership.test`, `workflow-flow-card.test`, `documentation.test` |
| Prerequisites and multiple transitions | `documentation.test` |
| Goto versus retry recovery | `documentation.test` |
| Labels requiring escaping | `documentation.test` |
| Authored asynchronous interaction | `documentation.test` |
| Ambiguous source participant | `documentation.test` |
| Action and parameter parity | `documentation.test` |
| Participant identity and escaped labels | `documentation.test` |
| Unsupported version sequence | `documentation.test` |

## Named test evidence

### component-loading.test.tsx

- real component loading shows missing-reference warnings and getDocument retains authored content without decoration
- fatal reusable expressions render a load-error card rather than a semantic view
- parseable unknown profiles display raw content, limitations and retrieval through the existing ref

### diagram-focus.test.tsx

- focus waits for React Flow readiness and destination nodes and suppresses later start-node centering
- superseded centering timers cannot focus a stale selection

### docs-ownership.test.tsx

- call-card scrolling uses the calling owner, including legacy scoped identities: true
- call-card scrolling uses the calling owner, including legacy scoped identities: false
- unavailable legacy ownership is reported without guessing the called workflow
- docs-only prerequisite navigation focuses the owner-scoped destination among duplicate init IDs
- simultaneous controlled destination and selection cannot have step scrolling overwritten by workflow scrolling

### documentation.test.ts

- shared-model documentation effective actions apply channel/name/type policy once with original defaults retained
- shared-model documentation prerequisites and call-step provenance retain owning workflow and scoped links
- shared-model documentation reusable action parameter values retain property-presence overrides and definition immutability
- shared-model documentation missing declaration warnings include declaration/use provenance and original zero value
- shared-model documentation opaque unknown fields/extensions, identity and custom dialect remain visible with separate limits
- shared-model documentation parseable unknown profile has raw documentation with no guessed workflow semantics
- shared-model documentation source details preserve channel-only receive intent and full querystring without HTTP assumptions
- shared-model documentation authored HTML and delimiters are escaped in attributes and readable details
- schematic Mermaid consumers workflow prerequisites, external and missing targets stay classified in docs and Mermaid
- schematic Mermaid consumers unsupported profiles suppress flowcharts and older profiles never backport async/prerequisite semantics
- schematic Mermaid consumers a synthetic future model using existing fact kinds feeds unchanged documentation and Mermaid consumers
- schematic Mermaid consumers sequence preserves authored send/receive, ambiguous source and all effective actions without predictions
- schematic Mermaid consumers flowchart preserves all action transitions, one-way goto and retry source return
- schematic Mermaid consumers prerequisites retain authored order and safe IDs/labels parse with punctuation and newlines

### fixtures.test.ts

- early chained-workflow fixtures shared 1.0 and 1.1 composition differs only in declared feature version
- early chained-workflow fixtures patch and info versions vary independently without changing common content
- early chained-workflow fixtures new fields in 1.0 and raw future-version content remain authored
- early chained-workflow fixtures unknown action collides with a recognized default without losing authored content
- early chained-workflow fixtures identity, retrieval URI, custom dialect, relative references and extension payloads are distinct
- early chained-workflow fixtures unknown fields and extensions exist at every authored structural level
- early chained-workflow fixtures workflow permutations have identical per-workflow contents and isolated objects
- early chained-workflow fixtures valid references coexist with repeated component actions containing missing zero-valued parameters
- early chained-workflow fixtures absent components and absent parameter/action buckets are separate cases
- early chained-workflow fixtures reference-shaped literals occupy values, criteria, examples, descriptions and extensions
- early chained-workflow fixtures every falsy/structured/expression/selector override has an own value property; omission does not
- early chained-workflow fixtures duplicate init IDs and authored tracking collisions retain different owning contents
- early chained-workflow fixtures action fixtures preserve partial overrides, additions, criteria, channel/type collisions and empty lists
- early chained-workflow fixtures bare prepare prerequisite resolves contextually and call ownership differs from destination
- early chained-workflow fixtures external/local collisions, absent/wrong source kinds, missing/malformed/dotted targets remain authored
- early chained-workflow fixtures replacement changes only shared component definitions
- early chained-workflow fixtures async send/receive retain timeout, correlation, prerequisites and complete querystrings
- early chained-workflow fixtures opaque and ambiguous sources, conflicting locators and participant/label collisions are explicit
- early chained-workflow fixtures dense graph preserves parallel channels/source steps, calls, self-loop and disconnected workflow
- early chained-workflow fixtures runtime and mixed cycles differ from prerequisite-only cycles
- early chained-workflow fixtures unlinked grid has multiple columns worth of workflows without authored relationships
- early chained-workflow fixtures multiple local prerequisites deliberately differ from authored array order
- early chained-workflow fixtures fatal inputs cover syntax, root, duplicate identity, malformed reusable and schema dereference cases

### graph-edges.test.tsx

- relationship edge routing routes parallel edges in separate lanes
- relationship edge routing routes self-loops outside card bounds
- relationship edge routing renders the actual path, marker and a textual cycle warning
- bounded overview cards retains fixed bounds and visible classification with long authored labels

### graph-layout.test.ts

- workflow relationship layout flags only prerequisite edges internal to prerequisite cycles
- workflow relationship layout keeps dense SCCs, parallel edges and disconnected cards deterministic and disjoint
- workflow relationship layout ranks each condensation component by its longest prerequisite path
- workflow relationship layout uses a three-column grid when no local relationships exist

### graph-overview.test.ts

- complete document relationship overview preserves prerequisites, calls, channels, parallel occurrences and self-loops
- complete document relationship overview reserves disjoint supplementary cards and points prerequisites toward their owner
- complete document relationship overview does not produce a semantic overview for unknown profiles

### harness.test.ts

- pure TypeScript action utilities execute under the package-local runner

### harness.test.tsx

- TSX components and CSS imports execute with jsdom

### injected-navigation.test.tsx

- injected provider cancels pending focus after clear
- injected provider cancels pending focus after overview
- injected provider cancels pending focus after controlled-selection
- injected provider cancels pending focus after unrelated-workflow
- injected controlled workflow acceptance retains scoped destination focus

### inspection.test.ts

- private inspection profiles selects feature versions and retains exact authored versions without mutation
- private inspection profiles uses scoped prerequisite targets, dotted keys, and role-aware external sources
- private inspection profiles keeps unknown profiles raw and older unsupported features opaque
- private inspection profiles inventories only supported structural references and preserves full dotted component keys
- source-neutral bindings and profile extension contract keeps bare source IDs unverified, conflicting locators ambiguous, and authored async metadata opaque
- source-neutral bindings and profile extension contract permits a private future profile to reuse domain extraction without consumer version dispatch
- recognizes a braced source locator without interpreting its pointer or method
- keeps dotted external source prefix ambiguity and missing-role targets non-navigable
- keeps extension vocabulary opaque and reports 1.1-only source/parameter fields in older profiles
- rejects duplicate scoped identities on synchronous known-profile supplied snapshots
- uses reference role to disambiguate indexed workflow IDs containing a step-expression separator
- warns for unknown async intent without creating transport semantics or warning on extension data
- distinguishes malformed empty expression identifiers from valid missing targets
- retains URI provenance while assigning distinct supplied snapshot revisions at the same location
- classifies action workflow and step fields according to their locator role
- warns at a reusable querystring parameter use in an older profile while retaining its raw value

### loader.test.ts

- malformed reusable suffixes are fatal before missing-reference recovery or resolution bypass

- real resolver recovers a missing reusable and still resolves valid schemas/actions in either workflow order
- missing parameter definitions survive reusable-action transclusion and multiple uses with falsy overrides
- JSON and YAML inputs retain isolated authored/restored native snapshots
- unknown parseable profile is raw and bypasses known workflow identity/dereferencing assumptions
- fatal syntax, root, identity, malformed expression or schema failures reject rather than return a partial document: "{\"arazzo\": \"1.0.1\","
- fatal syntax, root, identity, malformed expression or schema failures reject rather than return a partial document: "arazzo: 1.0.1\ninfo: [broken\n"
- fatal syntax, root, identity, malformed expression or schema failures reject rather than return a partial document: {"arazzo":"1.0.1"}
- fatal syntax, root, identity, malformed expression or schema failures reject rather than return a partial document: {"arazzo":"1.1.0","info":{"title":"load","version":"1"},"sourceDescriptions":[],"components":{"inputs":{"schema":{"type":"object","properties":{"id":{"type":"string"}}}},"successActions":{"finish":{"name":"finish","type":"end"}}},"workflows":[{"workflowId":"missing","steps":[{"stepId":"init","operationId":"get","onFailure":[{"reference":"$components.failureActions.absent","x-original":{"flag":false}}]}]},{"workflowId":"missing","steps":[{"stepId":"init","operationId":"get","onFailure":[{"reference":"$components.failureActions.absent","x-original":{"flag":false}}]}]}]}
- fatal syntax, root, identity, malformed expression or schema failures reject rather than return a partial document: {"arazzo":"1.1.0","info":{"title":"load","version":"1"},"sourceDescriptions":[],"components":{"inputs":{"schema":{"type":"object","properties":{"id":{"type":"string"}}}},"successActions":{"finish":{"name":"finish","type":"end"}}},"workflows":[{"workflowId":"duplicate","steps":[{"stepId":"same"},{"stepId":"same"}]}]}
- fatal syntax, root, identity, malformed expression or schema failures reject rather than return a partial document: {"arazzo":"1.1.0","info":{"title":"load","version":"1"},"sourceDescriptions":[],"components":{"inputs":{"schema":{"type":"object","properties":{"id":{"type":"string"}}}},"successActions":{"finish":{"name":"finish","type":"end"}}},"workflows":[{"workflowId":"malformed","steps":[{"stepId":"one","parameters":[{"reference":"$components.parameters"}]}]}]}
- fatal syntax, root, identity, malformed expression or schema failures reject rather than return a partial document: {"arazzo":"1.1.0","info":{"title":"load","version":"1"},"sourceDescriptions":[],"components":{"inputs":{"schema":{"type":"object","properties":{"id":{"type":"string"}}}},"successActions":{"finish":{"name":"finish","type":"end"}}},"workflows":[{"workflowId":"schema","inputs":{"$ref":"#/components/inputs/absent"},"steps":[]}]}
- unsupported $self and schema dialect expansion preserves authored identity and references explicitly
- unavailable base metadata remains unavailable and expansion bypass is explicit
- unrepresentable specification versions reject with a distinct parsing failure
- URL parsing retains real retrieval metadata and does not fetch source descriptions
- native valid reusable expansion preserves authored occurrence extensions and declaration extensions

### loading-cancellation.test.tsx

- an older asynchronous load cannot overwrite a replacement resolved first

### model.test.ts

- shared viewer inspection policy keeps step entries first, retains defaults by name/type/channel, and preserves original collections
- shared viewer inspection policy gives scoped identities to colliding authored IDs, preserving authored content in the native snapshot
- shared viewer inspection policy preserves parallel channels and self-loop relationships using serialized tuple IDs
- shared viewer inspection policy retains action parameter own-property override 0 and does not mutate a definition
- shared viewer inspection policy retains action parameter own-property override false and does not mutate a definition
- shared viewer inspection policy retains action parameter own-property override "" and does not mutate a definition
- shared viewer inspection policy retains action parameter own-property override null and does not mutate a definition
- shared viewer inspection policy retains action parameter own-property override "literal" and does not mutate a definition
- shared viewer inspection policy retains action parameter own-property override {"selector":"$inputs.query"} and does not mutate a definition
- action provenance and identity trust retains inherited retry defaults with source-step applicability and declaration ownership
- action provenance and identity trust retains unique verified provider tracking IDs and rejects collisions
- action provenance and identity trust projects repeated missing reusable parameter warnings to each action use without fabricated values
- flags only prerequisite-only cycle edges, preserving entering and mixed relationships
- does not let a verified supplied ID collide with a generated sidecar ID
- keeps typed unresolved and unsupported entries visible without suppressing or inventing defaults
- retains defaults when a same-name step transition has conflicting locators
- rejects verified tracking combinations that collide under the legacy node-ID format

### navigation.test.tsx

- uncontrolled initial first workflow and overview round trip emit one callback each
- explicit null starts overview and controlled destination accepts pending scoped focus
- already-active destination focuses immediately and clearing cancels controlled highlighting without a null callback
- superseding controlled destinations and document replacement cancel pending duplicate init focus
- component-only document replacement rebuilds overview and shared model while selection reuses the model
- overview, clear and later node selection cancel pending controlled focus requests
- external overview references with local workflow-name collisions never receive local navigation handlers
- simultaneous controlled workflow acceptance and unrelated controlled selection cancels rather than consumes pending focus

### public-types.test.ts

- public type compatibility keeps legacy call-node and documentation fields optional
- public type compatibility accepts the selected 1.1 fields and preserves literal reusable values
- public type compatibility exports identical public contracts from both entries

### workflow-flow-card.test.tsx

- shared-model cards and prerequisite paths shows authored async metadata and the same effective inspection order
- shared-model cards and prerequisite paths uses scoped prerequisite navigation and renders the real left side route
- renders inherited reusable action values, unresolved occurrences, criteria and using-step warnings

### workflow-flow-return-paths.test.tsx

- actual return-edge paths renders distinct authored-order/call/return labels and one-way arrows from converter output

### workflow-flow.test.ts

- single workflow shared-model flow retains authored chain, channel-only structural support and calling ownership
- single workflow shared-model flow keeps goto one-way, retry returning to source and calls returning to next step
- single workflow shared-model flow places prerequisites beside a bounded authored chain after the actual layout
- single workflow shared-model flow keeps every supplementary card disjoint for vertical and horizontal layouts
- single workflow shared-model flow retains legacy supplied tracking IDs without requiring a document argument

## Review fixes

A fresh reviewer confirmed no Critical findings and identified three Important gaps. Regression tests and fixes now cover external/local overview name collisions, injected cancellation, and full effective action parameter/inherited warning rendering. Follow-up review identified the simultaneous controlled destination/selection cancellation race; it now has a failing-before/passing-after regression and the same consumption guard in both providers. Additional loader and docs tests fixed valid reusable occurrence extension loss and workflow scrolling overriding step scrolling. A final loader regression verifies malformed reusable suffixes remain fatal before missing-reference recovery or resolution bypass; shared validation matches the installed resolver identifier grammar and preserves dotted names.

The pre-verification-review follow-up reported no remaining Critical or Important findings; navigation and injected cancellation tests pass 13/13. The final loader delta also passed independent review, with loader/inspection/model regressions passing 50/50. Overall task progress is 37/37 after browser acceptance and final reconciliation.

The earlier acceptance review independently checked the smoke script, observations, selected screenshots, all six design criteria and strict OpenSpec validation; no Important unmet product or design criteria were found.

The later independent verification in `verification-review.md` identified W1–W5 and two suggestions. The review follow-up below supersedes the earlier approval wording. At completion of remediation, corrective work was uncommitted. The user subsequently requested commit and push, with separate signed-off commits for semantic fixes, overview readability and verification evidence. No PR or archive was performed.


## Verification-review follow-up

Task progress is 45/45, including all eight review follow-up tasks. All five findings in [verification-review.md](verification-review.md) have targeted fixes with observed failing-before/passing-after regression tests. The shared native/generic occurrence-field helper preserves effective projection data; the shared transfer helper supplies call/retry return behavior to interactive and Mermaid consumers. Cross-workflow action-step syntax stays diagnostic rather than navigable. Mermaid parameter notes retain complete authored data, and parser-aware description escaping preserves CommonMark while rendering authored HTML literally.

### Named additional test evidence

`verification-review.test.tsx` adds 16 cases:

- W1 owner-bound action-step classification for Arazzo 1.0.1 and 1.1.0, with paired cross-workflow prerequisites and unsupported-locator diagnostics.
- W2 native, bypassed and supplied reusable occurrences: native export, native/effective equality, declaration/use fields and paths, nested generic parameters, documentation projection, and unchanged caller input.
- W3 local workflow, external workflow, local-step recovery, explicit self retry, implicit self retry, and missing-target return parity; installed Mermaid parsing and final interactive layout.
- W3 local/external workflow call returns and one-way goto.
- W4 complete querystring, structured/falsy and unresolved parameter notes, checked for content retention and Mermaid syntax.
- W5 rendered CommonMark links/emphasis/multiline content and authored-HTML escaping; autolinks plus inline/fenced code containing angle brackets.

Three additional component cases cover compact/full accessible relationship labels, separated reciprocal/self-loop label anchors, and selected relationship detail/clearing. Existing tests remain enabled. Independent read-only review checked W1–W5/S1 and found no substantive remaining issues after the CommonMark autolink/code correction.

### Fresh checks and scope

Node 26.3.1 from `.nvmrc`:

- UI suite: 155 tests in 21 files, zero failures or skips.
- Monorepo `npm test`: parser, resolver, runner, validator and UI suites; all five projects passed (628 tests).
- UI type checking: passed.
- UI lint: zero errors, 36 existing warnings.
- UI build: ESM/UMD entries, both declaration bundles, CSS and hashed standalone app passed; private snapshot/model/transfer/recovery types remain absent from public declarations.
- Strict OpenSpec validation and `git diff --check`: passed.
- Built-app Chromium smoke: 16 observations, zero page/console errors and zero external requests.

The refreshed [observations](browser-evidence/observations.json) and screenshots include [compact overview](browser-evidence/dense-cyclic-overview.png), [selected relationship detail](browser-evidence/dense-selected-relationship.png), and [return/CommonMark behavior](browser-evidence/review-return-and-commonmark.png). The async flowchart SVG assertion now proves querystring location and full authored value retention. Return checks cover external and local-step recovery plus external calls; invalid cross-workflow actions remain inert. Rich-description checks exercise links, emphasis, autolinks and code with safe HTML handling.

Dense routing still permits paths behind unrelated cards; compact text, separated anchors and keyboard-accessible full details address the presentation suggestion without claiming optimal routing. This remains a single Chromium viewport, not an exhaustive accessibility or conformance audit. The contribution split and required upstream discussion are documented in `verification-review.md`; existing history was not rewritten.
