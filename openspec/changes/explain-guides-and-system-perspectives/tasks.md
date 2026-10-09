## 1. Predecessors and feature-specific discovery

- [ ] 1.1 Verify the source-binding and reading-control predecessors are implemented on the current candidate; record their identities and confirm the default Petstore route works without guide/profile configuration.
- [ ] 1.2 Refactor AdvancedTools/AdvancedProfileControls and standalone setup into the design's compact feature-specific entries; replace mandatory generic Advanced tools assertions in test/optional-tools.test.tsx and verify normal workflow loading/search/details remain immediately usable.
- [ ] 1.3 Present Guided walkthroughs with purpose text and directly selectable supplied guides in ScenarioPanel; verify named/ID-fallback guides, absent/empty manifests and ordinary reading without URL setup in scenario UI tests.
- [ ] 1.4 Add Load guides from a URL, Guide file URL and associated inline format help to the standalone loader; verify accessible label/help association, a minimal compatible JSON example, legacy array help, authored-inspection classification and zero requests on help/disclosure opening.
- [ ] 1.5 Add the explicitly labeled Open guided example action using the known digital-product document and guide URL; verify it visibly selects the compatible document plus guide, preserves addressable document/scenarios parameters, never silently attaches guides to Petstore and performs acquisition only after that action.

## 2. Explained Systems navigation

- [ ] 2.1 Move configured Systems view selection beside normal reading controls in ArazzoUI, retaining workflow/systems values and host callbacks; verify configured purpose text, exact occurrence navigation/return and no unrelated guide disclosure in system UI/location tests.
- [ ] 2.2 Provide contextual availability help for absent participant metadata and separate diagnostics for stale/invalid profiles; verify Petstore remains readable without metadata, no actor/source-owner is inferred, and no profile loader/editor or implicit acquisition is introduced.

## 3. Loading, restoration and focus

- [ ] 3.1 Update useStandaloneScenarios/ScenarioPanel reader messages for loading, unavailable URL, malformed/empty guide content, incompatible document identity and stale waypoints with applicable retry/return actions; verify valid guides/base locations survive local errors and no scenario is marked executed or failed.
- [ ] 3.2 Extend scenario-standalone and location-standalone tests for existing query parameters, legacy manifests, restored waypoint URLs, controlled host scenario updates, cancellation and document replacement; verify the relevant guide/status is revealed without repeatedly opening unrelated setup.
- [ ] 3.3 Migrate optional-tools and scenario focus tests for the new feature areas; verify covering inspection makes all background setup/navigation unavailable, Tab/Shift+Tab stay contained, Escape restores the guide/control origin and desktop interaction remains intentional.

## 4. Documentation and slice verification

- [ ] 4.1 Update README user instructions to explain guide purpose, optional separate file and Systems metadata availability before developer formats; verify examples use existing supported props/URLs and the schema example normalizes successfully.
- [ ] 4.2 Run focused optional/scenario/system/location tests, UI type checks and built public consumers; capture plain-entry, supplied-guide, configured/unconfigured Systems and failed-restoration states at both widths and record current evidence in verification.md without claiming human discovery validation.
