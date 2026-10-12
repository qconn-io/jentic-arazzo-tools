## ADDED Requirements

### Requirement: Unsupported inspection keeps the embedded viewer contract
When a document has no supported semantic inspection profile, the viewer SHALL present the authored raw document and the inspection limitation inside the same public sizing and styling boundary used by supported, loading, and error presentations. Supplied host `className` and `style` values SHALL apply to this fallback, and the fallback SHALL remain scrollable without changing the input document or fabricating a sequence, relationship, or source-verification result.

#### Scenario: Styled embedded unsupported document
- **WHEN** a host embeds an unsupported-profile document with a custom class and explicit viewer dimensions
- **THEN** the raw view occupies those dimensions, exposes the custom class, displays the authored document and limitation, and does not escape the host layout

#### Scenario: Supported and unsupported replacement
- **WHEN** the same host replaces a supported document with an unsupported-profile document and then restores a supported one
- **THEN** its public sizing and styling remain effective through all presentations, while semantic diagrams appear only for the supported documents
