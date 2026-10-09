# Native acquisition bridge: scope decision

## Selected decision: option 1

On 2026-10-07 the user delegated selection of the option best aligned with the
current architecture. Option 1 was selected: declare the existing ApiDOM
reference library directly in the UI and keep the acquisition bridge private.

Current-source evidence:

- `utils/source/SourceRegistry.ts` already owns provider authority, retrieval
  aliases, revision checks, scope budgets, dependency invalidation and freshness.
- `utils/contract/{OpenAPIAdapter,AsyncAPIAdapter,ArazzoAdapter}.ts` are UI-local
  inspection projections; their shared acquisition policy belongs at that seam.
- `utils/loading/loadDocument.ts` already owns inspection-specific reusable
  recovery and authored/native snapshot preservation.
- `packages/jentic-arazzo-runner/src/normalizer/ArazzoWorkflowNormalizer.ts`
  also calls the shared resolver. Moving inspection recovery/acquisition policy
  into that package would widen its verification and maintenance scope.
- The parser/resolver already depend on ApiDOM reference 5.0.1. Declaring it
  directly makes the UI's actual use explicit without adding a distinct library.

The proposal and design now reflect this narrow dependency exception. Public
native construction primitives must stay private to the UI, using supported
package exports and the existing registry. No copied visitor, global patch,
authored-identity fabrication or UI-specific default in the shared resolver is
part of this choice. Installation, consumer exports and bundle measurements
still require verification during implementation. No further scope selection
is required for option 1.

The sections below preserve the evidence and alternatives from the original pause.

Tasks 2.1–2.2 enforce the byte-acquisition boundary and pass their focused
checks. Tasks 2.3–2.6 remain incomplete. The tests below prevent that partial
success from being mistaken for a complete reference/provenance repair.

## Current reproducible failures

Run after `nvm use`:

```sh
npm run test --workspace=@jentic/arazzo-ui -- test/loading-authority.test.ts
```

1. A provider returns `https://cdn.example.test/schemas/input.json` for a
   request to `https://example.test/input.json`. Its schema contains a relative
   reference `./amount.json`. The native visitor requests
   `https://example.test/amount.json`, instead of
   `https://cdn.example.test/schemas/amount.json`.
2. A recursive external schema returns a nested `#/$defs/loop` error. The
   current recovery callback sees that inner local reference and rethrows it,
   despite the native trace retaining the outer external use. The whole root
   fails instead of retaining the optional external reference. Recovery needs
   the declaring/use trace, while genuinely fatal root-local errors must retain
   their existing contract.

These fixtures use only supplied content/providers and an ephemeral loopback
server for primary acquisition checks; no external service is required.

## Native boundary inspected

Installed ApiDOM source:
`node_modules/@speclynx/apidom-reference/src/dereference/strategies/arazzo-1/visitor.mjs`.
`toReference` calls native `parse`, then constructs a `Reference` with the
requested `baseURI`. It does not use the provider's returned retrieval URI.
The custom resolver's `read` contract returns a Buffer; simply changing those
bytes cannot establish a new declaring reference identity. Injecting an authored
`$id` to work around this would invent schema identity and is not acceptable.

The UI does not declare `@speclynx/apidom-reference` as a direct dependency.
The existing parser/resolver entries export parse/dereference functions and
their option types, not native reference-set/strategy construction primitives.
The resolver package already declares the reference library as a dependency.

## Alternatives considered at the original pause

The proposal states “no new runtime dependency” and lists UI/CI/documentation
implementation scope. A reference-aware native bridge requires deciding where
the additional native integration belongs:

- Allow the UI to declare the already-installed ApiDOM reference package as a
  direct dependency, keeping the bridge, reference identity and trace recovery
  private to the UI. This adds no distinct library to the installed graph, but
  does change the UI's declared runtime dependency contract.
- Expand implementation scope to the resolver package, preserving existing
  public exports and verifying its parser/runner and other consumers. This
  places the native integration alongside its existing dependency, with a
  broader regression surface than the current UI-only repair.

At the original pause, no dependency change, resolver-package edit,
authored-identity substitution or scope reduction had been made.
Returned base/revision, alias, depth/budget,
dependency-invalidation and cancellation tests remain mandatory whichever
integration is selected. The remaining semantic/presentation/submission tasks
have not been dropped or marked complete.
