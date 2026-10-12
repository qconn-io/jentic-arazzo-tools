## 1. Reconcile the reading candidate

- [x] 1.1 Compare this change with the in-flight `simplify-workflow-reading` and `gate-workflow-ux-regressions` artifacts, retain their existing numbering/detail/guide contracts, and verify the resulting requirement text has no conflicting or lost scenarios before any spec sync.

## 2. Close the visible defects

- [x] 2.1 Scope the Docs bulk expand/collapse control to rendered workflow details, keep its label synchronized with those details, and verify a focused UI test covers overview absence, selected-workflow action, and switching back and forth.
- [x] 2.2 Complete the sequence reading list so primary ordered-list items correspond only to authored steps; keep retries, prerequisites, continuations, and limit markers as associated unnumbered content, and verify a focused DOM/accessibility test covers five-step Petstore plus nested and repeated calls with exact occurrence mappings.

## 3. Resolve the two reading questions

- [x] 3.1 Inspect Petstore step-description detail entry at 1440 and 480 pixels using pointer and keyboard; verify the control is adjacent to its step identity, opens the correct scoped details, returns focus on dismissal, and has no detached button bank. Correct any observed gap and capture before/after evidence.
- [x] 3.2 Inspect plain Petstore, a supplied guide, and an unavailable restored guide at 1440 and 480 pixels; verify no empty guide panel precedes plain reading, help and explicit loading remain reachable without implicit acquisition, and supplied/restored context exposes its narrative or recovery. Correct any observed gap and capture before/after evidence.

## 4. Verify and record scope

- [x] 4.1 Run focused UI tests, type checking and production build for the affected package; verify commands and outcomes are recorded with the candidate commit plus working-tree state.
- [x] 4.2 Walk the running UI at 1440 and 480 pixels through default Petstore, D1, nested calls, repeated calls, asynchronous steps, missing/external targets, and the large stress example. Follow Docs, Sequence, Flowchart, Diagram and Split, then Systems, guide, catalog and revision where applicable; record screenshots and observed navigation, labels, mappings, uncertainty, prerequisite/call distinction, recovery, provenance, focus, overflow and errors, including every unvisited cell and its reason.
- [x] 4.3 Compare unchanged default Petstore on the candidate against `main`; record any operation-identity or reading regression with screenshot and reproducible path, and verify each of the four original findings has an explicit observed outcome and remaining consequence.
- [x] 4.4 Update the UX gate's evidence record with browser results while leaving unfamiliar Owner/Developer comprehension tasks pending until consented sessions provide outcomes; verify no automated result is described as human comprehension or final UX acceptance.
