## Context

See proposal.md. This is last and requires all preceding changes on the same candidate. The 2026-10-05 reading walkthrough's nine documents are digital-product plus stress examples; Petstore was absent. Current production acceptance builds standalone/installed-ESM artifacts and tests production.spec.ts at 1440 and 480. Its identity code hashes public/examples but omits public/petstore-order-workflow.arazzo.yaml from input identity. Negative mode currently verifies identified artifacts/fixtures, not the UX assertions. Existing optional tests inject guide/profile configuration before reading.

The normal CI path is .github/workflows/build.yml; extend its existing production-browser-acceptance job rather than introducing an unrelated pipeline. No app or browser execution in this planning turn established visual acceptance.

## Goals / Non-Goals

**Goals:** Make omitted baseline coverage impossible to report as complete, prove the gate catches its intended regressions, assess first-use discovery separately from configured operability, and block final UX readiness on missing evidence.

**Non-Goals:** Absolute absence of future defects, a new production browser harness, snapshot approval as a substitute for semantics, automatic business API calls, unrelated feature expansion, or claiming human results from simulated agents.

## Decisions

### 1. Maintain an explicit input and behavior inventory

Add test/fixtures/workflow-ux-acceptance.json as a test-owned inventory, not an application manifest. Enumerate these ten documents:
- public/petstore-order-workflow.arazzo.yaml
- public/examples/digital-product/arazzo.yaml
- public/examples/digital-product-stress/arazzo.yaml
- public/examples/digital-product-stress/event-based.arazzo.yaml
- public/examples/digital-product-stress/boundaries/recursion.arazzo.yaml
- public/examples/digital-product-stress/boundaries/depth-limit.arazzo.yaml
- public/examples/digital-product-stress/boundaries/row-limit.arazzo.yaml
- public/examples/digital-product-stress/boundaries/metadata-heavy.arazzo.yaml
- public/examples/digital-product-stress/diagnostics/unavailable-targets.arazzo.yaml
- public/examples/digital-product-stress/diagnostics/prerequisite-cycle.arazzo.yaml

Pin semantic expectations independent of generated output: exact source assignment, step/operation IDs, relationship types, expected genuine uncertainty, repeated occurrence mappings and limits. Current inspection confirmed 46 workflows: 45 newer plus Petstore. Fail inventory omissions/drift with an explicit review/update requirement. Discovering new public Arazzo samples raises a coverage failure until classified; OpenAPI/AsyncAPI contract files are not workflow entries. Hash actual sample bytes at run time and compare against the unchanged Petstore baseline SHA-256 8bd096d24c2cabd7536dc2feb9cb8b9157ffebbadf931bcc26230de4b1989569.

Do not add Petstore to the business capability catalog solely to make tests see it. Extend production-artifacts.mjs input identity to include the default file, inventory, tests/help fixtures and all changed acceptance inputs.

### 2. Extend the current production test command and consumers

Reuse run-production-browser.mjs's self-build, isolated server, installed-package consumer and ignored test-output directory. Extend production.spec.ts or explicitly included UX specs in playwright.production.config.ts; every new spec must be on the normal npm run test:browser path used by CI. Serve default Petstore and each inventory document from current build assets. Intercept the remote Petstore contract with deterministic declared test bytes during explicit loading; preserve its authored URL and require no live swagger service.

At both widths cover all ten document roots in diagram/docs/split layouts and descriptions/sequence/flowchart reading representations. Cover every inventoried workflow sequence and scoped details, with selected adversarial fixtures for duplicate IDs, repeats, recursion, bounds and unknowns. The default / entry must run without document/scenarios/profile parameters. Configured guide/system fixtures remain useful but do not count as discovery.

Use the installed ESM consumer for controlled callbacks, no host-history mutation, legacy locations and stale source results. Retain standalone copy/reopen/back/forward tests, covering details focus restoration, no implicit source/guide acquisition, and explicit loading parity. Geometry assertions must check actual label/action visibility and contained scroll as well as page width; empty SVGs or parseable strings are not enough.

### 3. Add named negative controls

Extend test:browser:negative with isolated fault modes or controlled fixtures. Require failure for these reasons: known single-source lanes misclassified; stale source destination; blank failed flowchart; missing plain-entry guide discovery; broken legacy link or public consumer. The wrapper asserts each expected assertion reason and returns failure if a mutation goes undetected or fails for an unrelated reason. A successful negative-gate run means all faults were caught, not that the product examples failed. No tracked edits, business requests or permanent sample perturbation.

### 4. Separate engineering evidence, visual assessment and human discovery

