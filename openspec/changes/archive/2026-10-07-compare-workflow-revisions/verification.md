# Implementation and acceptance: compare-workflow-revisions

Verified 2026-10-07 against this working-tree implementation, schema `spec-driven`.

The optional ESM `ArazzoWorkflowReview` component and pure `compareWorkflowRevisions` /
`exportWorkflowReview` APIs compare identified supplied snapshots. Snapshot capture,
validation/projection, authored difference matching, classified static impact, presentation
and deterministic exports have separate modules. Each inspector uses its own revision's
contents and provider; absent historical contracts never acquire mutable current sources.
Authored differences and potential exposure leave runtime effect undetermined.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| UI suite | 472 tests pass in 73 files | [Log](verification-logs/suite.log) |
| UI TypeScript | Pass | [Log](verification-logs/types.log) |
| Production UMD/ESM/app builds and rolled declarations | Pass | [Log](verification-logs/build.log) |
| Both downstream declaration consumers, including review APIs | Pass | [Log](verification-logs/consumer.log) |
| Production downstream ESM browser bundle | Pass | [Log](verification-logs/browser-build.log) |
| Changed TypeScript/TSX lint | No errors or warnings | [Log](verification-logs/lint.log) |
| Package lint | Three existing errors and 52 warnings | [Log](verification-logs/lint-full.log) |
| OpenSpec strict validation | Pass | [Record](verification-logs/openspec.json) |
| Production Chromium walkthroughs | Four pass at 1440 and 480 px | [Log](verification-logs/browser.log), [Observations](browser-evidence/observations.json) |
| Source/bundle evidence consistency | Recorded consumer and all source hashes match final files | [Observations](browser-evidence/observations.json) |
| Whitespace diff check | Pass | `git diff --check` |

The package lint errors are unchanged `no-explicit-any` violations in
`test/scenario-standalone.test.tsx` lines 101/106 and `test/scenario-ui.test.tsx` line 101.
No new lint error or warning is accepted. Existing build warnings about contract adapters
being both static and dynamic imports remain. Node 26.3.1 / npm 11.16.0 follows `.nvmrc`.

## Task evidence

1. **Foundations:** read the archived catalog, contract-inspection and readable/location
   acceptance artifacts and current scoped interfaces. Eight focused existing index and
   revision-isolation tests pass ([log](verification-logs/foundations.log)).
2. **Public contracts/identity:** both declaration consumers compile snapshot, match,
   evidence, finding, impact and export contracts and runtime APIs. `review-inputs.test.ts`
   covers missing/distinct/incompatible revisions, duplicate workflow/step identities,
   explicit-match collisions, digest verification and normalized absolute source identities.
3. **Isolated inputs:** input tests verify synchronous capture before caller mutation,
   unavailable historical contracts, rejecting source acquisition and raw unsupported profiles.
   Unsupported schema-profile diagnostics also enter portable coverage rather than implying
   complete inspection. Supplied digest pins survive absent historical bytes.
4. **Authored matching/differences:** `review-differences.test.ts` covers whitespace/key
   equivalence, falsy/absent payloads, criteria, locators, timeout/retry/action/step order,
   scoped renames and validated explicit matches. Extensions remain authored metadata.
5. **Declarations/effects:** schema and response differences retain before/after paths.
   Shared inherited action declarations count once with separate effective-use provenance.
   Located operation users include external schemas, shared responses, referenced Path Items,
   inherited parameters and effective security/server declarations; overrides exclude
   shadowed inherited declarations and parameter schemas.
6. **Impact:** the same tests cover classified calls/prerequisites/retries/descriptive
   associations, independent revision identities, finite inspectable cycles, path/relationship
   bounds and visible truncation. Step restrictions apply to direct users and traversal.
7. **Readers:** `review-ui.test.tsx` verifies category filters, removed baseline content,
   revision-owned destinations, obsolete-input suppression and unchanged host history.
   Its actual viewer/source-inspector test opens old mappings with old declarations and
   candidate mappings with candidate declarations. Async acquisition waits use the same
   five-second bound as existing catalog integration tests to tolerate suite contention.
8. **Exports:** deterministic JSON/Markdown comparisons, missing historical coverage,
   supplied digest pins and exclusion of private session/provider state are tested.
   Browser downloads verify the partial export identities, failed coverage and undetermined
   runtime effect. Markdown retains complete portable machine-readable data as well as prose.
9. **Synthetic inputs:** `review-samples.test.ts` checks purchase recovery/criteria/schema/
   mapping edits, removed revoke-license compensation, cycles, event payload declaration
   drift, missing baseline contracts and zero findings for formatting-only revisions.
10. **Browser acceptance:** the four walkthroughs open removed before content and exact
    changed before/after locations, load only their pinned source declarations, inspect
    event declaration users/potential entries and export a partial review at both widths.
    No business request or page error occurred in purchase/partial runs. Four screenshots
    were visually checked across the two widths; panes, wrapping and modal/region inspector
    behavior were verified. Coverage rows coalesce identical display records while exports
    retain all scoped coverage records.
11. **Documentation/build:** the UI README covers supplying/pinning snapshots, matching,
    traversal limits, isolated readers, exports and reviewer judgment. Full suite, types,
    both declaration consumers and production builds pass after repairs.

## Independent review and repairs

A separate reviewer reproduced three concrete impact defects: missed external schema users,
missed inherited/referenced contract declarations (plus incorrect root-override users), and
step-specific exposure broadening to unrelated target steps. All are repaired and covered by
focused regressions. The review's digest-pin concern is also repaired. Additional focused
probes cover referenced Path Items, shadowed parameter schemas and unsupported schema
profiles. No independent-review finding remains deferred.

## Evidence scope and limits

These are automated authored-inspection walkthroughs and visual checks, not human-comprehension
research, business execution or compatibility proof. The review is scoped to supplied catalog
relationships and supported inspection facts, with raw authored differences retained where
semantic profiles are unavailable. Unknown/unloaded coverage and bounded reference/traversal
work remain visible. No Git integration, approval state, execution replay or rename inference
is introduced. The optional React review component does not change the normal standalone
viewer defaults; the acceptance harness bundles the built ESM export as a downstream consumer.

Browser observations include all current source hashes, snapshot hashes, the ESM entry hash,
consumer JS/CSS hashes and task observations. Final hashes were compared with current files.

## Reproduce

From the repository root:

```bash
source /home/mkogan/.nvm/nvm.sh
nvm use
npm test --workspace=@jentic/arazzo-ui
npm run typescript:check-types --workspace=@jentic/arazzo-ui
npm run build --workspace=@jentic/arazzo-ui
npm run test:declarations --workspace=@jentic/arazzo-ui
node packages/jentic-arazzo-ui/scripts/build-review-browser.mjs
openspec validate compare-workflow-revisions --strict --json
```

Serve `packages/jentic-arazzo-ui/build` at port 3000, then from the UI package run
`npx playwright test test/e2e/review.spec.ts`. Rebuild the consumer after changing the ESM
implementation. The development-server root does not provide this production harness.
