const fs = require('fs');
let content = fs.readFileSync('packages/jentic-arazzo-ui/src/context/ArazzoViewerContext.tsx', 'utf8');

content = content.replace(
  `}) {
  const sourceRegistry = useSourceRegistry(new BrowserFetchProvider(), 32);
  value,
  children,
  const sourceRegistry = useSourceRegistry(undefined, 32);`,
  `}) {
  const sourceRegistry = useSourceRegistry(new BrowserFetchProvider(), 32);`
);

fs.writeFileSync('packages/jentic-arazzo-ui/src/context/ArazzoViewerContext.tsx', content);
