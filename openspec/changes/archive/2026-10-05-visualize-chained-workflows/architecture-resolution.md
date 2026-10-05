# Architecture verification resolution

Verified 2026-10-05 against `a8c563a` plus the current working-tree fixes. This report resolves the warnings in [architecture-review.md](architecture-review.md); the original findings remain historical evidence.

## Finding disposition

| Finding | Result | Evidence |
| --- | --- | --- |
| W1: dialect detection depends on schema-map names | Resolved | Structural schema-location traversal, 37 real-loader regressions in `test/architecture-review.test.ts` |
| W2: public edge unions exclude emitted relationships | Resolved | Exported public `RelationshipEdgeData`, both edge unions/entry points, typed converters, explicit callback projection, three component callback tests, both rolled-declaration consumer checks, three production-browser callback probes |
| W3: published consumer documentation omits the contract | Resolved | Package README integration section and controlled example; package changelog `Unreleased` Features/Bug Fixes entries without an invented release version |
| S1: layout duplicates presentation geometry | Retained as a maintenance suggestion | Expanded-card bounds pass in the built viewer; no new overlap defect demonstrated. Geometry estimates remain coupled to card presentation. |
| S2: broad earlier presentation replacement | Retained as an upstream review consideration | These fixes preserve the existing card/header presentation. The logical contribution split in `verification-review.md` remains applicable; no maintainer agreement is claimed. Dense routes can still pass behind unrelated cards. |

### W1: capability traversal

The loading gate enumerates workflow input schemas and component input **values**, independently of their names. Inside a schema it visits known single-schema, schema-array, and named-schema-map locations. Named keys such as `x-payload`, `default`, `examples`, `enum`, and `const` are never interpreted as keywords in a map. Literal values, extension content, and unknown vocabulary payloads remain opaque.

This follows the distinction between applicator schema locations and annotations in the [JSON Schema core specification](https://json-schema.org/draft/2020-12/json-schema-core) and [validation vocabulary](https://json-schema.org/draft/2020-12/json-schema-validation). It is a preflight capability check, not a new schema resolver or a conformance validator. An unsupported dialect bypasses the entire native expansion phase before mutation and reports `expansion-bypassed`.

Regression coverage verifies component-name invariance, `properties`/`$defs`/`definitions`/`patternProperties`/`dependentSchemas` map names, legacy dependencies, array and single-schema locations, inline workflow inputs, unchanged input/exported references, opaque examples/extensions/unknown keywords, and supported-dialect/boolean-schema controls. The initial 18-test run produced the expected 11 failures before the fix; all 37 loader cases now pass.

### W2: honest public events and private details

`RelationshipEdgeData` exposes `type`, `kind`, `label`, optional `warning`, `channel`, and `actionType`. `ArazzoEdgeType` and `ArazzoEdgeData` include `relationship`; both public entry points export the data type. The overview and prerequisite converters construct typed edges without the former `as unknown as ArazzoEdge` casts.

The private render extension retains lanes, geometry, provenance, and full relationship facts for the selected-edge panel. `DiagramView` projects relationship data before invoking `onEdgeSelect`, so these private fields never cross the public callback. Other event variants retain their existing behavior. Callback signatures are unchanged; exhaustive edge-data consumers must handle the additive variant.

Component tests exercise actual converter output through the click handler for calls, failure/retry actions, and step prerequisites. They verify callback identity, kind, optional action fields, absence of private data, and intact internal render data. The original callback regressions failed on leaked relationship/prerequisite facts before projection. Browser checks repeat the assertions through the production UMD/React Flow click path. The original full-detail picker also still passes.

`npm run test:declarations -w @jentic/arazzo-ui` compiles a consumer against each generated rolled declaration, including callback narrowing and legacy call-node compatibility. Separate negative compilation assertions ensure `WorkflowRelationship`, `EffectiveAction`, and `DocumentSnapshot` are private. The old bundles reproduced missing exports and TS2367; the newly built bundles pass. Searches of both bundles find no private snapshot/model/effective-action types.

### W3: published contract

The README now explains All workflows, omitted versus explicit-null selection, the empty-string callback and controlled mapping, controlled node clearing, external/missing target behavior, selected 1.1 limits, unknown-version handling, expansion bypass, native export behavior, and inspection order versus whole-list runner replacement. Its controlled TypeScript example handles relationship selection. The package changelog records unreleased features/fixes and the exhaustive-consumer impact; no package version was changed.

## Fresh verification

Node **26.3.1**, as required by `.nvmrc`:

| Check | Result |
| --- | --- |
| `npm test` | **668 passed** across all five packages: parser 51, resolver 53, runner 313, validator 56, UI 195 |
| UI test inventory | 23 files; 40 new cases; no skipped tests reported |
| UI `typescript:check-types` | Passed |
| UI `lint` | Zero errors; existing 36 warnings |
| UI `build` | Passed: ESM/UMD for both entries, both rolled declarations, CSS, standalone app |
| UI `test:declarations` | Both consumers passed, including independent private-export checks |
| Built Chromium smoke | **19 observations passed**, including three public-callback probes; no browser errors or source-description fetches |
| `openspec validate visualize-chained-workflows --strict` | Passed |
| `git diff --check` | Passed |

Lint initially raced with the build's removal of generated directories and reported ENOENT. Rerunning lint after the build completed passed. Test-fixture typing and formatting errors encountered during development were corrected before the final checks.

The browser assertions and evidence are repeatable:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
BROWSER_EVIDENCE_DIR=openspec/changes/visualize-chained-workflows/browser-evidence/architecture-resolution \
node openspec/changes/visualize-chained-workflows/browser-smoke.mjs
```

Use Node from `.nvmrc` after building the UI; omit `PLAYWRIGHT_MODULE` when Playwright is available normally. The browser runner now includes all three production callback probes. Historical screenshots were preserved; fresh [observations](browser-evidence/architecture-resolution/observations.json) include build asset hashes and public event payloads. The fresh [selected relationship screenshot](browser-evidence/architecture-resolution/dense-selected-relationship.png) was visually inspected.

Verification remains one Chromium browser at 1440×1000, not a cross-browser, full accessibility, performance, or unobstructed-edge-routing audit. S1/S2 are explicitly retained suggestions, not resolved defects. No parser/resolver/validator/runner production code was changed. No archive, commit, push, release, or maintainer communication was performed.
