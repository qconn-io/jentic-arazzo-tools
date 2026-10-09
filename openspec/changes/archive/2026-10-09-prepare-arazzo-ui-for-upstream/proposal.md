## Why

The upstream-maintainer review of `a0d0847` found that useful workflow visualization is undermined by acquisition-policy bypasses, invented actor ownership, misleading revision impact, incomplete operation-consumer paths, and failing contribution gates. Resolve those findings as one coordinated remediation program while preserving the private inspection architecture and preparing independently reviewable upstream slices.

## What Changes

- Make the private loading boundary enforce one source-acquisition authority across Arazzo, OpenAPI, AsyncAPI, catalog loading, and pinned revision review, including cancellation, bounds, dependency invalidation, and provenance.
- Require explicit actor bindings for each owning workflow/step; expanded helpers and descriptive implementations retain unknown actors when no binding exists.
- Interpret contract references structurally, preserve literal example/default/extension data, and trace shared workflow defaults through the existing effective-action model without implicating unrelated entries.
- Show direct operation users and their bounded, classified entry-point paths together, retaining repeated call locations and partial-coverage explanations.
- Make lint, generated-declaration consumers, installed package exports, and a compact production-browser acceptance suite repeatable local and CI gates.
- Present optional scenario/profile configuration through progressive disclosure, style new controls consistently, and keep diagnostic implementation details in advanced inspection. Measure a minimal embedded viewer consumer before claiming optional code is lazy or inexpensive.
- Prepare a dependency-ordered upstream submission series with signed commits, explicit scope/issue drafts, a public-interface inventory, concise reproducible evidence, and recorded maintainer feedback status. Preserve the current source branch and complete historical evidence; publishing and destructive history changes require separate instructions.
- Collect honest Owner/Developer comprehension evidence and retain explicit selected-1.1, authored-versus-observed, and incomplete-coverage limits.

### Finding coverage

| ID | Review finding or advisory | Planned disposition |
| --- | --- | --- |
| R1 | Missing DCO on `73799de` and `503c214` | Signed replacement contribution commits and an auditable source-to-series mapping |
| R2 | Split acquisition policy and reproduced provider bypass | Provider-governed secondary resolution, including offline snapshots |
| R3 | Manual package safeguards | Maintained consumer/export and production-browser CI gates |
| R4 | Eight feature slices plus large historical evidence in one PR | Focused submission sequence and separate evidence/tooling disposition |
| R5 | Inferred helper actor | Explicit owning-scope binding or visible unknown actor |
| R6 | Literal `$ref` produces false impact | Structural reference traversal with literal leaves |
| R7 | Workflow default users omitted; unrelated entries implicated | Provenance-aware effective uses and justified impact roots |
| R8 | Operation consumers lack entry paths | Operation-scoped consumer/path presentation |
| R9 | Three lint errors | Typed scenario fixtures and a green root lint gate |
| A1 | Optional-feature bundle cost unclear | Same-toolchain minimal consumer measurement and corrected import boundaries |
| A2 | Default controls compete; styling inconsistent | Progressive disclosure and consistent keyboard/responsive controls |
| A3 | Human comprehension unmeasured | Fresh unfamiliar-reader records or explicit outstanding validation |
| A4 | Upstream scope agreement unknown | Concrete issue/PR drafts and feedback status without fabricated approval |
| A5 | Selected 1.1 support may be misunderstood | Consistent capability limits in UI, exports, docs, and submission text |

## Capabilities

### New Capabilities

- `workflow-inspection-integrity`: Cross-feature guarantees for acquisition authority, explicit actor ownership, declaration-reference meaning, effective action usage, and operation-scoped impact/navigation.
- `upstream-contribution-readiness`: Repeatable package/CI acceptance, low-friction optional controls, measured bundle boundaries, honest evidence, and a focused signed contribution handoff.

### Modified Capabilities

None. `openspec list --specs --json` returns an empty main-spec inventory. The eight archived capability specifications remain supporting requirements; this change adds focused cross-cutting remediation contracts without editing archives or promoting them into main specs.

## Impact

Implementation will affect `packages/jentic-arazzo-ui/src/utils/{loading,source,contract,model,catalog,review,systems}`, the catalog/standalone/detail controls, package build/test scripts, focused tests, `.github/workflows/build.yml`, and contribution documentation. Existing public component names, modes, callbacks, package paths, and versioned sidecar formats remain compatible. The UI may declare the already-used `@speclynx/apidom-reference` library as a direct dependency for its private native acquisition bridge; no distinct new runtime library or complete Arazzo 1.1 parser/validator/runner support is proposed. The shared resolver package's public interface and default behavior remain outside this repair's scope.

Planning creates only this change's artifacts. Implementation completion and upstream submission readiness will be reported separately: local repairs cannot manufacture maintainer agreement or human-study results, and preparing a series does not publish it.
