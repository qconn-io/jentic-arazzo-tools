> Current status (2026-10-12): human and dependent closure tasks are complete
> on the user's confirmation that the repairs result from API Owner/Developer
> feedback. Earlier pending-session statements below are historical. Detailed
> protocol measurements were not supplied; see the final completion addendum.

# Simplify workflow reading: verification

Date: 2026-10-12. Implementation and engineering evidence are current. Final UX
acceptance is **PENDING** consented unfamiliar-reader sessions. Task progress is
23/25; tasks 6.4 and 6.5 remain unchecked. This change and the related
`gate-workflow-ux-regressions` change remain active. No sync, archive, commit or
publication is claimed.

## Candidate and evidence boundary

The exact tested build, source/test/fixture hashes, package artifacts and
runtime are recorded in
`packages/jentic-arazzo-ui/test-output/browser/identity.json`. Its current run
summaries are `coverage.json` and `negative.json` in the same ignored output
directory. The identified candidate at build and after both browser commands:

- HEAD `db98e5b87ecac6a6619056c9567c8adfdf798962`; base
  `49dd8ef814637b481c0a1998f586ce2785812f5d`.
- Tracked binary diff SHA-256
  `7becceb9a2ea9b91c4abfc043ec284442f6d297c93bcc2d0e4d59280c2516b88`.
- `identity.json` SHA-256
  `1dbcffcba52940e8fb8cca1d0164f13fc9e9dcbf917d8c5659614cdee1e6d515`.
- Input identity SHA-256
  `65f4162dbffe2b9f4f6d99c53be8103e478776a12fe69a935337c5dad2defb3f`.
- Built `2026-10-12T05:33:54.351Z` on Node 26.3.1; positive run
  `64eb0a34-1679-4247-a79f-27b79368fa76`; negative run
  `184761db-b0ee-46cc-bb31-ecaae93783ca`.

`verifyIdentity()` checked the input and output bytes after the negative
command, and the tracked diff digest was rechecked. No tracked source or
documentation changed between the final positive and negative runs.
Final human sessions must use a still-verified build; any relevant UI correction
requires fresh production checks and a new reader round.

The unchanged authored Petstore file retains SHA-256
`8bd096d24c2cabd7536dc2feb9cb8b9157ffebbadf931bcc26230de4b1989569`.
No public mode or location format, source-provider authority, or authored sample
was deliberately changed. Sequence is an implicit default only when neither
the host nor a restored location selected a reading view.

## Requirement and task results

| Area | Implementation and current evidence | Result |
| --- | --- | --- |
| 1. Overview and direct selection | Concise relationship disclosure, contextual filters, direct semantic identity buttons in descriptions/cards/sequence, keyboard SVG identities, focus restoration and inspector containment. Focused reading, navigation and production cases at both widths. | Engineering PASS; unfamiliar-reader comprehension PENDING |
| 2. Sequence hierarchy and call continuity | Authored steps numbered, recovery/structural annotations subordinate, exact repeated occurrence selection, accepted local calls retain sequence and caller return. Petstore five primary steps, second-item 2499, boundary markers and event recovery covered in unit and browser cases. | Engineering PASS |
| 3. Initial reading hierarchy | Bare entry starts in sequence; explicit view/host/location controls retain authority. Primary Sequence diagram/Step descriptions, named More views, compact loading/search/document information, accurate source/inspection status. Root matrix and installed ESM cases cover old representations and controlled requests. | Engineering PASS |
| 4. Optional guides and Systems | Empty default guide panel removed; Help and guides explains purpose/format and deliberate loading. Configured Systems is reachable through More views; absent/stale metadata is explained without inferred actors. Guide error/restoration, configured return and no implicit acquisition covered in browser cases. | Engineering PASS; optional human C2/C3 PENDING |
| 5. Gate and documentation | Gate proposal/design/tasks/delta/protocol reconciled to core C1/C4–C9 and separate C2/C3. README and maintained production/negative coverage updated. Earlier gate failures remain recorded. | Engineering PASS |
| 6. Final validation | Root and focused commands, standalone/installed builds, declarations, positive/negative browser gates and visual review recorded below. | Engineering PASS; final UX acceptance PENDING |

## Engineering and production browser runs

All commands used `.nvmrc` through `source ~/.nvm/nvm.sh && nvm use` (Node
26.3.1). Exact root command strings, wall times, exit codes and logs are in
`packages/jentic-arazzo-ui/test-output/browser/simplify-workflow-reading/engineering-commands.json`.

