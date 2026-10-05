## 1. Location contract

- [x] 1.1 Confirm improve-workflow-reading's scoped destination/focus behavior is available before integration; verify its acceptance record and unchanged existing controlled workflow/node callbacks.
- [x] 1.2 Define/export version-one location, authored occurrence/action address, restoration status, and optional control/callback props; verify declaration consumers use them without importing private row/model/session types.
- [x] 1.3 Implement bounded URL codec, namespaced optional-state adapters, and canonical authored-content digest support while preserving existing document/query/hash inputs; verify special characters, overview, unavailable extensions, unsupported versions, length/depth limits, and unrelated URL fields with focused codec tests.

## 2. Deterministic restoration

- [x] 2.1 Resolve a location against document revision and scoped call sites after model loading; verify second-item versus first-item, duplicate step IDs, authored action versus operation, and stale paths with focused location tests.
- [x] 2.2 Restore the root/subview/selection and minimum expansion through existing session navigation without bypassing scene limits; verify recursion/depth/row boundaries, caller return, and mode switching.
- [x] 2.3 Enforce controlled-prop precedence and cancel obsolete restoration/document requests; verify single callback emission, conflicting controlled selection, external-document handoff, and late-load cancellation.

## 3. Standalone sharing and history

- [x] 3.1 Add Copy link and addressability feedback for uploads/pasted documents; verify copied links reproduce URL-loaded occurrences and unaddressable uploads do not claim shareability.
- [x] 3.2 Add committed push/replace history handling and Back/Forward restoration; verify initial hydration and popstate do not create loops or duplicate entries and search keystrokes do not modify history.
- [x] 3.3 Run fresh-session Playwright tasks for second-item capture, overview, Docs/Sequence/Flowchart/Split, revision mismatch, and browser Back/Forward at both widths; verify exact destination mappings and focused controls in saved observations.
- [x] 3.4 Document location precedence, source identity, digest/revision limitations, and host cross-document handling; verify examples compile and UI suite, types, declarations, and production build pass.
