## Why

The standalone UI asks for a "Scenario manifest URL" behind "Advanced tools" without explaining its benefit, format, or source. Knowing Jentic or Arazzo does not explain viewer-specific reading guides and business-participant profiles, and current tests start after their setup has already been supplied.

## What Changes

- Replace vague advanced-tools organization with feature-specific Guided walkthroughs and Systems view explanations, preserving progressive disclosure for optional setup.
- Explain guides as author-provided descriptions and links through a workflow; expose supplied guides directly and put URL setup under Load guides from a URL with inline format help and an explicit example.
- Explain Systems as a view of explicitly supplied participants and associations; place its switch near workflow reading controls when available, with a clear unavailable state when metadata is absent.
- Retain existing legacy manifests, query parameters, scenario/profile props, shareable waypoints and explicit source-loading boundaries.
- Add loading, error, retry, empty and restored-context states that preserve ordinary reading and accessible focus.
- Do not introduce inferred profiles, sibling discovery, a profile editor, new profile acquisition, or scenario execution.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `authored-scenario-exploration`: discoverable, explained guide use and optional loading.
- `system-interaction-perspective`: understandable availability and feature-specific navigation.
- `upstream-contribution-readiness`: replace the mandatory generic advanced-tools control with benefit-oriented progressive disclosure.

## Impact

Series step 3 of 4; requires `restore-workflow-source-binding` and `simplify-workflow-reading-controls`. Step 4 verifies discovery from a plain entry point.
Affected areas: AdvancedTools/AdvancedProfileControls, standalone setup, ScenarioPanel, ArazzoUI perspective controls, useStandaloneScenarios, optional-tool tests and README. Existing developer identifiers and URL formats remain supported; user-facing labels change intentionally. Bundled help may point to known examples, but only an explicit action may load one.
