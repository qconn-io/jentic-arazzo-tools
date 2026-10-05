# Architecture verification: visualize-chained-workflows

Reviewed 2026-10-05 at `a8c563a`, against pre-implementation `e3c9a5d`; compared the existing UI and repository conventions against `main` (`49dd8ef`).

**Resolution update, 2026-10-05:** W1–W3 have working-tree fixes and permanent regression coverage. Fresh verification passes 668 monorepo tests, both public declaration consumers, and 19 built-browser observations. See [architecture-resolution.md](architecture-resolution.md) for findings, evidence, and retained S1/S2 limits. The original review below is preserved as historical evidence.

**Assessment: retain the central architecture, but fix W1–W3 before upstream submission.** Two implementation defects remain at important architectural interfaces: schema capability detection and public callback typing. The published documentation also omits the new behavior. Passing tests and completed OpenSpec tasks do not close these gaps.

This is a fresh review of the implementation and design, not another review limited to the previous five fixes. It supplements `verification-review.md` and `verification.md`. Only this report was added; production code, tasks, and previous evidence were not edited. No archive, commit, push, or maintainer communication was performed.

## Summary

| Dimension | Status |
| --- | --- |
| Completeness | 45/45 tasks checked; implementation evidence for all 16 requirements; all 75 scenarios appear in the existing coverage inventory |
| Correctness | Existing 155 UI tests and 16 built-browser observations pass; new dialect probes demonstrate a missed case |
| Coherence | Core separation follows the design; runtime relationship edges contradict the declared public callback contract |
| Critical | None: no unchecked task or wholly absent requirement found |
| Warning | Three: two implementation defects and one contribution-documentation gap |
| Suggestion | Two: layout/presentation coupling and scope of the presentation replacement |

## WARNING — fix before upstream review

### W1 — Dialect capability detection confuses schema-map names with opaque fields

**Location:** `packages/jentic-arazzo-ui/src/utils/loading/loadDocument.ts:56-71,110-114`.

`hasCustomDialect` recursively skips every key beginning with `x-`, plus `example`, `examples`, `default`, `const`, and `enum`. That rule also runs against `components.inputs`, where keys are component names, and schema maps such as `properties`, where keys are property names. A component named `x-payload` or `default` is not an extension or a schema literal.

Confirmed with the real parser/resolver and an explicit base URI:

```ts
const input = {
  arazzo: '1.1.0',
  info: { title: 'Dialect probe', version: '1' },
  sourceDescriptions: [
    { name: 'api', type: 'openapi', url: 'https://example.test/openapi.json' },
  ],
  components: {
    inputs: {
      'x-payload': {
        $schema: 'https://example.test/custom-schema',
        type: 'object',
        properties: { p: { $ref: '#/components/inputs/P' } },
      },
      P: { type: 'string' },
    },
  },
  workflows: [{
    workflowId: 'a',
    inputs: { $ref: '#/components/inputs/x-payload' },
    steps: [{ stepId: 's', operationId: 'op' }],
  }],
};
const loaded = await loadDocument(input, {
  baseURI: 'https://example.test/arazzo.json',
});
```

Actual result: no `expansion-bypassed` diagnostic; the workflow input is expanded and `properties.p.$ref` becomes `{ type: 'string' }` under the custom dialect. Renaming the component to `payload` correctly bypasses expansion. A three-case probe produced one passing control and two failing cases (`x-payload`, `default`). The dialect identifier survives, but its presence does not prevent unsupported interpretation.

This violates design decision 3 and the **Unknown Content and Document Provenance Preservation** requirement, especially **Unsupported schema dialect** (`spec.md:57-74`). It also weakens honest reference-expansion reporting.

**Recommendation:** keep this capability gate in loading, but traverse schema locations structurally. Enumerate component input schemas as values independently of their names; distinguish schema keyword objects from maps of named subschemas. Skip literal/extension payloads only in the appropriate context. Do not replace this with a new JSON Schema resolver. Add key-invariance regressions for component names and `properties`/`$defs` names, and paired tests proving `$schema` strings inside examples/extensions remain opaque. Require both the limitation diagnostic and unchanged affected references.

### W2 — Relationship edges escape through a public type that excludes them

**Locations:**

