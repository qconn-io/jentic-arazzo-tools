## Why

Current source links resolve correctly but open raw YAML outside the workflow, and operations remain unverified. Developers need to inspect the exact HTTP or event contract beside its workflow use, while Owners need reliable source and usage context.

## What Changes

- Add an optional source-document provider and an explicit standalone Load source action, retaining the current no-source-fetch default.
- Resolve supported OpenAPI and AsyncAPI operation locators into readable contract details: identity, parameters, schemas, responses/messages, servers, and declared security requirements.
- Keep loading, unavailable, unsupported, ambiguous, missing, and successfully located states distinct; show document/version provenance and reference limitations.
- Use a bounded source registry for supplied external Arazzo workflows and cross-document navigation without silently mutating the primary document or expanding external calls.
- Retain raw authored locators and source documents as accessible fallbacks.

## Capabilities

### New Capabilities

- `api-contract-inspection`: Optional source loading, scoped operation resolution, and in-context contract inspection.

### Modified Capabilities

None; the main spec inventory is empty. Source-not-checked behavior from the archived feature remains the default; opt-in inspection adds explicit resolved states.

## Impact

New UI source-registry and contract-projection modules, `SelectionDetails`, `InspectionStatus`, source cards, loading context, and additive public provider types. Reuse existing OpenAPI resolver facilities where suitable; introduce a UI-local AsyncAPI 3 inspection adapter and a direct dependency on the generic ApiDOM YAML 1.2 adapter rather than expanding runner support. Integration follows `improve-workflow-reading`; source acquisition can be implemented independently. Shared parser/resolver contracts remain unchanged.
