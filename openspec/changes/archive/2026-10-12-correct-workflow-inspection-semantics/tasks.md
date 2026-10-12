## 1. Applicable parameter facts

- [x] 1.1 Add a focused fixture and failing tests for workflow parameter inheritance, name-and-location step override, a call mapping, querystring preservation, and unresolved/reusable provenance; verify the new assertions fail against the current viewer model.
- [x] 1.2 Add one provenance-preserving applicable-parameter projection beside authored step parameters in `viewerModel.ts`, with no inferred override for unresolved identities; verify the model tests from 1.1 pass.

## 2. Source-kind classification

- [x] 2.1 Add failing inspection cases for explicit channelPath-to-OpenAPI and operationPath-to-Arazzo mismatches, plus compatible unfetched sources and ambiguous locators; verify the mismatches currently receive `declared` status.
- [x] 2.2 Make `sourceBinding` assign existing `unsupported` status and a scoped diagnostic for incompatible explicit locator/source-kind pairs while retaining source and locator evidence; verify the table in 2.1 passes without changing Petstore single-source binding.

## 3. Consumer parity

- [x] 3.1 Use applicable parameter facts in selected sequence details, documentation, call relationship mappings, and flowchart parameter counts while keeping authored list presence distinct; verify focused cross-view tests show the same inherited and overridden values with provenance.
- [x] 3.2 Verify an incompatible source remains inspectable but is not shown as a supported declared sequence destination or operation in documentation, with a focused UI/documentation regression test.

## 4. Contribution checks

- [x] 4.1 Remove only the six archived verification-log EOF blank lines identified in the review; verify `git diff --check main` reports no whitespace errors from this change.
- [x] 4.2 Run the focused UI tests, UI type check, build, declaration consumer check, and strict OpenSpec validation; record the commands and results and verify the existing uncommitted reading work remains outside the implementation diff.
