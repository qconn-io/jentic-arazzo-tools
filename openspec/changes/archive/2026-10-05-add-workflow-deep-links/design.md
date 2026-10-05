## Context

`ArazzoUIStandalone` reads document query/hash parameters but only updates the document URL. `ViewerSessionContext` privately tracks generated rows, expansion, and caller frames; those values are unsuitable as a public link contract. Existing controlled workflow/node props must stay authoritative. See `proposal.md` for the observed reload loss.

## Goals / Non-Goals

**Goals:** A small public location interface backed by a deep codec/resolution module; deterministic navigation after asynchronous loading; a standalone history adapter.

**Non-Goals:** Serializing arbitrary session state, sharing upload contents in URLs, changing callback signatures, or automatic cross-document acquisition. Requires `improve-workflow-reading` before integration acceptance.

## Decisions

### Versioned authored address

Add `WorkflowLocation` with `version: 1`, document URI/stable host identity, optional revision, overview/root workflow, global view, workflow subview, and optional selection. Selection distinguishes a scoped step from an action; an action address retains its use site and authored declaration URI/JSON pointer, channel/index within that declaration, and optional name, not its effective merged index. This distinguishes step overrides, inherited workflow defaults, and reusable component declarations. An occurrence includes the ordered caller workflow/call-step pairs leading from the root. Derive transient row selection and ancestor expansion privately from those addresses. Keep `SequenceRow`, `CallerFrame`, facts, and expansion maps private.

Provide a bounded namespaced JSON extension slot with registered typed adapters for optional perspective/guide/catalog state. Base fields are validated strictly; unavailable extensions are retained for round-trip sharing but ignored for restoration with a notice. Extensions cannot override document/root/occurrence identity or introduce executable expressions. Each later change owns its namespace and adapter, keeping the base codec independent of optional presentation modules.

Standalone URLs preserve existing `document` input and add one bounded encoded `location` value. Preserve unrelated query/hash fields. Encoding/decoding validates version, length (16 KiB), depth (32 address segments), and known fields; display remains constrained to existing eight-level/200-row budgets. Use canonical document retrieval identity; standalone links include a digest of canonically serialized authored content so changed content can be diagnosed. Host-supplied immutable revisions supplement that identity. Pixel offsets and expansion snapshots are omitted: address identity should survive layout changes.

### One restoration transaction

Resolve after the requested document's model is ready, verify revision and every call site, then request the root/view/selection and minimal expansion. Revision mismatch is explained before selecting occurrence content. If a path fails, keep the nearest valid root and show the exact unavailable segment; never fall back to the first matching step. Outside the scene budget, expose authored details and a new-root option while retaining the marker.

Add optional `location`, `defaultLocation`, and `onLocationChange` props plus a typed restoration-status callback. Explicit existing controlled workflow/node values win when inconsistent; the conflict is reported. Embedded viewers never mutate global history. Cross-document locations emit a request; a host supplies the target document, while the standalone adapter handles its own document-source state. Do not leak rows through those callbacks.

### History belongs to the adapter

Standalone committed navigation pushes a state entry; initial hydration and canonicalization replace it. Back/Forward runs the same restoration transaction, suppressing duplicate emissions/history writes. Search keystrokes/hover do not commit. Copy link is available for stable addressable sources; uploads without one receive a targeted explanation. Existing inline/hash document loading remains functional but is not copied into newly generated share URLs by default.

## Risks / Trade-offs

- [Mutable remote source] → include revision/digest, disclose mismatch, and avoid pretending the URL pins historic bytes.
- [Async restoration competes with controlled updates] → use document generation and request sequence tokens; cancel obsolete requests, retain host authority, assert single callback emission.
- [Authored action indices change] → revision identity plus channel/name checking prevents silently selecting another action; explicit invalid-location behavior is preferable to heuristic matching.

## Migration Plan

Add optional types and codec first; old consumers require no changes. Integrate restoration into existing navigation, then add standalone history/copy controls. Document precedence and unaddressable uploads. Verify declaration consumers, existing controlled-navigation tests, and fresh-session/Back/Forward Playwright tasks. Rollback removes optional location handling and adapter wiring while old document links continue to load.
