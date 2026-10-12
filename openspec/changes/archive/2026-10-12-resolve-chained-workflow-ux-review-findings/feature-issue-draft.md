# Draft: Read chained Arazzo workflows with scoped sequence inspection

Prepared 2026-10-12. This is a local draft, not a published issue or approval.

### Is your feature request related to a problem?

An API owner or developer reading an Arazzo workflow needs to distinguish a local
workflow call from an API interaction and inspect the exact caller occurrence.
Repeated calls, prerequisites and recovery declarations are difficult to follow
when presented only as an isolated workflow graph or a long document.

### Describe the solution you'd like

Extend `@jentic/arazzo-ui` with a sequence-first reading path, bounded expansion of
local workflow calls, exact occurrence details and return-to-caller navigation.
Retain Step descriptions and existing explicit view choices. Keep authored
prerequisites unnumbered and before their owners, and distinguish source identity
from operation lookup and execution. Embedded details follow the host's available
width; unsupported semantic profiles retain authored raw content and host sizing.

Use the supplied source provider as the sole acquisition authority, with explicit
contract loads and revision/cancellation handling. Locations retain exact repeated
occurrences. Optional authored Systems/guides, catalog and revision-review surfaces
have separate declarations and inspection boundaries; please advise whether those
extensions should be reviewed separately from the core chained reading feature.

### Describe alternatives you've considered

Keep the existing isolated graph and improve prose alone; or expand every
relationship into a single graph. The proposed bounded sequence and exact details
retain caller scope without making all optional metadata part of initial reading.

### Additional context

The branch and proposed review slices are documented in [submission-scope.md](submission-scope.md).
Current engineering evidence belongs to [verification.md](verification.md).
The user confirmed API Owner/Developer feedback as the basis of this change and
closed the human tasks. Detailed protocol measures were not supplied; automated
navigation does not prove comprehension. This feature is descriptive and performs no business operations.

`CONTRIBUTING.md` requires an issue and feedback before a feature PR. Read-only
GitHub searches in `jentic/jentic-arazzo-tools` for “chained workflow” and “workflow
visualization” returned no matches on 2026-10-12. A broader “arazzo UI” search
returned ten existing issues, including [brand styling #98](https://github.com/jentic/jentic-arazzo-tools/issues/98)
and [shareable URLs #102](https://github.com/jentic/jentic-arazzo-tools/issues/102).
The broader search is retained in `verification-logs/upstream-issues.json`.
The existing #98 comment discusses the prior logo-color alignment and #102
points to an earlier URL-support commit; neither supplies feedback on this
chained-workflow proposal. Their read-only snapshots are retained alongside the
search results.
These limited searches are not proof that no related discussion exists. No qualifying issue link
or maintainer feedback has been supplied or found, so that requirement is pending.
