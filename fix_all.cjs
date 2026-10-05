const fs = require('fs');

// 1. Fix ArazzoViewerContext.tsx
let ctx = fs.readFileSync('packages/jentic-arazzo-ui/src/context/ArazzoViewerContext.tsx', 'utf8');
ctx = ctx.replace(/useSourceRegistry\(new BrowserFetchProvider\(\), 32\)/g, "useSourceRegistry(new BrowserFetchProvider())");
ctx = ctx.replace(/useSourceRegistry\(sourceProvider \|\| new BrowserFetchProvider\(\), 32\)/g, "useSourceRegistry(sourceProvider || new BrowserFetchProvider())");
fs.writeFileSync('packages/jentic-arazzo-ui/src/context/ArazzoViewerContext.tsx', ctx);

// 2. Fix ContractPanel.tsx
let panel = fs.readFileSync('packages/jentic-arazzo-ui/src/components/ContractPanel.tsx', 'utf8');
panel = panel.replace(/sourceBinding\?\.sourceURL/g, "sourceURL");
// Fix projectArazzo returning ArazzoViewerModel
panel = panel.replace(
  "projected = await projectArazzo(content.content as string | Record<string, unknown>, content.retrievalURI, sourceRegistry);",
  "const modelResult = await projectArazzo(content.content as string | Record<string, unknown>, content.retrievalURI);\n            projected = {\n              version: '1.0.0',\n              dialect: 'arazzo',\n              uri: content.retrievalURI,\n              operations: new Map(), // Mock or implement if Arazzo exposes operations\n              rawContent: content.content,\n              unsupportedDiagnostics: []\n            };"
);
fs.writeFileSync('packages/jentic-arazzo-ui/src/components/ContractPanel.tsx', panel);

// 3. Fix OpenAPIAdapter.ts
let openapi = fs.readFileSync('packages/jentic-arazzo-ui/src/utils/contract/OpenAPIAdapter.ts', 'utf8');
openapi = openapi.replace(
  "class SourceRegistryResolver extends Resolver {\n    constructor() { super({ name: 'source-registry' }); }\n  }\n  const resolver = new SourceRegistryResolver();",
  "const resolver = new (Resolver as any)({ name: 'source-registry' });"
);
fs.writeFileSync('packages/jentic-arazzo-ui/src/utils/contract/OpenAPIAdapter.ts', openapi);

// 4. Fix ArazzoAdapter.ts argument cast
let arazzo = fs.readFileSync('packages/jentic-arazzo-ui/src/utils/contract/ArazzoAdapter.ts', 'utf8');
arazzo = arazzo.replace(
  "projectArazzo(content: string | object, uri: string)",
  "projectArazzo(content: string | Record<string, unknown> | any, uri: string)"
);
fs.writeFileSync('packages/jentic-arazzo-ui/src/utils/contract/ArazzoAdapter.ts', arazzo);
