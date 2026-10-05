const fs = require('fs');
let content = fs.readFileSync('packages/jentic-arazzo-ui/src/context/ArazzoViewerContext.tsx', 'utf8');

content = content.replace(
  "import type { SourceDocumentProvider } from '../types/source';",
  "import type { SourceDocumentProvider } from '../types/source';\nimport { BrowserFetchProvider } from '../utils/source/BrowserFetchProvider';"
);

// We need to use BrowserFetchProvider as default if sourceProvider is not provided.
content = content.replace(
  "const sourceRegistry = useSourceRegistry(undefined, 32);",
  "const sourceRegistry = useSourceRegistry(new BrowserFetchProvider(), 32);"
);

content = content.replace(
  "const sourceRegistry = useSourceRegistry(sourceProvider, 32);",
  "const sourceRegistry = useSourceRegistry(sourceProvider || new BrowserFetchProvider(), 32);"
);

fs.writeFileSync('packages/jentic-arazzo-ui/src/context/ArazzoViewerContext.tsx', content);
