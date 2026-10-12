# Engineering verification

Candidate: uncommitted implementation on `feature/arazzo-ui-reviewed`. No authored YAML examples were changed. No spec sync, archive, commit, push, or publication was performed.

Node: `.nvmrc`, 26.3.1 (selected with `source ~/.nvm/nvm.sh && nvm use`).

Verified commands from the repository root:

- `npm test --workspace @jentic/arazzo-ui`: 101 files, 661 tests passed. See `unit-tests.log`.
- `npm run typescript:check-types --workspace @jentic/arazzo-ui`: passed. See `typecheck.log`.
- `npm run lint --workspace @jentic/arazzo-ui`: zero errors, 52 existing warnings. See `lint.log`.
- `openspec validate improve-api-description-loading --strict`: valid.
- `git diff --check`: passed.

The sequential production gate rebuilds parser/resolver and the UI, generates public declarations, and verifies the packed package with installed ESM, UMD, CSS and advertised-range consumers. Both public entrypoint declarations accept manual and automatic policies, reject invalid policies, and retain callback/location contracts. Package adapters remain deferred in the minimal viewer. Build output reports the existing large-chunk warnings.

Focused coverage includes automatic/manual entry defaults and overrides; real four-description/six-operation digital-product projection; StrictMode and overlapping actions; settled failures and retry; AsyncAPI/profile/duplicate/unknown declaration eligibility; missing and unsupported bases; absent/rejecting authority; provider/document/revision replacement and unmount; malformed/unsupported bytes; shared dependency reload under both policies; explicit fresh loading of invalidated siblings; and the 32-document registry limit. Existing operation tests retain partial and duplicate candidate uncertainty.

Implementation review and its browser dependency coverage limit are recorded in `review.md`. Production walkthrough identities, captures, gate outcomes and negative controls are recorded separately after their runs finish. Human acceptance remains pending by explicit user instruction; automated evidence does not establish reader comprehension.

Final production result: 172/172 cases passed across both widths; all seven named negative controls passed their normal runs and detected their injected faults at both widths. See `production-browser.log`, `coverage.json`, `identity.json`, `negative-controls.log`, and `negative.json`. Final `verifyIdentity()` passed after both runs. Strict OpenSpec validation and `git diff --check` passed again. Temporary servers started by these runs exited; unrelated pre-existing listeners were preserved.

Final status: 17/18 tasks complete. Task 4.3 remains unchecked by explicit user instruction.
