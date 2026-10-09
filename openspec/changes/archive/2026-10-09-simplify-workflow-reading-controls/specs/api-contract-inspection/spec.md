## MODIFIED Requirements

### Requirement: Reader-oriented contract status and next actions
Contract inspection SHALL explain whether the API description is unchecked, loading, found, missing, ambiguous, unsupported or unavailable in plain language, with an applicable explicit load, retry or reload action when supported. Known API destination identity SHALL remain separate from operation checking. Technical lookup codes, locators and revision/acquisition provenance SHALL remain available in labeled details without dominating normal reading. Host-only configuration advice SHALL identify a host limitation rather than tell ordinary readers to supply a source provider.

#### Scenario: Known API before checking
- **WHEN** the Petstore API destination is known and its description is not loaded
- **THEN** details identify the known API, say that the operation has not been checked, and offer Load API description when the host supports explicit loading

#### Scenario: Error or incomplete lookup
- **WHEN** acquisition fails or only some possible API descriptions have been checked
- **THEN** the reader sees what is unavailable or remains unchecked, the relevant source identity, and available recovery actions without an authoritative unique-operation claim

#### Scenario: Loading unavailable in an embedded host
- **WHEN** the host supplied no source-loading capability
- **THEN** ordinary workflow details remain readable and explain that API-description loading is unavailable in this viewer, while developer configuration information is available separately

#### Scenario: Focus during explicit loading
- **WHEN** a focused API-description loading control becomes disabled during acquisition
- **THEN** focus remains in a stable source context inside the inspector, Escape can dismiss it and return to a valid origin, and late results do not move focus elsewhere
