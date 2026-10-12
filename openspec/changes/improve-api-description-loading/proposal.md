## Why

Readers can load an Arazzo document yet see every API reported as unverified, with the loading action buried below a selected step's declaration. The standalone viewer should load declared API descriptions while the workflow remains readable, and all views should explain current source availability without implying validation or execution.

## What Changes

- **BREAKING (standalone acquisition default):** Default standalone API-description loading to automatic background acquisition through the existing provider and SourceRegistry. Embedded ArazzoUI remains manual by default; an additive `apiDescriptionLoading: 'manual' | 'automatic'` host prop supports either policy, including opting standalone viewing out of automatic requests.
- Automatically inspect declared OpenAPI sources and AsyncAPI sources eligible under the selected Arazzo profile. Preserve explicit external-Arazzo navigation and never discover sibling documents, guides, or profiles by guessing.
- Replace the hidden loading journey with a compact document-level API descriptions summary and directly reachable source list, available across ordinary reading views and the overview. Provide bulk Load API descriptions for manual mode and per-source Load, Retry, and Reload actions.
- Share current loading and projection state between the source list, inspection details, step inspector, and sequence lookup. Remove permanent unverified labels and unfetched claims from authored-only generated documentation.
- Preserve base/retrieval identity, revision pins, bounds, cancellation, stale-result protection, ambiguity, and the distinction between loaded descriptions, located operations, and unestablished conformance/validation/execution.
- Verify default Petstore and digital-product examples, failures and replacement races, keyboard/narrow-layout behavior, public declarations, and reader discoverability.

## Capabilities

### New Capabilities

None; extend existing inspection and reading capabilities.

### Modified Capabilities

- `api-contract-inspection`: Define automatic versus manual acquisition, bounded shared loading, source availability independent of operation lookup, and visible document-level loading/recovery.
- `workflow-reading`: Make API sources reachable without selecting an interaction; preserve compact sequence-first reading and truthful provenance in interactive and generated documentation.
- `workflow-inspection-integrity`: Recognize configured automatic API-description loading as an enabled acquisition operation while retaining the provider as sole authority and keeping primary-document schema expansion, catalog/revision acquisition, and external-workflow navigation outside that policy.
- `chained-workflow-visualization`: Reconcile authored-only source-binding scenarios with automatic acquisition, preserve static-versus-interactive evidence scope, and make consolidated inspection status reflect current API availability.

## Impact

UI entry points and public viewer props; ArazzoViewerContext and ContractFactsContext; InspectionStatus, ContractPanel, DocsView, and shared shell styles; documentation formatters and README; component, declaration/package-consumer, and production-browser checks. Reuse SourceRegistry, BrowserFetchProvider, existing contract adapters, and operation resolution; add no dependency.

Standalone defaults change observable network activity: opening a document begins requests for its declared eligible API sources and supported reference dependencies. The manual prop preserves the former acquisition behavior. Embedded defaults, callbacks, location/history formats, authored examples, and semantic inspection limits remain unchanged. This change creates planning artifacts only; implementation, spec sync, archive, commits, and publication are separate actions.
