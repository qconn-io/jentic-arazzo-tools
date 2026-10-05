const fs = require('fs');
let content = fs.readFileSync('packages/jentic-arazzo-ui/src/components/ContractPanel.tsx', 'utf8');

content = content.replace(
  "projectAsyncAPI(content.content, content.retrievalURI)",
  "projectAsyncAPI(content.content, content.retrievalURI, sourceRegistry)"
);
content = content.replace(
  "projectArazzo(content.content, content.retrievalURI)",
  "projectArazzo(content.content, content.retrievalURI, sourceRegistry)"
);
content = content.replace(
  "projectOpenAPI(content.content, content.retrievalURI)",
  "projectOpenAPI(content.content, content.retrievalURI, sourceRegistry)"
);

// We need to fix operationId resolution.
// In sourceBinding, we don't have operationId, operationPath, or channelPath directly.
// Let's check step.sourceBinding again, it has `locators`.
// If it's OpenAPI, it's usually step.sourceBinding.locators.operationId.
content = content.replace(
  "const targetId = sourceBinding?.operationId || sourceBinding?.operationPath || sourceBinding?.channelPath;",
  "const targetId = sourceBinding?.locators?.operationId || sourceBinding?.locators?.operationPath || sourceBinding?.locators?.channelPath;"
);

fs.writeFileSync('packages/jentic-arazzo-ui/src/components/ContractPanel.tsx', content);
