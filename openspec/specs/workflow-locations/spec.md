# workflow-locations Specification

## Purpose

Let reviewers share and restore exact authored workflow locations across browser sessions without exposing private viewer state or confusing repeated calls.

## Requirements

### Requirement: Scoped public location identity
The viewer SHALL support a versioned location value containing document identity, optional revision identity, overview or root workflow, supported view, and an optional scoped step or call occurrence. An occurrence SHALL identify each authored call site along its path and distinguish an operation from its associated action rows. Action addresses SHALL distinguish their scoped use from the authored declaration they inherit or reference. Optional namespaced state extensions SHALL preserve base location identity; an unavailable extension SHALL restore the valid base location with an explanation. Locations SHALL NOT contain private model objects, generated row indices, runtime credentials, or evaluated values.

#### Scenario: Two uses of one callee
- **WHEN** the reader copies a link to the capture operation under `batch-fulfilment.second-item`
- **THEN** its identity distinguishes it from the first item's capture operation and preserves the second item's caller path

#### Scenario: Optional perspective unavailable
- **WHEN** a valid location includes an extension for a perspective not available in the viewer
- **THEN** the base workflow/step location is restored and the unavailable perspective is explained without discarding the base address

### Requirement: Standalone share and reload restoration
For an addressable document, Copy link SHALL generate a URL that restores the root, view, scoped selection, and minimum ancestor expansion after document loading. Overview SHALL be addressable. Existing document query/hash inputs SHALL remain supported. Raw pasted/uploaded content SHALL require an addressable source or explicitly supplied stable host identity before cross-session sharing is claimed.

#### Scenario: Fresh session restoration
- **WHEN** a copied second-item occurrence link is opened in a fresh browser session
- **THEN** the same occurrence and its mappings become visible in the specified view after loading, without manual expansion or selection

#### Scenario: Local upload
- **WHEN** a reader requests a shareable link for an upload with no persistent source
- **THEN** the viewer explains that the content must be supplied again or published at an addressable source and does not produce a link claiming to reproduce the upload

### Requirement: Deterministic stale-location behavior
Locations SHALL be validated against the loaded document and supported inspection profile. Missing workflows, changed call paths, revision mismatches, malformed encodings, unsupported location versions, and display-limit boundaries SHALL produce a visible explanation and the nearest valid authored context without silently selecting a different occurrence. Link restoration SHALL preserve existing recursion and rendering limits.

#### Scenario: Removed second call
- **WHEN** a location names `second-item` but the loaded revision has removed that call
- **THEN** the viewer identifies the unavailable occurrence and retains the valid root instead of selecting `first-item`

#### Scenario: Bounded restoration
- **WHEN** a location requires expansion beyond a depth or row budget
- **THEN** the boundary remains visible and full authored details or a valid new-root destination remain accessible without bypassing the budget

### Requirement: History and view coherence
Standalone navigation SHALL support browser Back/Forward for committed document, workflow, view, and inspected-location changes. Search keystrokes and transient hover SHALL NOT create navigation entries. Returning to an occurrence SHALL preserve its scoped identity, and initial restoration SHALL NOT create callback or history loops.

#### Scenario: Reviewer round trip
- **WHEN** the reader inspects a nested occurrence, opens its callee, and uses browser Back then Forward
- **THEN** each destination is restored once with the appropriate document, view, and caller context

### Requirement: Embedded compatibility
Headless viewers SHALL expose optional typed location control and change notification without writing global URL/history state. Existing workflow/node callbacks and controlled-prop behavior SHALL remain compatible. A requested location inconsistent with explicitly controlled selection SHALL report that conflict rather than overriding the host. A location requiring another document SHALL be handed to the host until that document is supplied.

#### Scenario: Controlled embedding
- **WHEN** a host controls workflow and location values and the reader requests a new location
- **THEN** the request is emitted once, the host remains authoritative, and the visible location changes when compatible controlling props are supplied
