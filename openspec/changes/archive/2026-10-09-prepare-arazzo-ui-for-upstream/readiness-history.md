# Historical implementation notes

The statuses below are chronological evidence from earlier stages, not current
readiness. See readiness.md and engineering-validation.md for final results.

# Upstream preparation record

## Baseline and scope

Recorded on 2026-10-07. Implementation HEAD and pinned review HEAD are both
`a0d08472050d44f2079232f1535c9a6ac326af57`; no implementation drift at start.
`git ls-remote upstream HEAD refs/heads/main` verified upstream
`49dd8ef814637b481c0a1998f586ce2785812f5d`, also the local merge base.

- Source branch: `feature/visualize-chained-workflows`, tracking
  `origin/feature/visualize-chained-workflows`, eight commits ahead at start.
- Fork fetch/push: `https://github.com/qconn-io/jentic-arazzo-tools.git`.
- Upstream fetch/push: `https://github.com/jentic/jentic-arazzo-tools.git`.
- Initial working tree: only this untracked OpenSpec change directory.
- Repairs are scoped to this repository and this change's tracking/evidence.
  The original branch history and archived evidence must remain recoverable.
  Local S1–S8 submission refs/worktrees will be prepared from the verified base
  in section 11; their identities will be recorded before curation.
- No push, publication, merge, deployment, history rewrite, archive or spec sync
  is authorized by this preparation workflow.
- `git show -s --format='%H%n%B' 73799de 503c214` confirmed both original
  commits lack DCO signoffs. Signed replacement submission commits are pending.

## Coverage map

Requirement names refer to the two delta specifications in this change.
Statuses below distinguish requested work from current evidence.

| Item | Specification requirement | Tasks | Initial state |
| --- | --- | --- | --- |
| R1 DCO | Focused signed contribution series | 11.1–11.6 | Missing original trailers confirmed; replacements pending |
| R2 acquisition bypass | Secondary acquisition obeys explicit authority; Dependency acquisition retains bounds and freshness; Pinned revision inspection uses supplied bytes | 1.2, 1.4, 2.1–2.6, 9.3 | Regression and repair pending |
| R3 manual gates | Maintained package acceptance gates; Reproducible production-browser acceptance | 1.4, 8.2, 9.1–9.4, 10.1–10.3 | Maintained gates pending |
| R4 combined scope/evidence | Focused signed contribution series; Compact evidence preserves provenance | 11.1–11.8 | Submission curation pending |
| R5 inferred actors | System actors require owning-scope bindings | 1.2, 3.1–3.3, 9.3 | Regression and repair pending |
| R6 literal references | Contract impact distinguishes references from literal data | 1.2, 4.1–4.4 | Regression and repair pending |
| R7 default uses/false roots | Shared default actions retain effective users; Impact roots require justified usage or explicit scope | 1.2, 5.1–5.4 | Regression and repair pending |
| R8 operation entry paths | Operation consumers include classified entry paths | 1.3, 6.1–6.3, 9.3 | Regression and repair pending |
| R9 lint | Maintained package acceptance gates | 8.1, 10.1 | Fresh lint gate pending |
| A1 cost/laziness | Measured optional package cost | 8.3–8.4 | Comparable consumers pending |
| A2 controls | Optional tools use progressive disclosure; Consistent accessible controls | 7.1–7.3, 9.3 | Presentation and operability pending |
| A3 comprehension | Human comprehension evidence is honest | 12.1–12.2 | Unfamiliar Owner/Developer sessions pending |
| A4 agreement | Upstream agreement remains an external decision | 11.7, 12.3 | Maintainer feedback pending |
| A5 support claims | Existing inspection and embedding contracts remain coherent; Compact evidence preserves provenance | 7.3, 10.2–10.3, 11.7, 12.4 | Current labels and handoff audit pending |

## Independent readiness states

- Engineering verification: pending. Archived passes and review measurements
  are historical evidence, not current results.
- Submission preparation: pending. No local submission range exists yet.
- External validation: pending. No reader sessions or maintainer decisions have
  been supplied. Automated tests cannot complete these states.

## Execution notes

### Initial regressions (task 1.2)

After `nvm use` (Node 26.3.1 / npm 11.16.0),
`npm run test --workspace=@jentic/arazzo-ui -- test/upstream-readiness.test.ts`
ran four tests: four expected assertion failures against the unchanged baseline.

| Regression | Observed baseline failure | Durable fixture/test |
| --- | --- | --- |
| Provider denial | Two alternate HTTP requests; expected zero | `upstream-readiness.test.ts`, ephemeral loopback server with teardown |
| Unbound repeated helper | Both actors `client`; expected `unknown:actor:helper` with separate call paths | `consumerWorkflow`, `entryActorProfile` |
| Literal example | One direct API consumer; expected none | `paymentContract`, literal `Example.value.$ref` |
| Workflow default | No baseline effects; expected `capture` | `defaultActionReview`, valid `failureActions` reusable reference |

