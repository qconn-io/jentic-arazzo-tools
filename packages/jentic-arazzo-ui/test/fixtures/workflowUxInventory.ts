import { readFileSync } from 'node:fs';

export interface AcceptanceStep {
  stepId: string;
  kind: 'operation' | 'call';
  locator: string;
  source: string | null;
  locatedSource?: string;
  targetKind?: string;
  action?: string;
  prerequisites: string[];
  actions: {
    channel: 'onSuccess' | 'onFailure';
    name: string;
    type: string;
    target?: string;
    targetLane?: string;
    returnToSource?: boolean;
  }[];
  parameters?: Record<string, unknown>;
}
export interface AcceptanceWorkflow {
  workflowId: string;
  steps: AcceptanceStep[];
  prerequisites: string[];
  relationships: string[];
  limits: string[];
  sources: string[];
}
export interface AcceptanceDocument {
  path: string;
  version: string;
  sha256: string;
  layouts: string[];
  representations: string[];
  workflows: AcceptanceWorkflow[];
}
export interface AcceptanceInventory {
  version: number;
  documents: AcceptanceDocument[];
}
export function readInventory(): AcceptanceInventory {
  const inventory: AcceptanceInventory = JSON.parse(
    readFileSync(new URL('./workflow-ux-acceptance.json', import.meta.url), 'utf8'),
  );
  const workflow = inventory.documents
    .find(
      (entry) =>
        entry.path === 'public/examples/digital-product-stress/boundaries/row-limit.arazzo.yaml',
    )!
    .workflows.find((entry) => entry.workflowId === 'row-limit')!;
  const template = workflow.steps[0];
  workflow.steps = Array.from({ length: 250 }, (_, index) => ({
    ...structuredClone(template),
    stepId: `observation-${String(index + 1).padStart(3, '0')}`,
  }));
  return inventory;
}
export function validateInventory(inventory: AcceptanceInventory, discovered: string[]): void {
  if (inventory.version !== 1 || inventory.documents.length !== 10)
    throw new Error('Inventory must classify all ten baseline documents');
  const paths = inventory.documents.map((entry) => entry.path).sort();
  if (
    new Set(paths).size !== paths.length ||
    JSON.stringify(paths) !== JSON.stringify([...discovered].sort())
  )
    throw new Error('Unclassified or omitted Arazzo example: review the acceptance inventory');
  if (inventory.documents.reduce((count, entry) => count + entry.workflows.length, 0) !== 46)
    throw new Error('Workflow coverage drift: review all 46 baseline expectations');
  for (const entry of inventory.documents) {
    if (
      !entry.version ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      JSON.stringify([...entry.layouts].sort()) !== JSON.stringify(['diagram', 'docs', 'split']) ||
      JSON.stringify([...entry.representations].sort()) !==
        JSON.stringify(['docs', 'flowchart', 'sequence'])
    )
      throw new Error(`Missing identity or representation expectation: ${entry.path}`);
    for (const workflow of entry.workflows) {
      if (
        !workflow.workflowId ||
        !workflow.steps.length ||
        !Array.isArray(workflow.sources) ||
        !Array.isArray(workflow.prerequisites) ||
        !Array.isArray(workflow.relationships) ||
        !Array.isArray(workflow.limits)
      )
        throw new Error(`Missing semantic expectations: ${entry.path}`);
      for (const step of workflow.steps)
        if (
          !step.stepId ||
          !step.locator ||
          !['operation', 'call'].includes(step.kind) ||
          !Object.hasOwn(step, 'source') ||
          !Array.isArray(step.actions) ||
          !Array.isArray(step.prerequisites) ||
          (step.kind === 'call' && !step.targetKind)
        )
          throw new Error(`Missing semantic expectations: ${workflow.workflowId}`);
      for (const step of workflow.steps)
        for (const action of step.actions)
          if (
            !action.name ||
            !action.type ||
            !['onSuccess', 'onFailure'].includes(action.channel) ||
            (['goto', 'retry'].includes(action.type) &&
              (!action.target || !action.targetLane || typeof action.returnToSource !== 'boolean'))
          )
            throw new Error(`Missing action expectations: ${workflow.workflowId}.${step.stepId}`);
    }
  }
}
