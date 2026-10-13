# Synthetic revision review pairs

These supplied JSON snapshots support authored-inspection acceptance, not workflow execution.

- `purchase.json`: retry-to-goto recovery, capture criterion/schema drift, amount mapping,
  removed revoke-license compensation, and a retry/prerequisite cycle.
- `event.json`: receive-evidence criterion and AsyncAPI payload declaration drift.
- `partial-purchase.json`: the historic contract revision exists but its bytes are absent.
- `formatting.json`: equivalent supplied content serialized with whitespace/key-order changes.

Each side has an explicit catalog revision and document revisions. Contract contents are
supplied in the snapshot; `review.example` URLs identify authored sources and are never fetched.
The declared entry role supports potential entry-path inspection. Ownership and business
compatibility are not inferred.