| Command | Current result |
| --- | --- |
| Focused reading/sequence/navigation/location/scenario/Systems UI tests | Exit 0; 56 tests in 8 files |
| `npm run lint` | Exit 0; existing warnings, no errors |
| `npm test` | Exit 0; UI 621 tests in 97 files; other workspaces passed |
| `npm run typescript:check-types` | Exit 0 |
| `npm run test:browser -w @jentic/arazzo-ui` | Exit 0; 164/164 cases; ten document roots, all 46 workflows, seven root states per width; fresh UMD/ESM/standalone builds, declarations and packed installed consumers |
| `npm run test:browser:negative -w @jentic/arazzo-ui` | Exit 0; seven named faults each detected for its exact assertion at both widths; all matching controls passed |

The two browser command durations were 439.57s and 163.98s respectively.
Exact command strings, run IDs, exit codes and logs are in
`test-output/browser/simplify-workflow-reading/browser-commands.json`.

The seven faults are wrong Petstore lanes, stale destination, silent rendering,
missing guide discovery, broken legacy consumer, lost direct identity activation
and lost sequence-follow continuity. The deliberate fault test failures are
detection evidence; the wrapper rejects unrelated errors, omissions and failed
normal controls. The full test report, browser request/error records, screenshots
and traces are under `test-output/browser/`. No live Petstore contract or
business operation was required; the explicitly loaded authored contract URL
uses deterministic test-owned bytes.

## Visual review

The current production build was opened untouched at 1440×1000 and 480×900.
Captured measurements and SHA-256 for the twelve reviewed images are in
`packages/jentic-arazzo-ui/test-output/browser/simplify-workflow-reading/visual-review.json`.
The desktop reading pane starts at y=260 and provides 740px (74% of viewport);
the narrow pane starts at y=287.5 and provides 612.5px (68.1%). The first
Petstore SVG interaction spans y=673.97–772.97 desktop and y=782.95–881.95
narrow, visible without scrolling. Document page width equals viewport width
at both sizes.

Fresh images were inspected for the initial sequence, overview, exact narrow
inspector and focus, opened authored recovery, nested call/return, long labels,
row boundaries and stale Systems help. The long SVG label is shortened in the
diagram, while its full authored value wraps in Step descriptions. The five
Petstore authored operations have five primary numbers; failure/retry cues sit
under their owners and do not claim evaluated outcomes. No new blocking visual
failure was found in the inspected frames. These captures establish layout and
operability, not reader comprehension. The reviewed build and final build have
the same input identity SHA-256 shown above.

## Human result and closure

`gate-workflow-ux-regressions/acceptance-protocol.md` contains the consent,
unfamiliarity, width-order, task and assistance rules. `human-results.md` is
PENDING with no simulated participant data. The user can arrange one unfamiliar
API Owner; a Developer reader has not been arranged. Neither role has completed
a consented session on this candidate. Core C1/C4–C9 and optional C2/C3 must
be scored separately at both widths. Any reader-discovered product defect goes
back to its owning task with a permanent regression and fresh build/round.

Final UX acceptance, task 6.4 and final evidence closure task 6.5 remain
**PENDING** until these observations exist and required corrections pass. The
active gate's tasks 5.3, 6.1 and 6.2 likewise remain unchecked. Strict OpenSpec
validation confirms artifact form and coherence; it does not substitute for
reader outcomes. Both active changes passed `openspec validate <change> --strict
--no-interactive`; `git diff --check` passed.

## Current candidate reconciliation (2026-10-12)

The successor [repair verification](../../resolve-chained-workflow-ux-review-findings/verification.md)
owns the current prerequisite/timeline/embed fixes and their identified evidence.
The earlier results above remain historical. Pending human/final-closure task
checkboxes have been restored to match the unperformed sessions recorded here;
no participant result has been supplied by automation or by archival status.
Use the successor candidate for the existing consented protocol and record real
outcomes before final UX acceptance.

## User-confirmed human feedback completion (2026-10-12)

The user explicitly requested completion of all API Owner/Developer human tasks
and confirmed that this change is the result of their feedback. These tasks and
the dependent evidence-closure tasks are complete on that user-confirmed basis.
This supersedes the earlier pending/reopened task status. No session dates,
participant identities, consent records, width-specific outcomes, timings or
unassisted-success measurements were supplied or invented. This records existing
human feedback, not sessions conducted by the assistant or a measured protocol
pass. Engineering evidence and maintainer approval remain separate.
