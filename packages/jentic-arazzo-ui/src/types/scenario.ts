import type { WorkflowLocation } from './location';
/** A precise authored JSON Pointer, relative to the waypoint document. @public */
export interface ScenarioFocus {
  kind: 'parameter' | 'payload' | 'output' | 'criterion' | 'action';
  pointer: string;
}
/** A reading address and narrative, never an execution instruction. @public */
export interface ScenarioWaypoint {
  id: string;
  narrative: string;
  location: WorkflowLocation;
  focus?: ScenarioFocus;
}
/** A prose-only legacy entry remains a useful reading guide. @public */
export interface AuthoredScenario {
  id: string;
  title?: string;
  document: string;
  workflow: string;
  expected: string;
  evidence: string;
  assumptions?: string;
  tags?: string[];
  waypoints?: ScenarioWaypoint[];
}
/** Explicitly supplied manifest. Relative references require its retrieval URI. @public */
export interface ScenarioManifest {
  version: 1;
  id?: string;
  revision?: string;
  scenarios: AuthoredScenario[];
}
/** Separate reading state; null selection leaves guide mode. @public */
export interface ScenarioSelection {
  manifest: string;
  /** Retrieval URI required to restore a manifest in a fresh standalone session. */
  manifestURI?: string;
  revision?: string;
  scenarioId: string;
  waypointId?: string;
}
/** Optional embedding controls. The host supplies documents requested by a guide. @public */
export interface ScenarioControls {
  scenarioManifest?: ScenarioManifest | readonly AuthoredScenario[];
  scenarioManifestURI?: string;
  scenarioSelection?: ScenarioSelection | null;
  onScenarioSelectionChange?: (selection: ScenarioSelection | null) => void;
  onScenarioLocationRequest?: (location: WorkflowLocation, focus?: ScenarioFocus) => void;
}