- `packages/jentic-arazzo-ui/src/types/viewer.ts:28,47,297-377`: callback and edge contracts.
- `src/utils/conversion/documentToFlow.ts:143-177`: relationship payload and double cast.
- `src/utils/conversion/arazzoToFlow.ts`: analogous prerequisite edge cast.
- `src/components/DiagramView.tsx:190-191`: forwards the actual edge to `onEdgeSelect`.

Both `ArazzoEdgeType` and `ArazzoEdgeData` omit `relationship`. The converters bypass the mismatch with `as unknown as ArazzoEdge`, while the public callback receives the real relationship edge. Calling a payload private does not make it private once it crosses this callback.

Confirmed in the freshly built standalone viewer: clicking an overview edge invokes `onEdgeSelect` with `edge.type === 'relationship'` and `edge.data.type === 'relationship'`. Compiling a consumer against the freshly generated declaration bundle fails:

```ts
import type { ArazzoEdge } from './types/arazzo-ui';
function inspectRelationship(edge: ArazzoEdge) {
  if (edge.data?.type === 'relationship') return edge.id;
}
```

TypeScript reports `TS2367`: the declared data-type union and `"relationship"` have no overlap. Existing exhaustive consumers can also reach a supposedly impossible runtime branch.

**Recommendation:** define a small public relationship-edge data projection, include it in the exported edge unions, and re-export the type through both entry points. Keep the full `WorkflowRelationship`/`EffectiveAction` model private using an internal extension or sidecar. Remove the double casts that hide the mismatch. Test a consumer narrowing the actual callback payload against both rolled declarations, and retain a runtime callback assertion. The callback's argument list need not change; document the additive event variant and its effect on exhaustive consumers.

### W3 — Published package documentation does not explain the new contract

**Location:** `packages/jentic-arazzo-ui/README.md:20-22,168-184`; `CONTRIBUTING.md:97-98`.

The README is unchanged. Its supported-version list mentions only 1.0.0/1.0.1, and its component documentation does not explain All workflows, explicit `null` overview selection, the empty-string overview callback, selected 1.1 inspection limits, or the distinction between action inspection order and runner behavior. The relevant information exists in OpenSpec reports, which are absent from the package's published `files` list.

This is a concrete contribution-guideline gap: new behavior must be documented for package consumers. A generic in-view limitation is insufficient guidance for someone integrating controlled callbacks.

**Recommendation:** add a concise README section and controlled-overview example. Describe selected 1.1 inspection without claiming full parser/validator/runner support; explain overview callback values, controlled clearing, external-reference behavior, and action inspection ordering. Include the relationship-edge variant after W2 is fixed. Follow the repository's release-note convention rather than inventing a release version.

## Architectural assessment

The repository has explicit package responsibilities and contribution guidance. It does not document a universal preferred class hierarchy or functional style. The following judgments are grounded in current code, not an assumed maintainer philosophy.

| Approach | Assessment and evidence |
| --- | --- |
| Private inspection facade and two profiles | Keep. Real version differences justify the seam; `inspection/index.ts` selects profiles and consumers reuse facts. The runner's `normalizer/OpenAPIOperationNormalizer.ts` provides an existing version-dispatch precedent. There is no need for a public plugin registry. |
| Authored/restored native snapshots | Keep. They protect provenance and export fidelity while allowing a separate render projection. Loader tests exercise actual ApiDOM transclusion and missing references; a catch-and-return strategy would be weaker. |
| UI-local resolver recovery | Defensible as a contained workaround. The adapter owns parsing, placeholders, restoration and diagnostics; parser/resolver/runner/validator source files are unchanged. W1 must be fixed because the capability gate is part of this safety argument. |
| Facts separated from action display policy | Keep. `facts.ts` retains declared lists; `viewerModel.ts` computes inspection order; `StepExecutor.ts:289-314` still uses whole-list replacement. The distinction is visible and testable. Maintainers should explicitly agree to this product policy. |
| Shared transfer semantics | Keep. `transferSemantics` now gives the interactive and Mermaid consumers a common call/retry/goto rule. Previous return-parity findings have targeted regressions. |
| Scoped identity and destination-aware navigation | Keep. Duplicate step IDs, controlled updates and replacement documents are concrete problems that justify full pending destinations and document revisions. Tests exercise the races and browser focus. |
| Separate prerequisite cycle detection and overview SCC layout | Keep. Validation-like diagnostics and layout operate on different edge sets for a reason. The graph tests cover self-loops, mixed cycles and entering/leaving edges. An external graph library is not required merely to appear more sophisticated. |
| Transport-neutral source binding | Keep. Source uncertainty and authored asynchronous intent are explicit; inspection performs no source-document I/O and imports no runner execution machinery. |
| Public payload separation | Incomplete. Rolled declarations omit private model types, but W2 shows that the runtime event interface is still wider than its declared type. Declaration cleanliness alone does not prove encapsulation. |
| UI-local Vitest | Reasonable. TSX/CSS, React integration and real Mermaid parsing are concrete needs; the other four package test runners remain intact and pass. |

