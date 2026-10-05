const fs = require('fs');
let content = fs.readFileSync('packages/jentic-arazzo-ui/src/components/ContractPanel.tsx', 'utf8');

content = content.replace(
  "projectAsyncAPI(content.content, content.retrievalURI, sourceRegistry)",
  "projectAsyncAPI(content.content as string | Record<string, unknown>, content.retrievalURI, sourceRegistry)"
);
content = content.replace(
  "projectArazzo(content.content, content.retrievalURI, sourceRegistry)",
  "projectArazzo(content.content as string | Record<string, unknown>, content.retrievalURI, sourceRegistry)"
);
content = content.replace(
  "projectOpenAPI(content.content, content.retrievalURI, sourceRegistry)",
  "projectOpenAPI(content.content as string | Record<string, unknown>, content.retrievalURI, sourceRegistry)"
);

fs.writeFileSync('packages/jentic-arazzo-ui/src/components/ContractPanel.tsx', content);
