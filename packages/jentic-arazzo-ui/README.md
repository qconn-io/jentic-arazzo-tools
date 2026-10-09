# @jentic/arazzo-ui

`@jentic/arazzo-ui` is a UI component for visualizing [Arazzo Specification](https://spec.openapis.org/arazzo/latest.html) workflows.
It provides interactive diagram views, documentation views, and a split view combining both.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-arazzo--ui.jentic.com-blue?style=for-the-badge)](https://arazzo-ui.jentic.com)

<p align="center">
  <a href="https://arazzo-ui.jentic.com">
    <img src="https://raw.githubusercontent.com/jentic/jentic-arazzo-tools/main/assets/arazzo-ui.png" alt="ArazzoUI Screenshot" />
  </a>
</p>

Load any Arazzo Document by appending a `?document=` query parameter:

```
https://arazzo-ui.jentic.com?document=https://arazzo-ui.jentic.com/petstore-order-workflow.arazzo.yaml
```

**Viewer inspection profiles:**

- [Arazzo 1.0.0](https://spec.openapis.org/arazzo/v1.0.0)
- [Arazzo 1.0.1](https://spec.openapis.org/arazzo/v1.0.1)
- Arazzo 1.1.x: selected composition and asynchronous fields, with visible inspection limits (see below). This does not imply full 1.1 parser, validator, or runner support.

## Installation

You can install this package via [npm](https://npmjs.org/) CLI by running the following command:

```sh
npm install @jentic/arazzo-ui
```

**Peer dependencies:** React 18 or 19 ([react](https://www.npmjs.com/package/react) and [react-dom](https://www.npmjs.com/package/react-dom)).

## CLI

Open any Arazzo document in the browser without installing anything locally:

```sh
# from a URL
npx @jentic/arazzo-ui https://arazzo-ui.jentic.com/petstore-order-workflow.arazzo.yaml

# from a local file
npx @jentic/arazzo-ui ./workflow.arazzo.yaml
```

This opens `https://arazzo-ui.jentic.com` with the document pre-loaded.
Local files are passed via the URL fragment (`#document=`), so the document content is never sent to the server.
The resulting URL is also shareable if the workflow size is not too large.

## Components

### ArazzoUI

Headless viewer controlled entirely via props. Use this when you need full control over the surrounding layout and view switching.

```jsx
import { useState } from 'react';
import { ArazzoUI } from '@jentic/arazzo-ui';
import '@jentic/arazzo-ui/styles.css';

function App() {
  const [view, setView] = useState('split');

  return (
    <ArazzoUI
      document="https://example.com/workflow.arazzo.yaml"
      view={view}
      onViewChange={setView}
    />
  );
}
```

### ArazzoUIStandalone

Self-contained viewer with a built-in header including the Jentic logo, a URL input for loading documents, and a view mode toggle. Use this for a drop-in widget that works without any external UI.

```jsx
import { ArazzoUIStandalone } from '@jentic/arazzo-ui/standalone';
import '@jentic/arazzo-ui/styles.css';

function App() {
  return (
    <ArazzoUIStandalone
      document="https://example.com/workflow.arazzo.yaml"
      initialView="docs"
    />
  );
}
```

### UMD (script tag)

Both components are available as UMD builds that bundle all dependencies into a single file and expose an imperative API. Build artifacts are located in `./dist/`:

| File | Description |
|------|-------------|
| `dist/arazzo-ui.js` | ArazzoUI UMD bundle |
| `dist/arazzo-ui-standalone.js` | ArazzoUIStandalone UMD bundle |
| `dist/arazzo-ui.css` | Required stylesheet |

#### ArazzoUI

```html
<link rel="stylesheet" href="dist/arazzo-ui.css" />
<div id="root"></div>
<script src="dist/arazzo-ui.js"></script>
<script>
  const ui = ArazzoUI({
    dom_id: '#root',
    document: 'https://example.com/workflow.arazzo.yaml',
    view: 'split',
  });

  // ui.getRef()   — access the imperative ref API
  // ui.unmount()  — remove the component from the DOM
</script>
```

#### ArazzoUIStandalone

```html
<link rel="stylesheet" href="dist/arazzo-ui.css" />
<div id="root"></div>
<script src="dist/arazzo-ui-standalone.js"></script>
<script>
  const ui = ArazzoUIStandalone({
    dom_id: '#root',
    document: 'https://example.com/workflow.arazzo.yaml',
  });

  // ui.getRef()   — access the imperative ref API
  // ui.unmount()  — remove the component from the DOM
</script>
```

## Document sources

The `document` prop accepts multiple input types:

1. **URL string** — fetches and parses a remote Arazzo document (JSON or YAML)
2. **String content** — parses inline Arazzo JSON or YAML
3. **ArazzoDocument object** — uses the document directly

```jsx
// From URL
<ArazzoUI document="https://example.com/workflow.arazzo.yaml" view="docs" />

// From inline YAML string
<ArazzoUI document={yamlString} view="docs" />

// From object
<ArazzoUI document={arazzoDocumentObject} view="docs" />
```

When the document is a URL, it is displayed below the title in the docs view.

## View modes

The `view` prop (or `initialView` for standalone) controls the display:

| Mode | Description |
|------|-------------|
| `diagram` | Interactive React Flow diagram of workflows |
| `docs` | Documentation view with workflow details, steps, parameters, and actions |
| `split` | Side-by-side diagram and docs |

In split view, clicking a step node in the diagram expands the workflow and scrolls to that step in the docs pane. Switching workflow tabs in the diagram scrolls to the corresponding workflow in docs.

## Chained workflow inspection

The **All workflows** button and **Select workflow** menu are visible above the
panes in Docs, Diagram, and Split modes. Start in the default Docs view, select
All workflows to see classified incoming and outgoing relationships, filter by
Call, Prerequisite, One-way goto, or Retry recovery, then open a workflow entry. Its header offers Documentation, Sequence, and Flowchart.
All workflows returns to the document overview; Sequence shows the selected
workflow's authored interactions. Changing view mode retains the destination.

The overview shows prerequisites, workflow calls, and understood
success/failure transitions, including parallel relationships and loops. Select a
workflow card to open its steps; prerequisite links navigate to local workflow or
step destinations. External and missing targets remain visible with their status
and do not navigate to a guessed local target. Source-description documents are
not fetched for inspection, so OpenAPI/AsyncAPI source content and versions remain
unverified.

An omitted `activeWorkflowId` starts with the first workflow and lets the viewer
manage navigation. Explicit `null` selects the overview. In controlled mode,
`onWorkflowSelect` reports a workflow ID, or **`''` for All workflows**; map the
empty string back to `null` when updating the prop. Prop updates do not emit an
additional selection callback. Setting `selectedNodeId` to `null` clears a
controlled node selection; `clearSelection()` clears an uncontrolled selection.

In **Sequence**, direct local calls initially show their downstream interactions.
Use **Expand** on a deeper call; each call occurrence has its own expansion and
mapping context. **Collapse** retains the selected root workflow. Workflow lanes
show control context, API lanes show declared sources, and ambiguous destinations
remain separate. Large canvases scroll at a readable text size, with participant
headings retained at the top. Focus a shortened participant name to read its full
value. The selected root and caller path stay outside the scrolling canvas.
Operation, action, and boundary controls identify their role and call occurrence.

Choose **Details** in the ordered interaction list or on a diagram card to inspect
owning workflow/caller context, parameters, request or message payload trees,
outputs, success criteria, prerequisites, and possible recovery actions. Caller
mappings and callee declarations are separate. Recovery cards show target
classification, inherited/overridden origin, criteria, and authored retry settings;
inspection order does not evaluate or choose actions. Recognized event receive
fields include exact correlation and timeout declarations.

Values remain authored: `0`, `false`, `null`, empty containers/strings, and
expressions are not evaluated. Scalar type labels distinguish a string from a
number or boolean; expressions remain selectable in full. **Not declared** means
absence. **Advanced authored content and provenance** retains original snapshots,
resolved inspection facts, unresolved references, and diagnostics. Default Docs
keeps concise step descriptions and shared inspection controls; exported Markdown
retains full values and provenance.

Use **Search workflows and steps** for document-local, case-insensitive matches
on authored IDs, titles, summaries/descriptions, and operation locators. Results
show the owning workflow and authored step, including steps beyond sequence display
limits. Searching a repeated callee step opens its authored location rather than
guessing a caller occurrence. Payloads and parameter values are not searched.

**Escape** and **Close details** dismiss inspection and restore focus to the
initiating control; if it is unavailable, focus returns to visible workflow
navigation. Desktop inspection is nonmodal. At widths of 600 pixels or below,
inspection is a covering dialog: Tab/Shift+Tab stay inside it and background
controls are unavailable until dismissal. The standalone header wraps on narrow
screens; diagrams scroll inside their pane.

**Open workflow** follows a particular call. The caller path and **Back to caller**
restore that occurrence, its expansion context and step focus across Docs,
Diagram and Split. Inline expansion keeps the current root. Unrelated navigation
and replacement documents clear stale caller paths.

Sequences are schematic authored interactions, not execution traces. A structural
continuation describes call control flow; it does not assert success or an API
response. Goto is a possible one-way transfer, retry recovery returns to its source
step, and prerequisites describe dependence. Recursion on the current path, eight
nested call levels and a 200-row display budget stop expansion at visible markers.
Open the indicated local workflow to inspect it as a new root. Row-limit markers
offer **View complete documentation** to reach interactions omitted from the canvas. External and missing
calls retain their classification and cannot expand unavailable content.

The compact **Inspection status** control explains that source documents were not
fetched and operations were not checked, without implying invalidity or
inaccessibility. It names detected resolution limitations individually, including
unsupported `$self`, unavailable base URI and unsupported schema dialects, and
explains when references remain authored. It introduces no additional resolver
support. Local understood calls remain available. Descriptions and extensions,
including `x-internal-processing`, do not imply workflow relationships.

Static Mermaid sequences use the same bounded scene with deterministic direct-call
expansion. They show call groups, structural continuations and visible omissions,
and do not have interactive expansion controls. Default flowcharts keep parameters
and criteria out of labels; full values remain in the shared inspector and exported documentation.

```tsx
import { useState } from 'react';
import { ArazzoUI, type ArazzoDocument } from '@jentic/arazzo-ui';
import '@jentic/arazzo-ui/styles.css';

function Overview({ document }: { document: ArazzoDocument }) {
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);

  return (
    <>
      <button onClick={() => setNodeId(null)}>Clear selection</button>
      <ArazzoUI
        document={document}
        view="split"
        activeWorkflowId={workflowId}
        selectedNodeId={nodeId}
        onWorkflowSelect={(id) => {
          setWorkflowId(id === '' ? null : id);
          setNodeId(null);
        }}
        onNodeSelect={(id) => setNodeId(id)}
        onEdgeSelect={(_id, edge) => {
          if (edge.data?.type === 'relationship') {
            console.log(edge.data.kind, edge.data.label, edge.data.warning);
          }
        }}
      />
    </>
  );
}
```

`onEdgeSelect` includes the additive `relationship` variant in `ArazzoEdgeType`
and `ArazzoEdgeData`, also exported as `RelationshipEdgeData` from both package
entry points. Its public fields are `type`, `kind` (`prerequisite`, `call`, or
`action`), `label`, and optional `warning`, `channel`, and `actionType`. Consumers
with exhaustive edge-data switches need to handle this variant. The callback
signature is unchanged; private inspection models and routing data are excluded
from relationship callback data.

The 1.1 inspection profile includes step prerequisites, action parameters and
reusable value overrides, querystring values, and authored asynchronous
`send`/`receive`, `channelPath`, `timeout`, and `correlationId` metadata. Expressions
and criteria are displayed without evaluation. Parseable unknown major/minor
versions use raw inspection, without guessed relationship or Mermaid semantics;
unrepresentable documents show a parsing error. Inspection does not certify schema
validation or execution.

Actions are labeled **viewer inspection order**: step actions in authored order,
then unmatched workflow defaults in authored order. Matching uses name and type
within the same success/failure channel. This is a display policy. The current
runner replaces a workflow action list with the step list when one is declared;
the viewer neither changes that behavior nor predicts which actions will run.

Reference expansion uses the installed resolver where supported. Missing reusable
components retain their authored content with warnings. When base URI metadata is
unavailable, or authored `$self`/custom schema dialect semantics are unsupported,
the entire expansion phase is bypassed with a limitation diagnostic and authored
references are preserved. `getDocument()` returns the restored document without
viewer-generated tracking IDs; it is not a validation result.

## Props

### ArazzoUIProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `document` | `ArazzoDocument \| string` | *required* | Arazzo document, URL, or inline content |
| `view` | `'diagram' \| 'docs' \| 'split'` | `'docs'` | Active view mode |
| `activeWorkflowId` | `string \| null` | first workflow | Omit for uncontrolled first-workflow selection; `null` selects All workflows |
| `selectedNodeId` | `string \| null` | `null` | Controlled diagram node selection; `null` clears it |
| `className` | `string` | — | CSS class for the root element |
| `style` | `CSSProperties` | — | Inline styles for the root element |
| `onNodeSelect` | `(nodeId, node) => void` | — | Called when a diagram node is clicked |
| `onEdgeSelect` | `(edgeId, edge) => void` | — | Called with a public edge, including relationship data |
| `onWorkflowSelect` | `(workflowId) => void` | — | Called on workflow navigation; `''` represents All workflows |
| `onViewChange` | `(view) => void` | — | Called when the view mode changes |

### ArazzoUIStandaloneProps

Inherits all `ArazzoUIProps` except `view`, plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialView` | `'diagram' \| 'docs' \| 'split'` | `'docs'` | Initial view mode (managed internally) |

## Ref API

Both components expose an imperative API via React ref:

```jsx
const ref = useRef(null);

<ArazzoUI ref={ref} document={doc} view="diagram" />

// Later:
ref.current.fitView();
ref.current.setZoom(1.5);
ref.current.setActiveWorkflow('myWorkflow');
ref.current.selectStep('step1');
ref.current.clearSelection();
ref.current.getDocument();
ref.current.getActiveWorkflowId();
ref.current.getSelectedStepId();
```

### Workflow locations and shareable links

Standalone **Copy link** preserves the document, overview or root workflow, global view,
Docs/Sequence/Flowchart subview, and exact scoped step or action occurrence. It also appears
inside the details panel on narrow screens. A second call to the same workflow keeps its
own ordered caller path; links never choose the first matching step as a substitute.
A standalone location's view takes precedence over `initialView`. Initial hydration replaces the current history entry. Committed document, workflow, view,
and inspection changes push entries; Back/Forward restore them without pushing again.
Search typing and hover do not change history. Caller return addresses are kept as public
authored locations in session history; links omit private caller frames and expansion maps.

URL-loaded documents are addressable. Pasted/uploaded documents need a persistent URL or a
host-supplied `documentIdentity` that the host can resolve on the next visit. Copy link
explains this when no source is available. Existing `?document=` and `#document=` inputs
still load; generated share URLs omit inline content and preserve unrelated query/hash
fields. Uploaded contents may remain in local browser history for Back/Forward, but are
never serialized into location links. Unaddressable content uses a session-only local identity and location in history state, allowing Back/Forward without claiming cross-session shareability.

Both ESM entry points export `WorkflowLocation`, its selection/call/action types,
`WorkflowLocationStatus`, and the `encodeLocation`, `decodeLocation`, `readLocationURL`,
`writeLocationURL`, `authoredDigest`, and `createLocationAdapter` helpers. The imperative
UMD configuration accepts the same optional location props.

```tsx
import { ArazzoUI, type WorkflowLocation } from '@jentic/arazzo-ui';

const destination: WorkflowLocation = {
  version: 1,
  document: 'https://example.com/workflows.arazzo.yaml',
  root: 'batch-fulfilment',
  view: 'docs',
  subview: 'sequence',
  selection: {
    kind: 'step',
    workflowId: 'fulfil-item',
    stepId: 'prepare',
    occurrence: [{ workflowId: 'batch-fulfilment', stepId: 'second-item' }],
  },
};

<ArazzoUI document={destination.document} defaultLocation={destination} />;
```

Use `defaultLocation` for initial navigation, or `location` with `onLocationChange` to
control navigation. An authored-step selection omits `occurrence`; an empty array selects
the root occurrence. Action selections include `kind: 'action'` and an `action` address
with declaration `document`/JSON `pointer`, authored `usePointer`, channel, declaration
index, and optional name. A reusable component declaration has index zero; its use pointer
distinguishes references to the same declaration at different authored sites. These are
not effective merged action indices or generated sequence row IDs.

Explicit `activeWorkflowId`, `selectedNodeId`, and `view` props take precedence when they
conflict with a location. `onLocationStatus` reports the conflict without overriding the
host. A controlled location emits a navigation request once and remains authoritative
until the host accepts it. Headless viewers do not write browser history. A location for
another document reports `state: 'document-request'` with the requested location; the host
must supply its document and matching identity, retaining the requested location. The
viewer does not automatically fetch cross-document location targets.

The canonical retrieval URI identifies URL sources. `documentIdentity` supplies a stable
host identity for inline objects; `documentRevision` can identify an immutable host
revision. Standalone links include a SHA-256 digest of canonically serialized **authored**
content (sorted object keys, ordered arrays, preserved scalar types). Formatting and key
ordering changes do not change the digest. A digest detects changed content; it does not
pin old remote bytes, authenticate a source, or reconstruct historical content. Missing or
changed revisions retain a valid root and explain the mismatch before selecting content.
Digest generation requires browser Web Crypto in a secure context.

The codec strictly validates version-one fields and limits decoded JSON to 16 KiB,
occurrence paths to 32 call sites, and optional JSON state nesting to 32 levels. Restoration
still obeys eight nested call levels, recursion markers, and the 200-row scene budget.
Beyond those limits the boundary remains visible and authored details remain accessible;
complete documentation or opening a callee as a new root uses the existing controls.
Malformed locations, missing steps/call sites, and unsupported profiles explain the
unavailable destination instead of silently selecting another occurrence.

Optional `extensions` use names such as `example.guide` and contain JSON data only. Supply
`locationAdapters={[createLocationAdapter(namespace, typeGuard, restore)]}` to register
typed optional state. Unavailable/invalid adapters are ignored with a notice while their
JSON is retained for sharing. Adapters restore presentation state; hosts should keep
credentials and evaluated values out of extensions and never evaluate extension strings.
Extensions cannot replace document, root, or occurrence identity.

## API Contract Inspection

Select a step to inspect its authored source binding in **Contract & Source**. Selecting a step does not fetch a contract: use **Load source <name>** to request a declared source and **Reload source <name>** to refresh it. Standalone viewing supplies a browser fetch provider; embedded viewing uses the optional `sourceProvider` supplied by the host. Browser fetches omit credentials and remain subject to browser CORS rules.

Supported inspection profiles are OpenAPI 3.0/3.1 and AsyncAPI 3. OpenAPI details retain parameters, request bodies, response alternatives, examples and effective security. AsyncAPI details retain send/receive direction, channel, messages, payloads, headers, correlation information and bindings. AsyncAPI 2 and Swagger 2 are reported as unsupported. Inspection displays authored contract facts; it does not execute requests, validate runtime values, select a successful response, or infer message delivery guarantees.

A source can be not loaded, loading, located, missing, ambiguous, unsupported, failed, or limited by an acquisition budget. **Located** means the locator identifies a unique operation in the retrieved document; it is not a validation result. Retrieval URI, revision when supplied, and provider generation identify the acquired source. Relative source URLs and references require a document base URI. Inline content without a base reports that limitation instead of resolving against the viewer page.

Schemas retain their authored references and sibling constraints. **Referenced schema declarations** shows targets separately, including their retrieval URI, revision when supplied, and reference limitations. Inspection does not flatten schemas or combine constraints. Recursive links remain finite; unsupported schema dialects, resource identifiers and anchors retain their authored content with an explanation.

Reload refreshes the selected source and its reference dependencies, including failed dependencies. Other loaded sources that depend on invalidated entries return to not loaded and require an explicit Load source action; unrelated sources stay available. Cancelled or obsolete projections cannot publish their old facts.

The registry shares source acquisitions within a viewer and limits them to four concurrent requests, 32 documents, eight reference levels, and 10 MiB per document. Provider replacement and document replacement invalidate the source scope and abort pending acquisitions. These bounds protect inspection work; a host should also bound its own network response reading.

Hosts can supply already available documents without adding network access:

```tsx
import { ArazzoUI, type SourceDocumentProvider } from '@jentic/arazzo-ui';

const sourceProvider: SourceDocumentProvider = {
  async load({ uri, signal }) {
    signal?.throwIfAborted();
    const content = contracts.get(uri);
    if (!content) throw new Error(`Unavailable source: ${uri}`);
    return { content, retrievalURI: uri, revision: 'catalog-v1' };
  },
};

<ArazzoUI
  document={workflowDocument}
  sourceProvider={sourceProvider}
  onExternalNavigation={({ documentUri, workflowId }) => {
    openWorkflowInHost(documentUri, workflowId);
  }}
/>;
```

A loaded Arazzo source exposes the referenced external workflow. **Open workflow <id>** issues `onExternalNavigation` with the retrieved document URI, revision and workflow ID, allowing the host to choose how to open it. It does not silently switch the current document or treat external workflow steps as local operations.

### Optional Systems perspective

Hosts can supply `viewProfile` (version 1) and select `perspective="systems"`, or let readers use the optional Perspective setting. `onPerspectiveChange` supports a controlled host. Existing `ViewerMode` and `DiagramType` unions and default workflow views remain unchanged. With no profile, standard views do not interpret presentation extensions.

Profiles bind explicit business participants, workflow/step actors, API source owners, descriptive operation implementations, and declared event endpoints to one document identity and optional revision. Every binding retains an authored field location or host provenance. Organizational ownership is separate optional catalog data. Invalid/stale/conflicting references remain diagnostic; missing identities become Unknown participants while authored interactions remain inspectable.

Use `viewProfileAdapter="digital-product"` or the exported `digitalProductProfile(document, identity, revision)` **explicitly** for the example schema. It translates `x-example-participants`, step actor/target/implementation metadata, and the example convention that source names matching declared participant keys identify source owners. It does not infer actors from workflow names or prose. Descriptive implementation mappings remain authored metadata, not evaluated values or additional API requests. The event example's [explicit profile](public/examples/digital-product-stress/systems-profile.json) declares four producer/consumer associations; its relative URIs must be resolved against the example document by the host before supplying it. The development app accepts `?profile=digital-product` or `?systemsProfile=<profile-url>` as explicit configuration; these are not automatic extension discovery.

The diagram distinguishes requests and declared send/receive direction, descriptive implementation groups, standard workflow control, and display-limit markers. Helper calls start collapsed. Depth eight and 200 rows include association expansion. Keyboard list controls expose every visible interaction, expand/collapse, and exact workflow navigation; contained canvas scrolling supports narrow screens. The existing inspector retains full authored content, correlation expressions, receive timeouts and contract details.

Selected mappings and explicit prerequisites are inspectable without expression evaluation. Exact supported `$steps.<id>.outputs.<name>` references offer producer navigation within the owning workflow and standard call path. Other expressions stay exact authored text. Repeated call mappings retain their caller context; numeric values displayed in caller mappings are authored literals, not computed transaction amounts.

Response alternatives and declared event relationship details are opt-in inspector layers. Event links require an explicit association and loaded, matching resolved channel/message identities, including any pinned revision. Similar names or identical payloads do not establish a link. Neither send/receive arrows nor association links assert delivery, subscription, correlation success, execution order, or an observed response. Explicit source loading is still required. The inspector and Systems share current loaded projections; provider/document replacement and dependency reload invalidate obsolete facts.

The `jentic.systems` workflow-location extension preserves the system root, semantic interaction address, association path and expanded/collapsed controls. Exact workflow navigation uses the existing standard occurrence address; returning restores the separate system context. Hosts must supply the same profile to restore its descriptive associations. System state does not widen legacy location view/subview unions or mutate authored documents.

### Authored scenario guides

Supply `scenarioManifest` to the headless viewer, or load an explicit manifest URL with the
standalone **Scenario manifest URL** control or `?scenarios=<manifest URL>`. The viewer never
searches sibling files for guides. Guide text is labeled as **authored expectations**: opening
or visiting a waypoint does not execute an operation, evaluate an expression, or measure a
scenario result.

Legacy arrays of `{ id, document, workflow, expected, evidence }` remain supported. Their text
is preserved; entries without waypoints open only the declared workflow and disclose that no
precise reading path was authored. A versioned manifest can add titles, assumptions, tags and
explicit ordered waypoints:

```json
{
  "version": 1,
  "id": "payment-guides",
  "revision": "1",
  "scenarios": [
    {
      "id": "unknown-capture",
      "document": "arazzo.yaml",
      "workflow": "capture-authorized-payment",
      "expected": "Reconcile UNKNOWN before retrying the original capture; require CAPTURED evidence.",
      "evidence": "Authored inspection only; no live execution trace.",
      "assumptions": "Assume an uncertain response for the original purchase key.",
      "tags": ["payment", "uncertain"],
      "waypoints": [
        {
          "id": "capture-evidence",
          "narrative": "Inspect the authored CAPTURED criterion and identity checks.",
          "location": {
            "version": 1,
            "document": "arazzo.yaml",
            "root": "capture-authorized-payment",
            "view": "docs",
            "subview": "sequence",
            "selection": {
              "kind": "step",
              "workflowId": "capture-authorized-payment",
              "stepId": "capture-payment"
            }
          },
          "focus": { "kind": "criterion", "pointer": "/workflows/7/steps/0/successCriteria" }
        }
      ]
    }
  ]
}
```

This pointer matches the supplied stress fixture; update it when the authored document changes.
Relative scenario, waypoint and action document references resolve against `scenarioManifestURI`
(the manifest retrieval URI), never an inferred sibling directory. Supplied manifests with relative
references therefore require that prop. A headless host can instead use stable absolute identities
such as `host:payment` and map requested identities to its own documents.

A waypoint uses the existing `WorkflowLocation` contract: authored workflow/step identity, an
optional exact call occurrence, and declaration/use-site addresses for an action. Optional focus
kinds are `parameter`, `payload`, `output`, `criterion` and `action`; their JSON Pointers address
actual authored content in the selected step, its call ancestry, applicable action declaration,
or workflow outputs. The inspector presents that content without choosing a branch. Keep waypoint
IDs stable when revising a manifest. Do not use generated row IDs or screen positions as addresses.

`scenarioSelection`, `onScenarioSelectionChange`, and `onScenarioLocationRequest(location, focus)`
provide optional embedding controls. `undefined` selection uses viewer-owned state; a supplied
selection (including `null`) is controlled by the host. The callback is a reading/navigation
request. For another document the headless host must supply `document` and `documentIdentity`
(and `documentRevision` when applicable); the viewer reports a localized document-request
status while waiting. Standalone acquires only explicitly addressed documents through its source
provider and cancels obsolete requests on replacement or leaving the guide.

Standalone links use the `arazzo.scenario` location extension with manifest identity, retrieval
URI/revision, scenario ID and optional waypoint ID. A reproducible guide link needs an addressable
HTTP(S) manifest and addressable documents. Inline-only manifests remain usable but cannot be
reconstructed in a fresh session. Manifest revision and document revision/digest checks are
independent. Unavailable manifests, stale IDs, removed actions/focus pointers and display-limit
locations retain their narratives and show diagnostics; they never become failed test results or
fall back to a namesake step. Invalid entries are localized. At most 500 scenarios and 100
waypoints per scenario are displayed, with visible explanations for truncation.

The [stress manifest](./public/examples/digital-product-stress/scenarios.json) contains 27 guides,
and the [small-pack manifest](./public/examples/digital-product/scenarios.json) contains its seven
documented failure cases. Their walkthrough records are browser inspection evidence, not observed
business outcomes or execution coverage.

## Supplied workflow capability catalogs

The optional `ArazzoCatalog` export (also available from the ESM-only `@jentic/arazzo-ui/catalog` subpath) discovers
workflows across explicitly supplied document revisions. It accepts a version-one
`WorkflowCatalogManifest`, an optional `manifestURI` for relative sources, a
`SourceDocumentProvider`, and controlled `selection`/`onSelectionChange` callbacks.
It does not write browser history. `onLocationChange` reports authored viewer addresses;
`onCoverageChange` reports the acquired scope. The ordinary `ArazzoUI` viewer requires no catalog.

```tsx
import { ArazzoCatalog, type WorkflowCatalogManifest } from '@jentic/arazzo-ui/catalog';

const manifest: WorkflowCatalogManifest = {
  version: 1,
  id: 'shop',
  revision: 'portfolio-2026-10',
  capabilities: [{ id: 'purchase', name: 'Purchase' }],
  owners: [{ id: 'payments-team', name: 'Payments team' }],
  documents: [{
    id: 'commerce',
    revision: 'commerce-v3',
    uri: 'https://example.test/commerce.arazzo.yaml',
    // expectedDigest: 'sha256:<64 lowercase hexadecimal characters>',
    workflows: [{ workflowId: 'purchase', role: 'entry',
      capabilities: ['purchase'], owner: 'payments-team' }],
  }],
};
// provider must return revision 'commerce-v3' when no expectedDigest is supplied.
<ArazzoCatalog manifest={manifest} sourceProvider={provider} />;
```

The manifest author supplies product, capability, team owner, lifecycle, tags, API labels,
system associations, and `entry`/`helper`/`diagnostic` roles. Missing roles, ownership and
lifecycle stay unknown. A system participant never becomes a responsible team. Optional
`viewProfile` and `scenarioManifest` objects reuse the existing presentation contracts.
`associations` are explicit descriptive links; they do not become standard workflow calls.
Unknown label references, duplicate document/revision identities, and duplicate workflow
metadata within a revision are rejected. Metadata referring to an absent authored workflow
fails that revision's indexing.

Each document identifies a logical `id`, immutable `revision`, and `uri`, with optional
inline `content`, `kind` (`arazzo`, `openapi`, `asyncapi`) and `expectedDigest`. An inline
revision is an explicit host assertion. URI acquisition needs either provider-returned
matching revision evidence or an expected digest; URI alone is not a pin. Digests use
`authoredDigest` on the **parsed JSON object with sorted object keys**, not file bytes.
A digest mismatch excludes that revision from the index and shows failed coverage.
Catalog revision IDs also need immutable host publication practices; the browser cannot
prove that an author never reused an ID.

Relative document URIs resolve against the manifest URI; source descriptions resolve against
the acquired workflow URI. Multiple supplied revisions at the same source URI require an
explicit `sources` binding, such as `{ payment: { documentId: 'payment-api', revision: 'v2' } }`.
Referenced sources are retrieved through the same provider/registry. Unlisted source contract
snapshots get digest identities. External workflow navigation uses supplied scoped identities.
No business API requests are made; catalog browsing only acquires specification content.

Direct API uses are counted once per authored step. Located operation identities include the
source contract URI, revision and operation pointer; unresolved/ambiguous locators remain
candidates. Calls, prerequisites, goto, retry and descriptive associations retain their
classes. Entry-point paths are bounded authored reachability, and may include conditional
transfers or prerequisite relationships; they establish no execution, compatibility, or
business outcome. Repeated call sites retain separate paths while reachable entry identities
are deduplicated. Cycles stop at repeated identities. Path inspection is limited to 100 paths,
32 relationships per path and 10,000 visits.

A catalog generation allows at most 100 acquired document revisions (including source
contracts), four concurrent physical acquisitions, 64 MiB aggregate acquired content,
10 MiB per source, eight reference hops, and 10,000 authored workflow steps. Bounds and
acquisition/projection failures remain visible as incomplete coverage. Manifest/provider
replacement cancels the old generation; entry selection retains the portfolio index.
Coverage only describes the supplied scope, never an organization or ecosystem. Empty
results with partial coverage cannot establish that no consumers exist.

Standalone accepts `catalog={manifestOrURI}` or `?catalog=<manifest URI>`. Shared entry links
retain the catalog URI and use the `jentic.catalog` location extension for catalog revision
and logical document identity, together with the existing workflow revision/address.
Fresh sessions either restore the exact revision/workflow or show an explicit unavailable
revision message. Standalone owns its browser history; controlled `catalogSelection` and
`onCatalogSelectionChange` let hosts own selection without history writes. Existing
single-document links remain compatible.

The supplied example is `public/examples/catalog.json`: nine audited Arazzo documents,
nine pinned contracts, declared capabilities and roles, intentional diagnostic labels,
and unknown organizational ownership. Open `?catalog=./examples/catalog.json` in the
standalone app. Regenerate its digests from the package directory with
`node scripts/generate-sample-catalog.mjs` after intentionally changing example documents.
The deliberately missing diagnostic source keeps sample coverage partial.

### Immutable workflow revision review

`ArazzoWorkflowReview` is an optional ESM React export, independent of normal viewer
selection/history. Import `@jentic/arazzo-ui/styles.css` alongside the component.
Hosts supply two `WorkflowReviewSnapshot` objects with version `1`, the same logical
catalog `id`, distinct catalog revisions, and documents with scoped logical IDs,
revision identities, absolute URIs and immutable authored contents. Pin contracts with supplied
`content`, optionally verified using `expectedDigest` from `authoredDigest`. Supply exact
source-name revision bindings through each workflow document's `sources` map.
A URI by itself never substitutes current bytes for a missing historical revision.
Missing contracts and unsupported inspection profiles retain coverage warnings; available
raw authored declarations remain readable. Invalid or colliding identities prevent results.

```tsx
import { ArazzoWorkflowReview, compareWorkflowRevisions, exportWorkflowReview } from '@jentic/arazzo-ui';
import '@jentic/arazzo-ui/styles.css';

// baseline and candidate are immutable supplied WorkflowReviewSnapshot values.
<ArazzoWorkflowReview baseline={baseline} candidate={candidate}
  onLocationRequest={(side, location) => inspectRevision(side, location)} />;
const review = await compareWorkflowRevisions(baseline, candidate);
const json = exportWorkflowReview(review, 'json');
const markdown = exportWorkflowReview(review, 'markdown');
```

Workflow and step matching uses scoped IDs. Renames produce removal/addition unless
`options.matches` supplies a validated one-to-one before/after address map. Workflow
matches also scope step matches; implicit ID matches cannot collide with explicit matches.
Object key order and serialization whitespace do not create findings. Array order,
exact expressions and falsy values remain significant. Shared inherited action declarations
count once, with revision-owned effective uses attached as provenance.

Impact uses each snapshot's catalog separately. Direct uses and potential entry paths retain
`call`, `prerequisite`, `goto`, `retry`, `descriptive` and API labels. Schema and other authored
contract references are followed only through supplied contents; inherited parameter,
server and security declarations respect operation overrides. Step-specific transfers remain
scoped during traversal. Defaults/caps are 10,000 visited catalog relationships, 100 displayed
paths and depth 32 per finding/side; positive lower bounds can be supplied in `options`.
Cycles and truncation are visible. Contract-reference provenance inspection is also finite
(10,000 declaration visits/depth 32 per operation), with incomplete traversal disclosed.
Absent or unsupported sources mean partial knowledge, not absence of consumers.

Before/after values use the shared readable value renderer, and each location opens its own
revision's existing viewer and pinned source inspector. Removed baseline content stays
inspectable. JSON and Markdown exports contain identities/digests, authored differences,
locations, relationship classes and coverage/limit records. Markdown also includes complete
machine-readable review data. Exports contain supplied authored values, which hosts should
review before sharing; private provider/session configuration is not included.
Viewing/exporting creates no approval or test status. Runtime effect stays **undetermined**;
reviewers retain responsibility for compatibility and business judgment.

Synthetic purchase/event, partial and formatting-only pairs live in
`public/examples/revision-review`. The longer archival walkthrough remains runnable with
`node scripts/build-review-browser.mjs` after `npm run build`, a static `build` server at port
3000, and `npx playwright test test/e2e/review.spec.ts`. Its generated evidence goes to ignored
`test-output/browser/archival/review`.

For maintained production acceptance, from a clean checkout run `nvm use`, `npm ci`,
`npm run build:es`, and `npx playwright install chromium`.
Then run `npm run test:browser -w @jentic/arazzo-ui`.
The command sequentially builds standalone and a packed package installed into a real
downstream ESM app, identifies current source/fixture/artifact bytes, and starts its own
UTF-8 static server on a fresh port. Playwright rejects an existing server. No development
server is required. The compact suite runs at 1440 and 480 pixels and covers explicit
loading/provider denial, repeated calls and unknown actors, operation entry paths,
scenario keyboard dismissal/restoration, and scoped before/after potential impact.
It checks browser errors, implicit dependencies, business requests, host history and width.

Evidence, traces, reports and current build identities live under ignored
`test-output/browser`; the installed consumer metadata lives under ignored
`test-output/package-consumer`. These runs do not write into active or archived OpenSpec
changes. CI runs package/export acceptance and production Chromium in separate bounded
jobs while retaining the existing monorepo test timeout.

After a successful current browser run, `npm run test:browser:negative -w @jentic/arazzo-ui`
must return a failing exit code. It deliberately serves a broken fixture title to the
ordinary installed-consumer assertion; tracked files and generated build bytes stay intact.
Rerunning `npm run test:browser -w @jentic/arazzo-ui` restores the positive gate.

### Maintained package acceptance

Use the repository's `.nvmrc` (`nvm use`) before npm commands. From a clean install,
`npm run test:package -w @jentic/arazzo-ui` builds the parser/resolver ESM and
declarations, builds the UI, checks the rolled declarations, and packs and installs
all three packages into an independent downstream application. It checks the
main and standalone ESM exports, both browser UMD globals, the stylesheet, and the
typed ESM-only `@jentic/arazzo-ui/catalog` path. Public location/provider/scenario,
profile, catalog, review and selection callbacks compile with strict checking;
private inspection/model imports are expected to fail. No UI source alias is used.
The generated declarations are checked with `skipLibCheck: false`.
The measurement host pins the SpecLynx family to the repository lockfile's
versions for comparable bundle measurements; those pins are recorded in
`metadata.json`. The same acceptance command also creates two separate fresh
installed hosts without SpecLynx overrides, exercising supplied-object and YAML
catalog inputs against the advertised ranges. Aligning the generic YAML adapter
range with the existing ApiDOM family ranges repairs the previously reproduced
mixed-version browser parsing failure. Fresh coverage, exact resolved locks,
tarball identities and caught exception chains are preserved under
`test-output/package-consumer-unpinned*/evidence-*.json`. Failed projection fails
the gate. Run `node packages/jentic-arazzo-ui/scripts/check-unpinned-consumer.mjs`
after packing to repeat the object check independently, or add `--yaml-input`.

`npm run test:package:built -w @jentic/arazzo-ui` runs the same acceptance against
already generated artifacts without rebuilding them. Production browser
acceptance uses this after its sequential builds. Installed artifacts and reports
are ignored under `test-output/package-consumer/`: `app/` is the production ESM
host, `umd/` contains packed browser entry consumers, and `metadata.json` records
source HEAD, tarball SHA-256 identities, installed versions and consumer reports.
The installed host is built from `test/package/acceptance-app.tsx`; its imports
resolve through the unpacked package's export map.

After package acceptance, `npm run test:bundle -w @jentic/arazzo-ui` compares the
minimal embedded viewer with pinned upstream commit
`49dd8ef814637b481c0a1998f586ce2785812f5d`. It uses a temporary detached upstream
worktree and the same installed dependency graph, React, Vite settings and
minification. The source branch/history is preserved and the temporary worktree
is removed. `bundle-comparison.json` reports initial and deferred JS gzip sums,
separate CSS, retained implementation symbols/module contributions, and whole
ESM/UMD file sizes. These are different measurements: whole library bytes are
not the initial download of a tree-shaken host. Minimal viewer, direct standalone
and deferred standalone workloads are identical in both runs. Baseline has no
catalog/review; the repaired catalog/review workload is measured additionally.
The maintained minimal consumer fails if unused catalog/review implementation
survives tree shaking. Shared inspection and rendering costs remain included.
