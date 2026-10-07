# Systems prerequisite check — 2026-10-06

Initial checkpoint: paused at task 1.1; 0/12 tasks complete. No product code had changed at that checkpoint.

The user approved the proposed extension. The contract identity repair and shared projection store are now implemented; the task plan has 14 tasks. See `verification.md` for final evidence. The reproduction below records the original prerequisite gap.

## Available prerequisites

- `improve-workflow-reading` has archived verification and browser evidence. It provides shared readable inspection and retained authored facts. Its automated acceptance passed; human comprehension sessions were explicitly not conducted.
- `add-workflow-deep-links` has archived verification and browser evidence. It provides document-scoped locations and standard call-occurrence restoration.
- `inspect-api-contracts` has archived verification/review with all tasks checked and no unresolved warnings within its declared inspection profiles. Its follow-up implementation is present in the uncommitted working tree.
- Current focused baseline: 24 tests passed in three files (`location-codec`, `InspectionContracts`, `AsyncAPIAdapter`). The supplied `location-resolver` filter matched no additional file. This is a focused check, not a new full-suite acceptance run.

## Blocking projection gap

Task 1.4 and the event specification require association validation against contract channel/message identity, including changed references to distinct messages. Current `ContractOperation.messages` contains projected declaration values without resolved message identity or reference provenance. `channelPointer` retains a reference but does not establish its final resolved declaration identity. Schema reference provenance does not supply general message/channel declaration provenance.

The retained probe changes one operation's message reference from `#/channels/ready/messages/original` to `#/channels/ready/messages/replacement`. Both separate message declarations deliberately have identical names and payloads. The raw documents differ, but `ContractDocumentFacts.operations.get('publish')` is identical. The probe fails on the expectation that the facts distinguish these declarations. Thus comparing names or projected values cannot meet the Systems identity requirement. This is an integration prerequisite gap, not a claim that the archived inspection feature promised event association validation.

The original raw contracts remain available. Recovering identity by traversing them inside the scene would duplicate reference projection and weaken the pure scene boundary, especially for external/chained references and reload provenance.

## Proposed artifact update

Extend this change's design and tasks to include:

1. Contract declaration identity facts for channels and messages: declaring/retrieved document, actual resolved pointer, revision when available, authored reference/use occurrence, and unresolved/unsupported status. Reuse the existing bounded reference projector. Preserve exact declarations and existing inspector behavior.
2. Viewer-local access to loaded contract projections for both the inspector and Systems. Today projections are held in `ContractPanel` component state; acquired content is in the shared registry. Preserve explicit loading, scope/generation invalidation, reload behavior and no implicit source acquisition.
3. Regression acceptance for distinct identical-content messages, aliases/chained/external references, missing/stale references, and reload invalidation before profile/scene acceptance.

Keep standard diagram semantics and public legacy mode unions unchanged. Do not infer event links from names/content or narrow the required event behavior. The user approved this expansion before prerequisite modules and planning artifacts were revised.

## Probe reproduction

The probe is deliberately outside the package's normal test glob, so it does not leave the suite failing. To reproduce from the repository root, copy it temporarily into the UI test directory, adjusting its two imports to `../src/...`, run the single file with the package Vitest command, then remove the temporary file. The recorded run used Node 26.3.1/npm 11.16.0 selected by `.nvmrc`.

Probe result: one expected assertion failure, “Compared values have no visual difference.” Temporary package probe was removed after the run. Existing user changes were preserved; no commit, push, archive, or task-checkbox changes were made.
