# Current engineering evidence

Client session date: 2026-10-09. Machine-generated reports keep their own clock
values. Source branch/HEAD remain `feature/visualize-chained-workflows` /
`a0d08472050d44f2079232f1535c9a6ac326af57`; the repairs are additional working-tree
bytes, identified by the browser input hashes and eventual preserved repair ref.
All commands used `nvm use` (Node 26.3.1, npm 11.16.0).

## Maintained gates

| Command | Current result | Ignored evidence under `packages/jentic-arazzo-ui/test-output/` |
| --- | --- | --- |
| Root `npm run lint` | All five projects pass; UI 52 warnings, zero errors | `current/lint-final.log` |
| Root `npm run test` | All five projects pass; final repaired UI 540/540 (87 test files), including three representative fixture checks | `current/test-final.log`, `current/jentic.log` |
| Root `npm run typescript:check-types` | All five projects pass | `current/types-final.log` |
| UI `npm run test:browser` | Full sequential dependency/UI builds, strict rolled/installed declarations, packed main/standalone ESM/UMD/CSS/catalog gates, fresh object/YAML hosts, then 14/14 desktop/mobile production cases | `current/browser-handoff.log`, `browser/identity.json`, `browser/report/` |
| UI `npm run test:browser:negative` | Expected failure, exit 1, on intentionally altered response fixture | `current/browser-negative.log`, `current/browser-negative.exit` |
| Restored Playwright production suite | 12/12 before representative addition; tracked diff byte-identical before/after | `current/restored-browser.log`, `current/{before,after}-browser.patch` |
| UI `npm run test:bundle` | Identical baseline/current installed graph, minimal optional-retention assertions, initial/deferred and whole-file measurements | `package-consumer/bundle-comparison.json`, `current/bundle-final.log`; exact identities in package cost report |

The browser suite covers ordinary viewing, Advanced tools keyboard disclosure,
explicit source loading/provider denial, unknown helper actors, distinct repeated
call locations, the selected operation's two entry paths, default-action
before/after impact, scenario focus/Escape/origin restoration and pinned public
Jentic workflows. Each case checks page errors, business/API or implicit dependency
requests, embedded history and page-wide overflow. Passing viewport captures are
attached to the HTML report. The desktop/mobile operation controls were also
visually inspected. Support, source revision, authored request content and
advanced provenance remain available without implicit source loading.

The fresh advertised-range probes pass both object and forced-YAML inputs after
aligning the UI's generic YAML adapter range to `^5.0.1`. These hosts have no
SpecLynx overrides. Their resolved locks/coverage/tarball hashes and caught parser
detection exceptions remain in `package-consumer-unpinned*/evidence-*.json`.
Controlled measurement pins do not stand in for this compatibility check.

## Representative inspection

The unmodified Asana, Xero accounting and Stripe workflow documents are pinned to
Jentic public API repository commit `6af8aeee9f38dbf15959a946f82cb24ef9144b4d`.
Original URLs, SHA-256, CC0 license and exact counts live in
`test/fixtures/jentic/provenance.json`. The automated projection checks retain
10/32, 6/29 and 7/30 workflows/steps respectively, without fetch. Installed ESM
browser checks open an authored step for each at both widths without acquisition.
The composition/stress examples remain in the production and focused regression
suites. This is readable inspection/operability evidence, not schema validation,
business execution, compatibility approval or measured comprehension.

## Scope limits

Root `npm ci --engine-strict=false` passed (`current/clean-install.log`) and the
self-contained production command then passed with the tightened gates.
Independently built S1–S8 prefixes are recorded in submission evidence when performed. Current working-tree gates cannot be
substituted for those prefix results. Unfamiliar-reader sessions (A3) and actual
maintainer scope/sidecar feedback (A4) remain pending in their dedicated records.

The acceptance-script review closed three false-positive risks: await all logical
documents and terminal source coverage plus a rendered located consumer; identify
authored inputs separately from prerequisite build outputs; allow only identified
static artifacts, selected primary/guide/fixture URLs and the exact explicitly
loaded contract. Extensionless secondary/business GETs are forbidden too. CI
retains the separate fresh dependency-resolution evidence JSONs on failure.
A transient stricter-wait implementation counted two logical documents as the
whole coverage list; its failing run is retained, and the corrected identity-based
predicate passes the final clean-install gate.

The final request allowlist also covers fresh shared-guide restoration pages.
The follow-up read-only engineering review found no remaining concrete gate
false-positive/freshness defect, confirmed preserved timeout policy and CI fresh
evidence upload, and independently checked current identity against built bytes.
