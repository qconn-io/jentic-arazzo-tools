## MODIFIED Requirements

### Requirement: Shared facts and comprehension evidence
Docs, Sequence, Diagram, and Split SHALL use consistent scoped interaction facts while avoiding repeated full detail sections in the default documentation. Acceptance SHALL include fresh Playwright walkthroughs of the unchanged default Petstore document and all nine existing newer example documents and explicit first-use and workflow-comprehension tasks conducted with an unfamiliar API Owner and Developer; automated navigation success SHALL NOT be reported as measured human comprehension.

#### Scenario: Change view while inspecting
- **WHEN** the reader changes between supported modes while inspecting a scoped interaction
- **THEN** its authored values, target classifications, warnings, and occurrence context remain consistent

#### Scenario: Browser acceptance record
- **WHEN** the change is verified
- **THEN** screenshots and observations record success or failure for explaining the small purchase, locating the capture guard, inspecting second-item mappings, understanding timeout fallback, and reaching boundary content at both viewport widths

#### Scenario: Discover optional functionality without injected setup
- **WHEN** unfamiliar readers start from the plain viewer entry without scenario/profile parameters or implementer coaching
- **THEN** acceptance records whether they can explain guide purpose, locate optional loading help, understand Systems availability and return to ordinary reading, including assistance and incorrect interpretations

#### Scenario: Visual baseline review
- **WHEN** the integrated candidate is inspected at 1440 and 480 pixels
- **THEN** evidence records participant/lane correctness, operation identity, readable controls, view selection, long labels, error states and focus behavior for Petstore and the newer examples, and failed tasks prevent final UX acceptance