The profile's major/minor distinction follows [Arazzo versioning](https://spec.openapis.org/arazzo/v1.1.0.html#versions). Keeping prerequisites separate from invocation is consistent with the [Step dependencies section](https://spec.openapis.org/arazzo/v1.1.0.html#step-dependencies-and-execution-order). Neither observation certifies all selected 1.1 semantics.

### SUGGESTION S1 — Reduce duplicated knowledge of card geometry

`src/utils/sequentialLayout.ts:12-70` mirrors `src/nodes/StepNode.tsx` through many pixel constants, string-length estimates, expanded-detail allowances and a final 10% multiplier. This is a maintainability concern: a presentation change can require a second change in layout, and the compiler cannot enforce the connection.

The fresh expanded-card browser test passes, so this is **not a newly demonstrated overlap bug**. Avoid a speculative wholesale layout rewrite. Prefer sharing bounded section metrics with the card presentation, or using measured heights with an explicit relayout policy if dynamic sizing becomes necessary. Test actual geometry after expansion, long diagnostics and font changes rather than only estimator output.

### SUGGESTION S2 — Narrow or justify the presentation replacement

The implementation changes 32 production UI source files, adding 4,115 lines and removing 3,286 relative to the pre-implementation commit. Much of the necessary work is semantic, but `StepNode`, `WorkflowRefNode`, and `markdownFormatter` also replace substantial existing presentation. The previous CommonMark regression demonstrates the compatibility cost of that breadth.

Before presenting the change, distinguish required relationship/ownership changes from optional visual simplification. Preserve the existing source-card/header styling where it does not obstruct the feature, or give maintainers a separate visual-change review. The fresh dense overview still routes some paths behind unrelated cards; compact labels and accessible full details improve inspectability but do not establish unobstructed routing.

`CONTRIBUTING.md:62-65,78,105` asks for feature discussion, logical commits, and small focused PRs. The previous report already provides a sensible contribution split; it remains a preparation plan, not evidence of upstream agreement. This review did not contact maintainers or establish whether that discussion exists.

## Design acceptance and requirement coverage

| Design acceptance criterion | Current result |
| --- | --- |
| Distinct parser/resolver/validator/runner/viewer responsibilities | Largely followed; capability traversal defect W1 needs correction within loading |
| Native context and authored content survive projection | Existing recovery/provenance regressions pass; W1 expands references where the design promises preservation |
| Specification facts separate from inspection ordering | Followed |
| No required HTTP operation shape | Followed for the selected scope |
| Unsupported semantics visible without guessed interpretation | Existing profile/action cases pass; custom-dialect gating is incomplete under W1 |
| Profile can supply known fact kinds to unchanged consumers | Private synthetic-profile tests pass; this is an extension-seam test, not proof of future-standard support |