Fixtures live in `packages/jentic-arazzo-ui/test/fixtures/upstream-readiness.ts`.
The tests have no `/tmp` script/data dependency. Temporary command logs are
not required to rerun them. The failure-action fixture uses the authored
workflow `failureActions` field, not step-only `onFailure` at workflow scope.

### Operation-panel baseline (task 1.3)

`consumerCatalog` includes complete, partial and cyclic variants with exact
document/revision identities, one helper operation use, first-item/second-item
entry calls and an unrelated entry. The current graph already retains the two
call paths through `catalogReachability`. `ArazzoCatalog.tsx`'s
`Operation consumers` section renders only direct uses and the declaration;
its entry-path UI depends on a separately selected workflow. Task 6 must expose
the two paths within the selected operation panel itself.

`npm run test --workspace=@jentic/arazzo-ui -- test/upstream-consumers.test.ts`
passed 3/3 tests (complete identities/repeated locations, partial scope, cycles).

### Delivered inventory (task 1.4)

See [interface-inventory.md](interface-inventory.md) for public entries/types,
versioned sidecars, each primary/secondary/catalog/review acquisition caller,
freshness/budget boundaries and every reusable active-change browser output.

### Acquisition boundary (tasks 2.1–2.2)

The private loader now separates ordinary primary loading from an explicitly
supplied secondary registry. Supplied content uses object-only parsing; native
resolution has a supplied-root resolver and no default file/HTTP transport.
Unavailable external schema references retain authored bytes and contextual
diagnostics; supported local fatal schema errors retain their existing contract.

- Primary URL regression went from two HTTP requests to only `/flow.json`.
- Rejecting-provider regression went from two alternate HTTP hits to zero,
  with exactly the dependency URI requested from the configured provider.
- Focused authority/adapter/local-resolution checks: 6 passed, 19 deliberately
  excluded by the focused filter. Full loader tests: 17 passed in the prior
  combined run; primary authority check also passed. Three semantic regressions
  outside acquisition still fail as expected.
- UI `typescript:check-types`: exit 0 after the change.
- Dependency provenance, bounds, aliases and invalidation are still pending
  tasks 2.3–2.6; this is not closure of R2 as a whole.

### Scope decision at the native boundary

At the initial pause, implementation stopped before extending the native bridge. See
[native-resolution-decision.md](native-resolution-decision.md) for the two
current failing tests, inspected native behavior and concrete dependency/scope
choices. The required returned declaring URI is lost in the native byte-only
transport integration. No additional dependency or resolver-package change
has been made while that decision is pending.

The user subsequently delegated architectural selection. **Option 1 is selected**:
the existing ApiDOM reference library can be declared directly by the UI, with
a private registry-governed bridge. Proposal/design now reflect the exception;
the scope-decision blocker is resolved. Tasks 2.3–2.6 and all later unchecked
tasks remain required; choosing the integration does not complete those repairs.

### Verification at pause

### Resumed native-root repair (task 2.3)

The UI now explicitly seeds the supplied native root and uses the exported native
operation with the shared Arazzo defaults. Optional external recovery selects the
root use from the full error trace, preserving the reference and workflow path
even when the underlying failure is a recursive local reference in a dependency.
Supported root-local fatal errors retain their existing loading contract.
The UI manifest and lockfile declare the existing ApiDOM reference dependency;
the lockfile diff adds only that dependency entry.

`npm run test --workspace=@jentic/arazzo-ui -- test/loader.test.ts test/loading-authority.test.ts -t '^(?!resolves external schema children)'`
passed 20 tests. The returned-base test is excluded here and remains the pending
task 2.4 regression. No monorepo-wide or submission readiness is implied.

- Full UI test command: 76 files, 483 tests; **478 passed, 5 failed**.
  The failures are recursive external-schema recovery, returned retrieval-URI
  base, unbound helper actors, literal Example.value consumers and workflow
  failureActions effective uses. The latter three are the durable unrepaired
  baseline cases, not hidden passes or suppressed tests.
- UI TypeScript check: exit 0.
- ESLint on the two edited implementation files and four new fixture/test
  files: exit 0. Root lint has not run; task 8.1 remains pending.
- `openspec validate prepare-arazzo-ui-for-upstream --strict`: passed.
- `git diff --check`: passed.
- No build, installed consumer, production browser, monorepo gate or external
  validation is claimed. All remaining task checkboxes stay unchecked.
- No commits, pushes, submission refs, deployment, merge, history rewrite,
  archive or main-spec sync were performed.

The acquisition repair feeds inspector, catalog and pinned review callers;
the structural reference seam feeds projection and static impact;
effective action uses feed catalog relationships and review effects;
operation paths feed catalog presentation and browser acceptance.
Each dependent task must retain these existing private/public boundaries.
