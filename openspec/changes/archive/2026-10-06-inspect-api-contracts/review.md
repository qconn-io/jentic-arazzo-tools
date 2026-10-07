# inspect-api-contracts implementation and review

Reviewed 2026-10-06 against the proposal, design, specification and all 11 tasks. Baseline: `856c84c12ebfa8606c1a451a797c6a9d4309dee5`; original implementation: `503c2145523575b9f5f063db3366a643ba2e7a52`. The review includes the follow-up working tree.

## Three-warning repair follow-up

The subsequent verification found three concrete gaps in the earlier all-clear assessment: schema-reference sibling merging, stale external dependencies on reload, and equivalent percent-encoded operation pointers. All three are now repaired in the working tree; see [verification.md](verification.md) for resolved reproductions and current evidence.

- Authored schemas remain intact; separately displayed reference targets retain source/revision and actual occurrence provenance. Recursive and unsupported schema contexts remain finite and explained.
- Reload refreshes the selected source's dependency closure and invalidates affected parent projections while retaining unrelated sources. Validity tokens suppress obsolete work and stale UI facts. Pinned/unpinned acquisition and redirect alias regressions are covered.
- One parser-independent JSON Pointer utility normalizes lookup and traversal, safely diagnoses invalid encodings, and preserves document identity.

Independent review found five additional edge cases in the repair: enclosing schema identities/dialects, pinned versus unpinned cache aliases, obsolete redirects, referenced-operation occurrence paths, and malformed AsyncAPI channel pointers. Each was reproduced with a failing regression, corrected, and verified with the full suite.

Current checks: 53 UI test files / 376 tests, 11 Chromium scenarios, TypeScript, production build and both declaration consumers pass. Lint has zero errors and the same 40 warnings. OpenSpec strict validation and whitespace checks pass. Node 26.3.1 / npm 11.16.0 follows the current `.nvmrc`. Original asset measurements below remain historical; this follow-up does not repeat the baseline measurement or separate built-UMD visual inspection. Public provider/navigation APIs remain unchanged.

## Decision

**Keep the architecture and repair the implementation.** Acquisition, bounded registry, contract projection and inspector are appropriate separate modules. The original completion claim was premature: acquisition lifecycle, exact contract projection, public integration and acceptance evidence had concrete gaps. Replacing the whole feature would discard useful boundaries and tests. The repair substantially rewrites the adapters/reference handling and registry internals, while preserving their role and the existing viewer model.

## Standards

Four finding groups were repaired:

1. Duplicate pointer walkers disagreed on URI decoding, chained references and external operation/channel provenance. One shared finite reference resolver now handles these cases, including retrieval redirects.
2. Standalone navigation bypassed the source lifecycle and lost identity/revision. It now uses bounded acquisition, cancellation/generation guards, revision checks and source transitions that reset external base/root metadata. Failures remain visible.
3. The new YAML dependency installed a second ApiDOM class family, causing parser results to fail existing identity checks. The direct adapter dependency is aligned with the repository's ApiDOM 5.0.1 family, with the duplicate lock resolutions removed.
4. The committed helper scripts, source backup and generated browser artifact were removed in the follow-up working tree; browser outputs are ignored. Feature formatting, import order and unused-variable errors were corrected. README claims now match referenced-workflow navigation.

No unresolved blocking standards findings. Lint passes with zero errors and 40 warnings, chiefly existing explicit-any usage; three warnings remain in the feature's registry tests and one in the browser provider.

## Spec

Seven requirement groups were repaired and verified:

1. Embedded viewing retains no-source-fetch behavior. Only explicit source loading invokes acquisition. Inline uploads without a supplied base do not inherit the viewer page or a prior external document's base.
2. Registry entries deduplicate acquisition, enforce concurrency/document/size/eight-hop budgets, reject missing or mismatched pinned revisions, react to scope changes and prevent cancelled/reloaded results from overwriting current facts. Providers that ignore cancellation retain their physical concurrency slot until settling. Unmeasurable/cyclic host content is rejected.
3. OpenAPI inspection preserves path/operation parameter precedence, request media/schema declarations, response alternatives, server inheritance and effective security. Parsing acquired content cannot fall back to network acquisition.
4. AsyncAPI inspection preserves send/receive, channel/address, messages, headers/payloads and correlation declarations. Encoded/chained/external operation references retain channel identity. Unsupported schema formats retain authored content with targeted diagnostics.
5. Operation lookup supports IDs and pointers, preserves duplicate IDs without index-key collisions, and cannot claim uniqueness with incomplete, failed or unsupported candidate coverage. Unsupported/recursive references remain finite and diagnosed; unsupported schema dialects are checked before reference expansion.
6. Supplied Arazzo models retain separate URI/revision identity. External navigation requests carry retrieved provenance; explicit standalone navigation opens the external root. External call classification and the primary authored snapshot remain intact.
7. The inspector exposes raw sources, profile/version, retrieval/revision identity, contextual diagnostics and declarations beside workflow evidence. Document inspection status reacts to acquisition. Static source cards explicitly describe authored declarations. Responses/messages are alternatives, not observed outcomes.

No unresolved blocking spec findings within the declared inspection profiles. Inspection is a projection, not comprehensive specification validation or execution support.

Reference checks used the official [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0.html), [AsyncAPI 3](https://www.asyncapi.com/docs/reference/specification/v3.0.0), and [Arazzo 1.1](https://spec.openapis.org/arazzo/v1.1.0.html) specifications.

## Original repair verification

The final UI suite, types, production build, declaration consumers and lint were rerun with the repository-declared Node 24.10.0 and npm 11.6.1 toolchain.

- Full UI suite: 49 files, 345 tests passed.
- Chromium acceptance: nine scenarios covering small HTTP, stress event, unavailable-target candidate coverage, source failure/reload, external workflow inspection/navigation, host callbacks, provider replacement, document replacement and embedded no-provider behavior.
- Built standalone UMD: HTTP and event inspection passed with no browser errors; rendered HTTP inspector screenshot inspected.
- UI TypeScript, production build and both public declaration consumers passed.
- UI lint: zero errors, 40 warnings.
- OpenSpec strict validation and whitespace diff check passed.

Commands: `npm run test --workspace=@jentic/arazzo-ui`, `npm run typescript:check-types --workspace=@jentic/arazzo-ui`, `npm run build --workspace=@jentic/arazzo-ui`, `npm run test:declarations --workspace=@jentic/arazzo-ui`, `npm run lint --workspace=@jentic/arazzo-ui`, `npx playwright test --config packages/jentic-arazzo-ui/playwright.config.ts`, `openspec validate inspect-api-contracts --strict`, `git diff --check`.

## Original repair asset impact

Compared with the baseline commit built in an isolated temporary source tree using the same installed dependencies and Vite configuration. Bytes below cover local JavaScript; gzip uses Python's default compression. ESM totals include the entry and its static local import graph, exclude optional dynamic adapter chunks and external dependencies, and must not be confused with entry-file size alone. CSS size is unchanged.

| Initial JavaScript          | Before bytes | After bytes | Added bytes | Added gzip bytes |
| --------------------------- | -----------: | ----------: | ----------: | ---------------: |
| Embedded UMD                |    7,788,771 |   7,958,982 |     170,211 |           29,932 |
| Standalone UMD              |    7,803,811 |   7,976,417 |     172,606 |           31,065 |
| Embedded ESM static graph   |      267,026 |     288,526 |      21,500 |            6,982 |
| Standalone ESM static graph |      286,864 |     312,476 |      25,612 |            7,704 |

ESM adapters are separate dynamic chunks. The existing self-contained UMD distribution includes their bytes in its initial asset even though projection runs only after explicit loading. Splitting that distribution would be separate packaging work. Contract schemas currently use collapsible JSON declarations and retained reference text rather than a dedicated schema-tree navigator. Hosts should also bound network response reading; the registry checks content size after acquisition.

No commit, push or archive was performed.