Require current engineering gates: root lint, monorepo test and type checks; UI build; test:declarations; installed package test; positive and negative production browser commands. Honor .nvmrc locally and existing CI's supported runtime without changing Node policy in this UX series.

Write compact acceptance records under ignored test-output/browser and upload CI artifacts on both pass/failure. Record base/head/dirty-diff identity, runtime, input/build digests, matrix rows, expected/actual results, captures and error/request logs. A reviewer must inspect current captures for hierarchy, typography, participant/lane correctness, long labels, selected state and useful empty/error messages; screenshots alone do not pass those tasks.

Maintain a repeatable protocol for at least one unfamiliar API Owner and one unfamiliar Developer, with informed consent for observations. Start each from the plain entry without coaching. Tasks: explain Petstore sequence and operation identity, discover guided walkthrough purpose/help/example, understand Systems availability, inspect source without interpreting found as valid/executed, follow a chain and return, distinguish second-item mappings, recover from a localized error and share/reopen. Record unassisted success, elapsed time, assistance, wrong interpretations and supporting explanations. All critical tasks must succeed unassisted in the final round; failures require product correction and fresh sessions, not relabeling assistance as success. Unavailable readers leave UX acceptance pending while engineering results can pass.

### 5. Close findings by ownership, then judge the integrated candidate

Keep a discoveries-to-requirements/tasks/evidence matrix in this design and an executed result matrix during apply. No checkbox-only completion. Product defects found here return to steps 1-3 with focused permanent tests and a current rerun; harness/evidence defects are fixed here. Material new feature scope requires separate planning rather than being hidden in acceptance. New issues discovered across the agreed surfaces block final completion.

## Risks / Trade-offs

- Full matrix increases runtime -> share deterministic fixture setup and classify representative high-risk states without omitting any document root or workflow sequence.
- Negative tests prove only harness availability -> assert named UX/compatibility failure reasons, including a normal passing control.
- Snapshots approved despite semantic defects -> independent expected lane/identity checks before visual review.
- Reader scheduling delays final acceptance -> report pending honestly; preserve passing engineering results without claiming final UX readiness.
- Historic logs appear current -> identity verification rejects changed inputs/artifacts and preserves failures.
- Offline Petstore test loses provenance -> route only the authored explicit contract URL to test-owned bytes, recording the substitution and never executing API operations.

## Migration Plan

Begin after all predecessors pass their own checks. Integrate the strengthened positive/negative commands in .github/workflows/build.yml and document local reproduction. No deployment is performed by this change. Rollback can remove harness changes but cannot justify final readiness; preceding repairs retain their own permanent coverage. Archive only after the final current matrix and required human validation are complete.

## Discovery coverage and ownership

| Discovery | Owning change | Required final evidence |
| --- | --- | --- |
| Petstore source regression; source identity versus unchecked operation | 1 | Unchanged bytes, two participants/five operations, 1.0/1.1 facts and static/live parity |
| Inspector finds operation while sequence stays unknown; stale reload | 1 | Complete/partial/duplicate candidate loading and replacement/reload parity |
| Ugly step/description/sequence buttons | 2 | Header/detail controls, focus and readable targets at both widths |
| Internal P IDs; generic Operation labels; IDs without summaries | 2 | Full scoped identity and reviewed short/long/duplicate labels |
| Diagram/Docs/Split versus nested representation confusion | 2 | Plain-entry sequence discovery, accessible selected state and old links |
| Technical contract states and host-only advice | 2 | Known-source/unchecked/failure/no-provider tasks and useful next actions |
| Silent render failure | 2 | Visible failure, retry/descriptions, late-render exclusion |
| Scenario manifest URL and Advanced tools jargon | 3 | No-setup guide discovery, supplied guides, help/example and restored failure |
| Systems availability and context switch | 3 | Configured/unconfigured/stale profile explanations and exact return |
| Default excluded; injected setup mistaken for discovery | 4 | Enforced inventory/default route and distinct configured/discovery cases |
| Operability mistaken for UX readiness | 4 | Current visual review plus actual unfamiliar-reader critical-task results |

## 2026-10-11 reading repair reconciliation

`simplify-workflow-reading` is an integrated prerequisite for this gate. Its sequence-first default, compact reading controls, direct identity selection, collapsed recovery, and contextual optional help supersede earlier presentation expectations. The ten-document/46-workflow inventory, semantic and source-authority assertions, production build identity, negative controls, and separate reader evidence remain mandatory. Previous captures and passing commands are historical evidence from the earlier candidate; do not attribute them to this repair. Run C1, C4–C9 as core reading before separately scored C2/C3 optional discovery and configured Systems/guide work. Actual unfamiliar API Owner and Developer results remain pending.
