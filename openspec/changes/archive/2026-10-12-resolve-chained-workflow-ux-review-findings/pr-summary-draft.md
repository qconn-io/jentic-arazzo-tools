# Draft PR: feat(ui): read and inspect chained Arazzo workflows

Local preparation only. No PR is published. Submit only after feature-issue
feedback and the scope/DCO disposition in
[submission-scope.md](submission-scope.md).

### Description

Readers can follow a local workflow call, inspect its exact occurrence and return
to the caller, including repeated calls with different authored mappings. The
implicit viewer starts in Sequence diagram; Step descriptions and explicit or
restored view choices remain available. Expansion is bounded, prerequisites remain
classified dependencies before their owners, and diagrams describe declarations
rather than evaluated execution.

Shared inspection preserves authored semantics and provenance. API descriptions
load explicitly through the supplied provider, and operation lookup is distinct
from validity or execution. Occurrence locations support sharing/history. Optional
Systems, authored guides, catalog and immutable revision review use explicit
supplied context and separate public entry paths; maintainer scope feedback will
determine their submission order.

The final UX repair restores the numbered description timeline, removes unused
sequence space at narrow entry, makes embedded inspector modality follow measured
viewer bounds, and preserves host sizing/classes in unsupported raw fallback.

### Motivation and Context

The goal is ordinary reading of chained workflow declarations without losing
caller scope or requiring optional metadata setup. There is no qualifying feature
issue or feedback link yet. Existing branding and URL-support discussions are
background context, not acceptance of this feature.

### How Has This Been Tested?

Node 26.3.1/npm 11.16.0 via `.nvmrc`; focused regression failures before repair,
root lint/tests/type checks, generated public declarations and installed consumers.
Identified standalone/installed ESM production gates and named negative controls
run at 1440×1000 and 480×900. Exact final commands, exits, digests and reviewed
captures are in [verification.md](verification.md); only its final results should
be copied into a submitted PR. The final candidate passed 1,110 monorepo tests
(including 637 UI tests), root types/lint, declarations/installed consumers,
168 production browser cases and all seven named negative controls at both
widths. Lint retains 52 warnings and zero errors. Failed and superseded runs remain recorded there.

The user confirmed that these repairs result from API Owner/Developer feedback
and requested completion of the human tasks. Detailed protocol session measures
were not supplied; no measured unassisted success is claimed. Automated navigation
and capture review remain separate from that user-confirmed feedback.

### Screenshots

Use the selected current default sequence, description timeline, repeated
prerequisite, covering/nonmodal embed and unsupported fallback captures linked in
the verification record. Avoid attaching the entire historical archive.

### Review notes

The full branch adds runtime inspection dependencies and test/CI tooling; see the
scope map for exact effects. Viewer/standalone ESM and CommonJS remain supported;
the catalog subpath is ESM-only. No dependency or public type was added by the
final repair. Two older commits lack DCO sign-off and require disposition before
submission. This draft does not approve a history rewrite or combined feature PR.
