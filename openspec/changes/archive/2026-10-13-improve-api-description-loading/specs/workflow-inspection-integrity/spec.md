## MODIFIED Requirements

### Requirement: Secondary acquisition obeys explicit authority
After acquiring the explicitly selected primary document, secondary documents and supported external references SHALL be acquired only through the supplied source authority in an enabled source-loading operation. An explicit reader load action or the configured automatic API-description policy SHALL enable that operation within its declared scope. Automatic API-description loading SHALL authorize only unambiguously identified eligible declared API descriptions and their supported reference dependencies; it SHALL NOT authorize primary-workflow schema expansion, external-Arazzo expansion/navigation, inferred sibling discovery, or additional catalog/revision acquisition. Parsing supplied content SHALL NOT trigger a separate transport or reinterpret that content as a retrieval address. Without such authority or operation, references SHALL remain authored with an inspectable limitation. Denial or failure SHALL NOT trigger fallback acquisition or destroy otherwise readable workflow content. Supported local references SHALL remain inspectable without external acquisition.

#### Scenario: Rejecting authority for an external workflow schema
- **WHEN** an explicitly loaded external Arazzo workflow contains an HTTP input-schema reference and the supplied authority rejects that dependency
- **THEN** only that authority receives the dependency request, no alternate HTTP request occurs, the reference remains available with a contextual explanation, and the workflow remains inspectable

#### Scenario: Primary viewing has no secondary loading action
- **WHEN** a reader opens a primary workflow containing an external schema reference without enabling a source-loading operation for that reference
- **THEN** the primary document is readable and no dependency request occurs merely because a provider is available, including when automatic API-description loading is enabled for separately declared API sources

#### Scenario: Local reusable and schema references
- **WHEN** a supported document uses local reusable declarations or supported local schema references
- **THEN** their declarations and use-site provenance remain inspectable without invoking an external transport

#### Scenario: Automatic contract loading obeys a rejecting provider
- **WHEN** automatic mode attempts a declared API description or supported API reference dependency and the supplied provider rejects it
- **THEN** only that provider receives the request, no independent HTTP/file fallback occurs, the source/reference has a contextual failure or limitation, and ordinary workflow reading remains available

#### Scenario: Supplied revisions remain authoritative
- **WHEN** a catalog or embedded scope supplies a source revision and automatic API-description loading is explicitly enabled for its selected viewer
- **THEN** any requested API bytes honor that supplied authority and pin; automatic loading neither acquires a mutable replacement revision nor broadens catalog enumeration or historic revision comparison
