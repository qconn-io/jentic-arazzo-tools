# Engineering verification — 2026-10-13

Candidate: HEAD plus the uncommitted implementation patch recorded in `candidate.json` and `implementation.patch`. `identity.json` records the freshly built assets, source/test/configuration inputs, packed consumer identity and candidate diff at build time. Task and evidence recording subsequently change the checkout diff; the implementation patch and build-input hashes identify the tested code independently.

Selected `.nvmrc` with `source ~/.nvm/nvm.sh && nvm use`: Node 26.3.1, npm 11.16.0.

| Command | Final outcome | Evidence |
| --- | --- | --- |
| `npm test --workspace=@jentic/arazzo-ui -- api-description-loading contract-panel` | 40 tests passed | `focused-tests.log` |
| `npm test --workspace=@jentic/arazzo-ui` | 671 tests, 101 files passed | `unit-tests.log` |
| `npm run typescript:check-types --workspace=@jentic/arazzo-ui` | Passed after generated declarations were restored by build | `typecheck.log` |
| `npm run lint --workspace=@jentic/arazzo-ui` | Passed: 0 errors, 52 existing warnings | `lint.log` |
| `npm run test:declarations --workspace=@jentic/arazzo-ui` | Both public entry-point checks passed | `declarations.log` |
| Fresh UI build and packed-consumer checks, invoked by `npm run test:browser --workspace=@jentic/arazzo-ui` | Build/API Extractor passed; installed ESM, UMD + CSS and advertised-range consumers passed | `production-browser.log` |

The production command rebuilds parser/resolver dependencies, all UI formats, declarations and the app, then verifies packed consumers before browser execution. Existing large-chunk warnings remain; no budget or contract checks were relaxed.

New explicit-feedback tests first failed because the live regions were absent, then passed after implementation. A first production attempt exposed an inspector font override (14px instead of shared 13px): the existing generic control selector had greater specificity because its `:is` includes an input attribute selector. Shared source selectors now include their actual button type, so the intended typography and other control rules also win inside the inspector. That known-failing run was interrupted and the final candidate rebuilt. A concurrent typecheck briefly saw absent generated declaration files during build cleaning; its final run was performed after declarations existed and passed.

`authored-yaml.json` verifies all 19 tracked public YAML files against HEAD with byte equality and SHA-256. The gate separately enforces the default Petstore baseline and inventoried input/build identities.

Screen-reader speech and unfamiliar-reader comprehension are outside these engineering results; see `human-results.md`. Browser and negative-control results are recorded separately in the handoff.
