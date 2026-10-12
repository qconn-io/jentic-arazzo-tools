## Why

The chained-workflow viewer can omit workflow-level parameters from the step where they apply and can treat an explicit locator as a declared destination even when its source kind cannot support that locator. Both cases make selected Arazzo 1.1 inspection less trustworthy despite retaining the authored document.

## What Changes

- Show each step's applicable workflow and step parameters together, with step overrides and authored provenance preserved, across interaction details, documentation, and relationship mappings.
- Classify an explicitly named source against the locator's role before presenting it as a supported declared destination. Keep the locator and source declaration inspectable when their kinds conflict.
- Add focused regression cases for both behaviors and remove the six archived verification-log EOF whitespace errors reported by `git diff --check main...HEAD`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chained-workflow-visualization`: Clarify applicable parameter display and source-kind mismatch behavior under existing inspection and semantic-parity requirements.

## Impact

The UI's shared inspection and viewer model, sequence and selected-step details, documentation, relationship parameter summaries, and focused tests are affected. Existing package entry points, authored document retrieval, source acquisition authority, and Arazzo execution behavior remain unchanged. The archived log cleanup changes evidence-file whitespace only.
