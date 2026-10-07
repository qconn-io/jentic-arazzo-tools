# Verification Report: inspect-api-contracts

Verified 2026-10-06 against the current working tree, including the three-warning repair plan and its review corrections. Schema: `spec-driven`, repo-local planning home. Earlier reproductions are retained below as resolved history.

## Summary

| Dimension    | Status                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness | 11/11 tasks checked; implementations found for all 6 requirements                                                                     |
| Correctness  | All 10 named scenarios have implementation/test evidence; three warning groups now have permanent passing regressions                 |
| Coherence    | Provider/registry/adapters/inspector separation follows the design; reload invalidates relevant dependencies and affected projections |

## CRITICAL

None.

## WARNING

None unresolved within the declared inspection profiles.

## SUGGESTION

None added. Existing packaging/schema-navigation limitations remain documented.

## Resolved warning history

### W1: Schema reference expansion overwrote constraints — resolved

The earlier object-spread projection removed a base schema's `required: [id]` and `properties.id` when a referring schema supplied sibling `required: [name]` and `properties.name`.

Schema declarations now remain authored, including `$ref`, conflicting siblings and nested constraints. Each operation separately exposes referenced schema declarations with actual occurrence location, declaring URI, target URI/pointer, retrieved revision, resolution status and diagnostics. Boolean targets remain booleans. Schema traversal excludes examples, defaults, enums and extension payloads, handles supported schema containers, and terminates on recursive links. Unsupported schema dialects/formats and resource identities/anchors retain authored content with targeted explanations. Ancestor schema context is checked when a reference jumps directly into a nested schema, preventing guessed acquisition bases. Ordinary Reference Objects use separate profile rules.

Evidence: `test/utils/contract/SchemaReferences.test.ts`, updated `InspectionContracts.test.ts`, and the Chromium scenario "inspector keeps schema siblings and referenced constraints in separate accessible declarations". Referenced AsyncAPI operations and external OpenAPI Path Items have explicit occurrence-provenance regressions.

The design remains grounded in [OpenAPI Schema Object semantics](https://spec.openapis.org/oas/v3.1.0.html#schema-object) and [JSON Schema direct references](https://json-schema.org/draft/2020-12/json-schema-core#section-8.2.3.1); inspection does not flatten or validate schemas.

### W2: Reload left external reference content stale — resolved

Previously, refreshing a root at revision `2` left its externally referenced response at revision `1`.

The registry records dependency attempts, including failures, and reload invalidates the root's transitive dependencies plus reverse-dependent roots. Unrelated acquired sources remain available. Validity tokens guard projections before acquisition, after asynchronous work, and before publication; the inspector immediately excludes invalidated facts and offers explicit loading again. Invalidated requests are aborted while providers that ignore cancellation keep their physical concurrency slots until settling.

Redirect aliases refer only to current acquired content and are removed on invalidation. Pinned and unpinned acquisitions remain separate. The inspector passes its captured acquisition token to private adapters so returned revision provenance cannot select another entry's lifecycle.

Evidence: `test/utils/contract/ReferenceReload.test.ts`, existing registry cancellation/concurrency tests, the shared-dependency component regression in `test/contract-panel.test.tsx`, and the Chromium scenario "Reload source refreshes external schema and response dependencies". These cover transitive redirects, shared parents, failed-reference retry, obsolete projection results, independent pinned revisions, unpinned acquisition and redirect destination changes.

### W3: Equivalent percent-encoded operation pointers reported missing — resolved

Previously, `#/paths/~1a/get` located an operation while `#/paths/%7E1a/get` reported `missing`.

A parser-independent pointer utility now serves lookup and reference traversal. It compares fragment-free document identities, percent-decodes the complete fragment once, splits tokens, and decodes pointer escapes. Pointer generation encodes authored names without double decoding. Traversal uses own properties and strict array indices. Malformed locators have inspectable unsupported diagnostics; malformed event channel references remain authored without aborting other operation facts.

Evidence: `test/utils/contract/Pointer.test.ts` and `PointerLookup.test.ts`, including encoded OpenAPI operationPath and AsyncAPI channelPath, Unicode, spaces, literal percent sequences, slash/tilde names, malformed encoding/escapes, document isolation and duplicate ambiguity. Encoding behavior follows [RFC 6901 section 6](https://www.rfc-editor.org/rfc/rfc6901.html#section-6).

## Requirement and scenario evidence

| Requirement                           | Implementation                                                    | Scenario evidence                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Explicit source acquisition           | Source registry, browser provider, contract panel, primary loader | Relative sibling/failure/no-provider tests and HTTP loading browser scenarios                                 |
| Scoped operation resolution           | OpenAPI/AsyncAPI adapters and operation status resolver           | HTTP lookup, partial coverage, duplicate IDs and pointer normalization tests                                  |
| Readable contract details             | Contract panel and selection details                              | HTTP/event browser evidence plus separately displayed authored schema and target constraints                  |
| Reference and profile limitations     | Shared reference projector and dialect adapters                   | Recursive/unsupported profiles, literal data, boolean targets, ancestor context and finite external-hop tests |
| Supplied external workflow navigation | Arazzo adapter, contract panel and standalone navigation          | Commerce navigation, host callbacks, separate identity and authored snapshot tests                            |
| Bounded and current source state      | Registry, viewer-local hook and panel validity guards             | Cancellation/budget/provider replacement tests plus dependency refresh and stale-fact removal regressions     |

Implementation paths are under `packages/jentic-arazzo-ui/src`; test paths are relative to that package.

## Verification run

Used the current `.nvmrc`: Node 26.3.1, npm 11.16.0.

- Full UI suite: 53 files, 376 tests passed (31 additional tests versus the earlier verification).
- Chromium acceptance: all 11 scenarios passed (two additional browser regressions).
- TypeScript check: passed.
- Full production build, including declarations, UMD, ESM and static app: passed.
- Both public declaration consumers: passed; private inspection records/tokens do not enter exported APIs.
- Lint: 0 errors, 40 existing warnings.
- OpenSpec strict validation and whitespace diff check: passed.
- Independent review identified five additional edge cases within these repairs; each has a regression observed failing before correction and passing afterward. The full suite and browser acceptance were rerun after corrections.

Commands:

```sh
nvm use
npm run test --workspace=@jentic/arazzo-ui
npm run typescript:check-types --workspace=@jentic/arazzo-ui
npm run build --workspace=@jentic/arazzo-ui
npm run test:declarations --workspace=@jentic/arazzo-ui
npm run lint --workspace=@jentic/arazzo-ui
npx playwright test --config packages/jentic-arazzo-ui/playwright.config.ts
openspec validate inspect-api-contracts --strict
git diff --check
```

No artifact dimensions were skipped. Historical baseline asset measurements in `review.md` were not repeated. Current production builds and Chromium acceptance were rerun; separate built-UMD visual inspection was not repeated. UMD still includes adapter bytes in its initial asset, while ESM uses dynamic chunks. Schemas use collapsible authored declarations and reference targets rather than a dedicated schema-tree navigator. Hosts should bound their network response reading; the registry checks size after acquisition.

## Final assessment

All checks passed for the declared inspection profiles. The three warning groups are resolved. Ready for archive; no commit, push or archive was performed.
