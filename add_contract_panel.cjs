const fs = require('fs');
let content = fs.readFileSync('packages/jentic-arazzo-ui/src/components/SelectionDetails.tsx', 'utf8');

// Insert import
content = content.replace(
  "import { ReadingDetails } from './ReadingDetails';",
  "import { ReadingDetails } from './ReadingDetails';\nimport { ContractPanel } from './ContractPanel';"
);

// Insert ContractPanel before <ReadingDetails /> or after?
// Let's insert it after ReadingDetails
content = content.replace(
  "<ReadingDetails sections={details.reading.sections} />",
  "<ReadingDetails sections={details.reading.sections} />\n      {selection?.stepId && <ContractPanel workflowId={selection.workflowId} stepId={selection.stepId} />}"
);

fs.writeFileSync('packages/jentic-arazzo-ui/src/components/SelectionDetails.tsx', content);
