# Systems implementation verification — 2026-10-07

Change: `add-system-interaction-view`, schema `spec-driven`. The approved prerequisite repair expanded the plan from 12 to 14 tasks. Verification covers the current working tree, including the existing contract-inspection repair on which Systems depends. Existing user edits were preserved. No commit, push or archive was performed.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Full UI suite | 399 tests pass in 58 files | [Log](verification-logs/ui-tests.log) |
| TypeScript | Pass | [Log](verification-logs/types.log) |
| Public declarations | Both rolled entry consumers pass; legacy unions remain unchanged and private scenes remain private | [Log](verification-logs/declarations.log) |
| Production build | UMD, ESM, declarations and deployable app pass | [Log](verification-logs/build.log) |
| Package lint | 0 errors; existing 40 warnings | [Log](verification-logs/lint.log) |
| Chromium acceptance | All 17 cases pass: 11 existing contract cases and 6 Systems cases | [Log](verification-logs/browser.log) |
| Built UMD smoke | 3 observations pass, no browser errors; asset hashes recorded | [Record](browser-evidence/production-observations.json), [Log](verification-logs/production-browser.log) |
| OpenSpec and whitespace | Strict validation and `git diff --check` pass | [OpenSpec record](verification-logs/openspec.json) |
| Comprehension walkthrough | Automated/source-grounded walkthrough recorded; human sessions not conducted | [Walkthrough and human follow-up rubric](comprehension-walkthrough.md) |

## Implemented behavior

Profiles have explicit document/revision scope, participant/actor/source-owner distinctions and authored or host provenance. The digital-product adapter is opt-in. The small pack exposes five participants and one client purchase exchange, with its descriptive implementation and separate standard reserve-and-capture control. Missing/conflicting associations remain diagnostic and authored operations remain inspectable.

Contract facts retain resolved message/channel identity and authored-use provenance, including external/chained references and revision information. A viewer-local store shares explicitly loaded projections with the inspector and Systems, excludes stale facts on provider/document replacement and dependency reload, and performs no acquisition just by reading facts. Four event associations are explicitly authored in the example profile. Matching names/content without an association create no relationship; differing/stale identities remain diagnostic.

The pure scene distinguishes exchanges, descriptive groups, standard calls and finite limit markers. It terminates at eight groups or 200 rows. Selected mappings retain caller context across standard calls and each descriptive boundary; only exact unique declared output references provide producer navigation. Other expressions remain authored text and are not evaluated. Contract response alternatives and declared event relationships are opt-in layers; no observed response, delivery, correlation success or transaction result is asserted.

The optional Systems setting and controlled perspective props are additive. Keyboard controls reuse the inspector's focus behavior. Standard locations open exact occurrences; the `jentic.systems` extension preserves separate descriptive paths and expansion state. Desktop and 480-pixel presentation use contained scrolling. Standard workflow defaults and public mode/type unions remain unchanged.

## Review corrections

An independent review reproduced and verified repairs for repeated descriptive-occurrence identity, rejected controlled extension updates, duplicate event IDs, wrong limit-marker destinations, omitted extension restoration and malformed extension normalization. Permanent regressions cover these cases. An additional host-controlled perspective regression verifies selected occurrences survive host updates without callback echoes. The focused independent recheck found no remaining concrete defects in the reviewed paths.

## Reproduce

From the repository root, select the `.nvmrc` toolchain (Node 26.3.1/npm 11.16.0):

```bash
source /home/mkogan/.nvm/nvm.sh
nvm use
npm test --workspace=@jentic/arazzo-ui
npm run typescript:check-types --workspace=@jentic/arazzo-ui
npm run build --workspace=@jentic/arazzo-ui
npm run test:declarations --workspace=@jentic/arazzo-ui
npm run lint --workspace=@jentic/arazzo-ui
(cd packages/jentic-arazzo-ui && npx playwright test)
node openspec/changes/add-system-interaction-view/browser-walkthrough.mjs
openspec validate add-system-interaction-view --strict --json
git diff --check
```

The built UMD script creates an isolated loopback harness with UTF-8 document encoding, starts no preconfigured viewer alongside the test viewer, records exact built asset hashes and screenshots, then closes its browser/server. The earlier harness attempt accidentally mounted two standalone viewers sharing browser history; it was corrected before recording acceptance. The normal development/browser suite and the production harness both passed independently.

## Boundaries

This is a descriptive inspection perspective, not execution, expression interpretation, message simulation, comprehensive contract validation or inferred ownership. Hosts must explicitly select a profile/adapter and supply the corresponding profile to restore descriptive associations. Human comprehension effectiveness remains unmeasured; the automated walkthrough and expected explanations are not participant results. The existing self-contained UMD packaging still includes its dependencies; no separate packaging change was made.
