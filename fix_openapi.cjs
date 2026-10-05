const fs = require('fs');
let content = fs.readFileSync('packages/jentic-arazzo-ui/src/utils/contract/OpenAPIAdapter.ts', 'utf8');

content = content.replace(
  "const resolver = new Resolver({ name: 'source-registry' });",
  "class SourceRegistryResolver extends Resolver {\n    constructor() { super({ name: 'source-registry' }); }\n  }\n  const resolver = new SourceRegistryResolver();"
);

fs.writeFileSync('packages/jentic-arazzo-ui/src/utils/contract/OpenAPIAdapter.ts', content);
