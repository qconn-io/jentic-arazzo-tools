import { loadDocument } from './packages/jentic-arazzo-ui/src/utils/loading/loadDocument';

async function main() {
  const loaded = await loadDocument("https://raw.githubusercontent.com/OAI/Arazzo-Specification/refs/heads/main/examples/1.0.0/petstore-order-workflow.yaml", { baseURI: 'http://localhost:3000/' });
  console.log(loaded.snapshot.baseURI);
}

main().catch(console.error);