| Requirement | Implementation/test evidence | Assessment |
| --- | --- | --- |
| Versioned inspection and capability reporting | inspection facade/facts; inspection, loader and documentation tests | Implemented; W1 weakens expansion reporting |
| Transport-neutral inspection | source binding facts; source fixtures, card/docs/Mermaid tests | Implemented; fresh async browser observations pass |
| Unknown content and provenance | loader snapshots, inspection provenance, native export tests | Implemented but custom-dialect scenario incomplete under W1 |
| Overview and navigation compatibility | provider, tabs, navigation tests | Behavior passes; public edge callback defect W2 is an additional compatibility gap |
| Deterministic loading and reference preservation | loader and cancellation tests using real parser/resolver | Existing missing-reference/fatal cases pass; W1 adds a capability-gating regression case |
| Shared semantics/scoped identity | model, documentation and ownership tests | Existing scoped/replacement assertions pass |
| Action precedence/channel separation | model policy, model/card/docs tests | Implemented with explicit inspection labeling |
| Reusable action parameter overrides | facts and occurrence-field helper; loader/inspection/review tests | Existing literal/override/native-versus-generic assertions pass |
| Complete relationship graph | model relationships, overview converter, graph tests | Existing parallel/call/action/prerequisite assertions pass |
| Cycles/readable layout | graph layout/edge tests and fresh dense browser evidence | Existing bounds/routes pass; S1/S2 qualify broader layout claims |
| Step prerequisites/authored order | converter and sequential layout; workflow-flow/edge/browser tests | Existing final-layout/path assertions pass |
| Classified navigation | target classifier; inspection/navigation/review tests | Prior action-ownership defect is fixed in tested cases |
| Destination-aware focus | provider and DiagramView; navigation/focus/browser tests | Existing cancellation/controlled/destination cases pass |
| Documentation prerequisites/ownership | generator and DocsView; docs-ownership and browser tests | Existing caller ownership/scoped scroll cases pass |
| Mermaid relationship semantics | shared transfer helper/flowchart generator; documentation/review tests | Prior return/parameter defects are fixed in tested cases |
| Mermaid inspection sequence | sequence generator; real parser tests and async browser observation | Existing direction/ambiguity/action/escaping assertions pass |

All 75 scenario headings have entries in `verification.md`. That inventory and the named tests were reviewed; they are not exhaustive input-space coverage. W1's component-name variants are missing from the existing dialect tests. W2 needs public-consumer type coverage tied to a real emitted edge, which the current legacy-type tests do not provide.

## Previous findings

The previous W1–W5 are retained as resolved **for their tested cases**: action-step ownership, lossless reusable projection, transfer/return parity, flowchart parameters, and safe document-description CommonMark. Their 16 permanent regression cases pass. The compact-label/selected-detail tests and fresh browser observations support the previous readability improvement. None of these resolutions establishes that every interface or combination is correct; the new findings above concern other cases.

## Fresh verification and limits

Using Node 26.3.1 from `.nvmrc`:

- UI tests: **155 passed in 21 files**, no skips reported.
- Monorepo `npm test`: **628 passed across all five projects** (51 parser, 53 resolver, 313 runner, 56 validator, 155 UI).
- UI type checking: passed.
- UI lint: zero errors, 36 warnings.
- UI build: passed; both ESM/UMD entry points, both rolled declarations, CSS and standalone app generated. Searched rolled declarations for private snapshot/model/effective-action types; none found.
- Strict OpenSpec validation: passed.
- `git diff --check`: passed before and after report creation; the new report was also checked separately as an untracked file.
- Fresh built-app Chromium smoke: **16 observations passed**, including expanded cards, source intent, Mermaid rendering, navigation and prior review fixes. Fresh selected-relationship screenshot was also inspected visually. Evidence is in `/tmp/arazzo-architecture-browser-evidence`; the checked-in historical screenshots were not overwritten.
- Additional browser callback probe: confirmed a runtime `relationship` edge delivered to `onEdgeSelect`; `/tmp/arazzo-architecture-edge-browser.log`.
- Public declaration consumer probe: expected branch fails compilation with **TS2367**; `/tmp/arazzo-edge-contract-probe.log`.
- Real loader capability probe: ordinary component name passes, `x-payload` and `default` fail the expected bypass assertion; `/tmp/arazzo-architecture-confirmed-probes.log`.

Temporary probes were kept outside the repository. Exploratory unknown-version/missing-metadata inputs did not establish a supported-load regression and are excluded from findings; one parser-shape experiment exhausted a worker's heap, so it is not evidence against this feature's raw fallback. No production fix is claimed. The browser evidence is one Chromium viewport, not a cross-browser or full accessibility audit. No performance benchmark or maintainer-acceptance claim is made.

**Final assessment:** no critical completeness issue; three warnings remain. The feature does not need wholesale architectural replacement. Correct the schema traversal and public event contract, publish the user-facing behavior, then rerun the focused regressions and integration checks before calling it ready for upstream review.
