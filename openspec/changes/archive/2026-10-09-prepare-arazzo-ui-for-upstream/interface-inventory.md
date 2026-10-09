# Interface and acquisition inventory

Inspected against `a0d0847` on 2026-10-07; this is the repair baseline,
not a claim that later submission prefixes already expose these interfaces.

## Public surfaces

| Surface | Entry and declarations | Existing contract / dependencies |
| --- | --- | --- |
| Headless ESM | `src/ArazzoUI.tsx`; `types/arazzo-ui.d.ts`; package `.` import | Controlled viewer, Docs/Diagram/Split; location/history callbacks, provider, profile, scenario inputs; re-exports catalog/review components and utilities |
| Headless UMD | `src/ArazzoUI.umd.ts`; package `.` require | Imperative mount/unmount/ref and forwarded config; current explicit config lacks provider/scenario fields available on ESM props |
| Standalone ESM | `src/ArazzoUIStandalone.tsx`; `types/arazzo-ui-standalone.d.ts`; `./standalone` import | Document loading/header; own default URL/history adapter and browser source provider; optional catalog/scenario context; headless viewer underneath |
| Standalone UMD | `src/ArazzoUIStandalone.umd.ts`; `./standalone` require | Imperative standalone mounting; provider/catalog/profile/location config; scenario props absent from explicit config type |
| Catalog | `src/ArazzoCatalog.tsx`, `utils/catalog/manifest.ts`; `./catalog` import | Typed ESM-only path currently maps to main ESM/declarations; scoped selection, coverage, source provider and normalized manifest; supplied documents or explicit catalog loading |
| Revision review | `src/ArazzoWorkflowReview.tsx`, `utils/review/index.ts`; both ESM entries | Supplied immutable snapshots, explicit matches, bounds, export/location callbacks; offline projection through catalog with rejecting provider |
| Styles | `./styles.css` → `dist/arazzo-ui.css` | Published stylesheet; declared CSS side effects |

Public type families are in `types/{arazzo,viewer,location,source,profile,scenario,catalog,review}.ts`.
Locations, profiles, scenarios, catalogs and review snapshots/results use version
`1`. `workflow`/`systems` is a perspective; Systems does not widen legacy
`ViewerMode` or `DiagramType`. Provider request/response types retain signal,
requested revision, retrieval URI and returned revision. Native snapshots,
viewer models, source registries, contract facts, effective actions and catalog
graphs remain private. Selected Arazzo 1.1 inspection establishes neither
schema validation nor execution.

The UMD config omissions are baseline inventory facts, not authorization to
widen interfaces. Section 8 must verify the maintained package contracts and
section 11 must inventory only interfaces actually available in each prefix.

## Acquisition callers

| Caller | Current authority and freshness | Required repair |
| --- | --- | --- |
| `ArazzoUI.tsx` document effect → `loading/loadDocument.ts` | `parseArazzo` acquires selected primary URL/content; effect guards obsolete publication | Primary retrieval remains supported; dependency loading must be disabled regardless of a configured provider |
| `ContractFactsContext.tsx` load action | Explicit `SourceRegistry.acquire`, revision from `SourceRevisionContext`, request/scope/provider and validity guards | Pass validity into Arazzo projection as done for other adapters |
| `contract/ArazzoAdapter.ts` | Parses supplied bytes, then calls loader; registry argument unused | Content-only native parsing and registry-governed secondary bridge; contextual optional-reference recovery |
| `contract/OpenAPIAdapter.ts`, `AsyncAPIAdapter.ts` → `references.ts` | Registry-backed projection, validity/dependency tracking, content-only YAML/JSON parsing | Retain authority; share pure structural classification with static impact |
| `catalog/load.ts` | One supplied-content/provider wrapper with per-source/aggregate/count/depth/concurrency/step budgets, revisions/digests and abort cancellation | Bridge Arazzo dependencies through this wrapper, propagate freshness, move format imports to use boundary |
| `review/inputs.ts` → catalog | Supplied revisions plus rejecting network provider; same-URI ambiguity handled by catalog wrapper | No native fallback may evade the wrapper; missing dependency contributes incomplete coverage |
| `source/SourceRegistry.ts` | Provider generations, entry epochs, cancellation, retrieval aliases, dependency invalidation, size/count/depth/concurrency | Preserve these semantics for Arazzo dependency requests |
| `source/BrowserFetchProvider.ts` | Explicit standalone source provider; HTTP(S), credentials omitted | No change to acquisition authority from disclosure alone |
| `scenario/useStandaloneScenarios.ts` | Explicit/restored guide URI fetch with abort signal | Keep guide loading separate from contract dependency acquisition |
| `components/StandaloneCatalog.tsx` | Explicit/restored catalog URI via configured provider | Retain existing catalog scope and errors |

The native parser/resolver packages default to independent memory/file/HTTP
transports. The loader currently passes a base but does not replace these
transports or seed an explicit supplied root reference set.

## Maintained gates and output paths

- `scripts/check-public-declarations.mjs` compiles rolled declarations by direct
  file paths, with public families and private-export negatives. It is not an
  installed package consumer. `scripts/check-catalog-export.mjs` is a separate
  manual export check.
- Package `test:declarations` exists; packed-package and production-browser
  maintained commands do not yet exist.
- `.github/workflows/build.yml` runs root lint/types/tests, monorepo ES builds
  and standalone app build. No consumer or production-browser gate runs there.
- `playwright.config.ts` reuses a development server (`reuseExistingServer: true`).
- Reusable specs `test/e2e/{systems,scenarios,catalog,review}.spec.ts` write into
  `openspec/changes/{add-system-interaction-view,add-authored-scenario-explorer,add-workflow-capability-catalog,compare-workflow-revisions}/browser-evidence`.
  These changes are now archived; rerunning recreates misleading active paths.
  Section 9 must redirect routine evidence to ignored output/CI artifacts.
- `test/e2e/review-app.tsx` and other test apps are browser consumers, not proof
  that installed package exports resolve. Sequential current-artifact build and
  isolated UTF-8 serving remain required.
