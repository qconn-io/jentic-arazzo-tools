const fs = require('fs');
let content = fs.readFileSync('packages/jentic-arazzo-ui/src/components/ContractPanel.tsx', 'utf8');

content = content.replace(
  "const sourceBinding = step?.sourceBinding;",
  "const sourceBinding = step?.sourceBinding;\n  const sourceURL = model.document.sourceDescriptions?.find(s => s.name === sourceBinding?.sourceName)?.url;"
);

content = content.replace(/sourceBinding\?.sourceURL/g, "sourceURL");
content = content.replace(/sourceBinding\.sourceURL/g, "sourceURL");

// Fix projectOpenAPI arguments etc.
// They want 3-4 arguments: (content: string | object, uri: string, ... )
// Let's check OpenAPIAdapter.ts to see what it wants.
