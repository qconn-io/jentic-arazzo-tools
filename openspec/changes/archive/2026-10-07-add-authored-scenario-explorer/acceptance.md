# Implementation acceptance

Implemented the existing spec-driven plan in the UI package. The manifest adapter, guide state,
public props, exact waypoint/focus inspector, standalone acquisition and namespaced restoration
are additive. Authored Arazzo documents and runner code were not changed.

## Evidence and results

- Reading/deep-link prerequisites: archived acceptance observations in
  `../archive/2026-10-05-improve-workflow-reading/browser-evidence/acceptance/observations.json`
  and `../archive/2026-10-05-add-workflow-deep-links/browser-evidence/observations.json` were
  inspected. Current reading/location prerequisite tests passed 27/27.
- Final UI suite: **424 tests, 62 files passed**. This includes legacy text preservation,
  bounded/localized manifest errors, prose-only entries, stale steps/actions/focus pointers,
  exact call occurrences, host handoff, controlled-state rejection, cancellation, guide exit,
  digest-preserving reconstruction, and keyboard fallback when terminal Next is disabled.
- Both entry points export the new public manifest, waypoint/focus, selection and control types.
  Rolled declaration consumer checks passed for both entries. TypeScript checks and the complete
  production build passed. ESLint passed for all changed/new implementation modules.
- The real loader/model validates all **93 manually authored waypoints** across **27 stress
  scenarios and seven small-pack failure guides**. Every address resolves to the declared identity
  or its intentional recursion/depth/row display boundary. All original stress id/document/workflow/
  expected/evidence values match the independent legacy fixture.
- **35 Playwright checks passed** against the compiled standalone production app: every guide and
  waypoint at 1440 pixels, and keyboard/dialog return plus fresh-session sharing at 480 pixels.
  Desktop geometry assertions verify the guide does not overlap the inspector. The narrow
  walkthrough verifies no horizontal page overflow, Escape dismissal, focus return and restoration
  of the exact polling waypoint after its original inspector was closed.

`browser-evidence/observations.json` contains 93 desktop waypoint observations and one narrow/share
observation, source hashes, production asset hashes and both manifest hashes. The run verifies the
served script filename matches the production asset. The recorded hashes were checked against the
current implementation and compiled artifacts. Five screenshots document the critical recovery
paths and narrow layout. Records capture rendered authored content; **no business operation was
executed, no criterion was evaluated and no scenario outcome or execution coverage was measured**.
These are automated browser inspection records, not human comprehension research.

## Semantic checks

UNKNOWN/503 capture reconciliation retains the original key and source-step retry; definite
DECLINED uses the separate abort path without refund. Compensation retains the ABSENT/REVOKED guard
and does not infer later cleanup after refund failure. Completion timeout identifies the 12-second
receive timeout, two receive retries and one-way polling fallback; its waypoints never address a
republished command. FAILED device activation remains distinct from the RECORDED audit receipt.
The small pack's seven guides address actual criteria/mappings/end actions and retain its explicit
lack of automatic blind replay or in-pack reconciliation.

## Review and corrections

An independent implementation review identified five concrete state defects. Each was reproduced
with a failing component regression and corrected: controlled prose-only navigation, reapplying
initial locations after guide exit, focus leaking across occurrences/actions, clearing a guide on
host document supply, and acquiring documents for rejected controlled selections. Subsequent
restoration tests also caught and corrected lost waypoint reconstruction after closing the inspector;
the reconstructed address retains the link's document digest/revision check. Final suite and
production browser results above cover the corrections.

## Remaining limits

Manifests are manual annotations and can drift. Invalid or unavailable addresses are localized;
there is no inference from prose and no fallback to a namesake step. Only 500 scenarios and 100
waypoints per scenario are displayed, with visible truncation explanations. Reproducible standalone
links require addressable manifests/documents. Inline-only manifests need to be supplied again by
the host. Optional contract/source loading remains governed by existing provider/host policy.
