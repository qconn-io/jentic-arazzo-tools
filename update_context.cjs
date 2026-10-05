const fs = require('fs');
let content = fs.readFileSync('packages/jentic-arazzo-ui/src/context/ArazzoViewerContext.tsx', 'utf8');

content = content.replace(
  "import { buildViewerModel, type ArazzoViewerModel } from '../utils/model/viewerModel';",
  "import { buildViewerModel, type ArazzoViewerModel } from '../utils/model/viewerModel';\nimport { useSourceRegistry } from '../utils/source/useSourceRegistry';\nimport type { SourceRegistry } from '../utils/source/SourceRegistry';\nimport type { SourceDocumentProvider } from '../types/source';"
);

content = content.replace(
  "getNodeOwner: (node: ArazzoNode) => string | undefined;",
  "getNodeOwner: (node: ArazzoNode) => string | undefined;\n  sourceRegistry: SourceRegistry;"
);

content = content.replace(
  "events?: ViewerEvents;",
  "events?: ViewerEvents;\n  sourceProvider?: SourceDocumentProvider;"
);

content = content.replace(
  "function InjectedProvider({",
  "function InjectedProvider({\n  value,\n  children,\n}: {\n  value: ArazzoViewerContextValue;\n  children: React.ReactNode;\n}) {\n  const sourceRegistry = useSourceRegistry(undefined, 32);"
).replace(
  "}: {\n  value: ArazzoViewerContextValue;\n  children: React.ReactNode;\n}) {\n  const snapshot",
  "  const snapshot"
); // fix the duplication

// Instead of the above complex replace for InjectedProvider:
// Wait, InjectedProvider signature is:
// function InjectedProvider({
//   value,
//   children,
// }: {
//   value: ArazzoViewerContextValue;
//   children: React.ReactNode;
// }) {
//   const snapshot = useMemo(

// We can do this:
content = content.replace(
  "  const snapshot = useMemo(",
  "  const sourceRegistry = useSourceRegistry(undefined, 32);\n  const snapshot = useMemo("
);

content = content.replace(
  "getNodeOwner: (node) => ownerLookup(node, model, value.document),",
  "getNodeOwner: (node) => ownerLookup(node, model, value.document),\n        sourceRegistry,"
);

content = content.replace(
  "  events,\n  children,\n}: StandaloneProviderProps) {",
  "  events,\n  sourceProvider,\n  children,\n}: StandaloneProviderProps) {\n  const sourceRegistry = useSourceRegistry(sourceProvider, 32);"
);

content = content.replace(
  "getNodeOwner: (node) => ownerLookup(node, model, rawDocument),",
  "getNodeOwner: (node) => ownerLookup(node, model, rawDocument),\n    sourceRegistry,"
);

fs.writeFileSync('packages/jentic-arazzo-ui/src/context/ArazzoViewerContext.tsx', content);
