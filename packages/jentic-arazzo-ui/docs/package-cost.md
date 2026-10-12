# Package acceptance and cost evidence

The maintained commands are documented in the [README](../README.md#maintained-package-acceptance).
Generated reports, installed package files and browser applications stay under
ignored `test-output/package-consumer/`.

## Measurement method

The upstream source is pinned to `49dd8ef814637b481c0a1998f586ce2785812f5d`.
The repaired source is the working tree based on
`291829e2cc9bb29a1883abb0ef6a52273de4ca56`; this HEAD alone does not identify
uncommitted working-tree bytes. Each run records the actual repaired/baseline tarball SHA-256,
installed dependency graph hash and toolchain in `bundle-comparison.json`.
The upstream checkout is detached and temporary; measurement does not rewrite
the source branch or baseline.

Both sources use the same current Vite library configuration and physically
installed downstream dependency graph. The script asserts that replacing the UI
package preserves every other installed dependency record. Baseline dependency
and peer declarations are aligned to the current package only for this controlled
measurement. No dependency upgrade is performed in the source checkout.
The measurement consumer pins the SpecLynx family to the repository's locked
5.0.1 versions for identical comparisons. A separate maintained fresh-install
gate resolves the advertised ranges without SpecLynx overrides and checks both
supplied-object and YAML catalog inputs. The UI generic YAML adapter now uses
`^5.0.1`, matching the existing family ranges; both fresh hosts pass with 5.2.6.
The earlier mixed exact-5.0.1/newer-family browser failure remains historical
reproduction evidence, rather than an unresolved result for the repaired bytes.
Full resolved locks, copied tarball hashes and caught diagnostic exceptions are
retained for each fresh probe. Successful projection does not imply every native
parser detection attempt is exception-free or prove arbitrary future releases.

Consumer builds use production minification, an ES2022 target, React 19.2.7,
Vite 8.1.5, TypeScript 5.9.3 and Node 22.22.2. Sizes use Node `gzipSync` defaults
for every file in both runs. Initial JS is the entry plus its static chunk import
closure; deferred JS is the remaining emitted chunks. Numbers sum individually
gzipped files and exclude source maps and CSS. CSS is shown separately. Deferred
code is available on demand; this total does not assert that ordinary viewing
downloads every deferred chunk. Transport/Brotli and user comprehension are not
measured by these builds.

The identical minimal workload imports only `ArazzoUI`, React and stylesheet.
Both revisions also exercise direct standalone and a deferred standalone workload.
Catalog/review is an additional repaired workload because upstream has no such
APIs; it is not represented as a like-for-like baseline feature comparison.

## Import boundary evidence

Catalog loading now imports Arazzo/OpenAPI/AsyncAPI adapters only after the
acquired document kind is known. The main and standalone package exports and the
typed ESM-only catalog path remain intact.

The minimal installed consumer excludes `ArazzoCatalog`, `ArazzoWorkflowReview`,
`compareWorkflowRevisions`, `buildCatalogIndex` and `loadCatalog` from all emitted
chunks. Its OpenAPI/AsyncAPI adapters survive only in deferred chunks, as needed
by explicit source inspection. The optional consumer positively verifies that
catalog/review implementations survive in its deferred package chunk. The gate
uses emitted source-map positions within the packed library's source regions;
searching original source content or minified function names alone cannot
establish retention. Module contributions and the region-presence result are
recorded per chunk.

After moving the adapter imports, the current compiler successfully removes the
unused catalog/review exports. No additional purity annotations, removed exports,
removed public paths or ignored side effects are necessary. Shared viewer
inspection, Systems/scenario support, Mermaid, ReactFlow, and native parsing
remain real costs; passing the retention assertion is not a claim that all
optional features are independently lazy.

## Measured repaired package snapshot, 2026-10-12

This run includes the sequence-first reading repairs, prerequisite ordering,
Step descriptions timeline, container-aware inspector modality, overview visual
hierarchy updates, and review remediation. The client session date is 2026-10-12;
generated reports retain the tool environment's own timestamps. Bytes are exact
gzip byte counts, not rounded kB.

| Installed consumer workload | Baseline initial JS | Repaired initial JS | Baseline deferred JS | Repaired deferred JS | Baseline CSS, all emitted | Repaired CSS, all emitted |
| --------------------------- | ------------------: | ------------------: | -------------------: | -------------------: | ------------------------: | ------------------------: |
| Minimal embedded viewer     |           1,373,942 |           1,418,350 |              780,434 |              790,009 |                     2,277 |                     5,765 |
| Direct standalone           |           1,377,369 |           1,434,783 |              780,406 |              789,974 |                     2,277 |                     5,765 |
| Deferred standalone         |              60,248 |              60,249 |            2,097,753 |            2,166,983 |                     3,791 |                     7,281 |
| Deferred catalog/review     |         unavailable |              60,252 |          unavailable |            2,166,199 |               unavailable |                     7,281 |

The comparable minimal viewer's initial JS adds 44,408 gzip bytes (about 3.2%).
Direct standalone adds 57,414 bytes (about 4.2%). These costs include shared
integrity/model/rendering changes; optional-only catalog/review code remains
absent from the minimal viewer, and the module report distinguishes retained
initial code from deferred format adapters. No percentage target is asserted.

| Whole emitted library entry file | Baseline raw bytes | Repaired raw bytes | Baseline gzip bytes | Repaired gzip bytes |
| -------------------------------- | -----------------: | -----------------: | ------------------: | ------------------: |
| Main ESM entry                   |            177,815 |            434,877 |              28,011 |              96,561 |
| Main browser UMD                 |          7,725,626 |          8,044,116 |           1,798,596 |           1,873,065 |
| Standalone ESM entry             |            190,747 |            475,898 |              32,019 |             107,460 |
| Standalone browser UMD           |          7,735,514 |          8,109,220 |           1,802,079 |           1,890,799 |

ESM entries also have shared/deferred sibling files; their entry-file sizes alone
are neither total package size nor downstream initial download.

Snapshot identities:

- Baseline UI tarball SHA-256: `57d6fc3b5187ac1df23145f59d13e81fb34b2af80874f3f625fca23ff2ce89ff`.
- Repaired UI tarball SHA-256: `5fc9781e87ec766bba17eedba31bc2b31bfffdb19f3bff38a6d26229a34789d8`.
- Identical installed dependency graph SHA-256 (excluding the substituted UI record): `e13d3fd8bd5bcf7d6d50e0e2c14154a9e8730f290d4d11e023fb4653d334d8b6`.

The baseline/repaired dependency equality assertions, retained source-region
checks, full package acceptance, strict rolled/installed declaration consumers,
both browser UMD entries and the focused catalog/authority tests passed for
this snapshot. Production browser acceptance records its own final source and
artifact identities separately; these measurements do not substitute for that
gate.

## Historical advertised-range failure and current repair

After `test:package` has produced accepted tarballs, from the repository root run:

```sh
nvm use
node packages/jentic-arazzo-ui/scripts/check-unpinned-consumer.mjs
```

This creates a separate fresh installed consumer without SpecLynx version
pins or product source aliases. It never changes the controlled consumer.
It deliberately removes only its own installed dependencies/lock before fresh
resolution: incrementally installing the parser first can produce a different
hoist that conceals the original failure. Each run preserves timestamped JSON
with exact copied tarball hashes, the full resolved lock, catalog coverage, and
caught browser exception/cause stacks.

Before the UI YAML range repair, the declared graph resolved the family to 5.2.6 but retains the UI's
exact generic YAML adapter 5.0.1 and its nested model/core. Its supplied Arazzo
object failed with:

```text
ParseError: Failed to parse Arazzo Document from "[object]"
  cause: UnmatchedParserError: Could not find a parser that can parse the file "memory://arazzo.json"
```

Debugger evidence preceding that unmatched parser shows
`Error: Incompatible language version 0. Compatibility range 13 through 15.`
at `web-tree-sitter`'s `Parser.setLanguage`, mapped to the JSON adapter's lexical
analysis line 24 and the nested Arazzo YAML adapter's lexical analysis line 25,
then parser detection/filter and the native parse call. The direct Node parser
with the same 5.2.6 family succeeds; the reproduced failure is in the fresh browser
bundle graph. The failed evidence is retained under
`test-output/package-consumer-unpinned/evidence-1791396382731.json`.

During diagnosis, two isolated counterfactual commands overrode **only** the generic YAML adapter
to 5.2.6, without changing source dependency declarations:

```sh
node packages/jentic-arazzo-ui/scripts/check-unpinned-consumer.mjs --align-yaml
node packages/jentic-arazzo-ui/scripts/check-unpinned-consumer.mjs --align-yaml --yaml-input
```

Both supplied-object and YAML-document inputs passed in those counterfactual
hosts. Current normal acceptance repeats both probes **without** the override
and passes with the repaired package declaration. The maintained scripts preserve
failed historical reports and timestamped current reports separately. The fresh
check fails on failed/unsupported projection; caught detection exceptions remain
recorded for diagnosis. This is a bounded packaged-browser compatibility check,
not a claim of validation, execution or arbitrary dependency-version support.
