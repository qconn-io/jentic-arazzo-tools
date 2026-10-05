const fs = require('fs');
let content = fs.readFileSync('packages/jentic-arazzo-ui/src/utils/contract/ArazzoAdapter.ts', 'utf8');

content = content.replace(
  "projectArazzo(\n  content: string | object,",
  "projectArazzo(\n  content: any,"
);
fs.writeFileSync('packages/jentic-arazzo-ui/src/utils/contract/ArazzoAdapter.ts', content);
