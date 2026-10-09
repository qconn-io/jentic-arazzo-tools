## 1. Pin authored binding regressions

- [ ] 1.1 Add test/petstore-source-binding.test.ts using the real public/petstore-order-workflow.arazzo.yaml and production loading/model seams; verify before repair that the five operations incorrectly create unknown destinations, preserve sample SHA-256 8bd096d24c2cabd7536dc2feb9cb8b9157ffebbadf931bcc26230de4b1989569, and assert desired one-workflow/one-petstoreAPI participant behavior without secondary acquisition.
- [ ] 1.2 Extend test/inspection.test.ts with versioned bare-ID cases: supported single OpenAPI in 1.0 and 1.1, supported single AsyncAPI in selected 1.1, unsupported async in 1.0, unknown kinds, multiple sources, conflicting locators, malformed qualification, missing/duplicate source names and an unrelated Arazzo source; verify eligibility and exact locator preservation without first-source fallback.
- [ ] 1.3 Repair src/utils/inspection/facts.ts and private binding provenance/types using the supported single-source rule; verify 1.1-specific metadata remains unsupported under 1.0, the original caller input is unchanged, and tasks 1.1-1.2 pass.

## 2. Share lookup evidence and sequence presentation

- [ ] 2.1 Add private src/utils/contract/stepOperation.ts with resolveStepOperation(model, step, loaded) returning existing lookup status plus authored source-name identity/provenance, and migrate ContractPanel and utils/systems/contracts.ts to it; verify focused resolver/contract-panel/system-contract tests cover qualified pointers, bare IDs, duplicate URI aliases, revision identity and complete/partial/failed/unsupported candidate coverage without I/O.
- [ ] 2.2 Add optional private destination evidence to src/utils/sequence/sequenceModel.ts and consume current contract facts in SequenceView; verify a uniquely found operation with complete coverage updates its destination while partial/duplicate matches remain uncertain, declared source identity survives missing operation lookup, and an invalid unqualified multi-source locator keeps its diagnostic.
- [ ] 2.3 Extend test/sequence-ui.test.tsx and test/contract-panel.test.tsx to load all candidates explicitly and compare inspector/sequence source identity; verify no loading happens on plain viewing, selected repeated rows keep their IDs/call paths, and expansion/focus do not reset when endpoints update.
- [ ] 2.4 Align authored-only Mermaid/documentation/card projections with the repaired binding through the existing shared model; verify test/connected-mermaid.test.ts, test/documentation.test.ts and Petstore static checks contain the same known source and do not fabricate responses or assert live lookup evidence.

## 3. Preserve current evidence and ownership

- [ ] 3.1 Add test/sequence-source-freshness.test.tsx covering dependency reload, same-URI revision replacement, provider replacement, late completion and operation disappearance/duplication; update current projection filtering if needed and verify obsolete evidence disappears when invalidated rather than after the next response.
- [ ] 3.2 Run existing test/loading-authority.test.ts, test/system-actor-authority.test.ts and contract/source cancellation suites with the new destination projection; verify denied acquisition has no fallback and business actors/source owners are never inferred from a known API binding.
- [ ] 3.3 Run the focused UI tests using .nvmrc and the workspace test script with file arguments, then npm run typescript:check-types -w @jentic/arazzo-ui and declaration consumers after the normal UI build; verify zero failures and no new private public exports.

## 4. Record slice verification

- [ ] 4.1 Record corrected binding/freshness/static-versus-live evidence and exact sample digest in this change's verification.md; verify every delta scenario maps to a passing test or explicitly identified pending final-browser check, and leave final UX acceptance to gate-workflow-ux-regressions.
