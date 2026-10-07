import type {
  AuthoredScenario,
  ScenarioManifest,
  ScenarioSelection,
  ScenarioWaypoint,
} from '../../types/scenario';
import type { WorkflowLocation, WorkflowLocationJSON } from '../../types/location';
import type { ArazzoViewerModel } from '../model/viewerModel';
import { encodeLocation, decodeLocation } from '../location/codec';
import { resolveLocation } from '../location/resolve';
import { decodePointer, readPointer } from '../contract/pointer';
export const SCENARIO_NAMESPACE = 'arazzo.scenario';
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === 'string';
const nonempty = (value: unknown): value is string => string(value) && value.trim().length > 0;
function uri(value: string, base?: string): string {
  try {
    return new URL(value, base).href;
  } catch {
    throw new Error(`Document reference ${value} requires an explicit manifest base URI.`);
  }
}
export function normalizeScenarioManifest(
  input: unknown,
  base?: string,
): { manifest?: ScenarioManifest; diagnostics: string[] } {
  const diagnostics: string[] = [];
  if (
    !Array.isArray(input) &&
    (!object(input) || input.version !== 1 || !Array.isArray(input.scenarios))
  )
    return { diagnostics: ['Expected a version 1 scenario manifest or a legacy scenario array.'] };
  const envelope = object(input) ? input : {};
  if (
    (envelope.id !== undefined && !nonempty(envelope.id)) ||
    (envelope.revision !== undefined && !nonempty(envelope.revision))
  )
    return { diagnostics: ['Manifest identity and revision must be nonempty strings.'] };
  const entries: unknown[] = Array.isArray(input) ? input : (envelope.scenarios as unknown[]);
  if (entries.length > 500) diagnostics.push('Only the first 500 scenarios are displayed.');
  const bounded = entries.slice(0, 500);
  const ids = new Map<string, number>();
  for (const entry of bounded)
    if (object(entry) && string(entry.id)) ids.set(entry.id, (ids.get(entry.id) ?? 0) + 1);
  const scenarios: AuthoredScenario[] = [];
  for (const [index, entry] of bounded.entries()) {
    try {
      if (
        !object(entry) ||
        !nonempty(entry.id) ||
        !nonempty(entry.document) ||
        !nonempty(entry.workflow) ||
        !string(entry.expected) ||
        !string(entry.evidence)
      )
        throw new Error('Required id/document/workflow/expected/evidence values are invalid.');
      if ((ids.get(entry.id) ?? 0) > 1) throw new Error(`Duplicate scenario ID: ${entry.id}`);
      if (
        (entry.title !== undefined && !string(entry.title)) ||
        (entry.assumptions !== undefined && !string(entry.assumptions)) ||
        (entry.tags !== undefined && (!Array.isArray(entry.tags) || !entry.tags.every(string)))
      )
        throw new Error('Invalid title, assumptions or tags.');
      const document = uri(entry.document, base);
      if (entry.waypoints !== undefined && !Array.isArray(entry.waypoints))
        throw new Error('Waypoints must be an array.');
      const raw: unknown[] = (entry.waypoints as unknown[] | undefined) ?? [];
      if (raw.length > 100)
        diagnostics.push(`${entry.id}: only the first 100 waypoints are displayed.`);
      const counts = new Map<string, number>();
      for (const point of raw.slice(0, 100))
        if (object(point) && string(point.id))
          counts.set(point.id, (counts.get(point.id) ?? 0) + 1);
      const waypoints: ScenarioWaypoint[] = [];
      for (const [i, point] of raw.slice(0, 100).entries()) {
        try {
          if (
            !object(point) ||
            !nonempty(point.id) ||
            !string(point.narrative) ||
            !object(point.location) ||
            !nonempty(point.location.document)
          )
            throw new Error('Invalid waypoint ID, narrative or location.');
          if ((counts.get(point.id) ?? 0) > 1)
            throw new Error(`Duplicate waypoint ID: ${point.id}`);
          const locationInput: Record<string, unknown> = {
            ...point.location,
            document: uri(String(point.location.document), base),
          };
          if (object(locationInput.selection) && object(locationInput.selection.action))
            locationInput.selection = {
              ...locationInput.selection,
              action: {
                ...locationInput.selection.action,
                document: uri(String(locationInput.selection.action.document), base),
              },
            };
          const decoded = decodeLocation(
            encodeLocation(locationInput as unknown as WorkflowLocation),
          );
          if (!decoded.location) throw new Error(decoded.error);
          let focus: ScenarioWaypoint['focus'];
          if (point.focus !== undefined) {
            if (
              !object(point.focus) ||
              !['parameter', 'payload', 'output', 'criterion', 'action'].includes(
                String(point.focus.kind),
              ) ||
              !string(point.focus.pointer) ||
              !point.focus.pointer.startsWith('/')
            )
              throw new Error('Invalid authored focus.');
            decodePointer('#' + point.focus.pointer.replace(/%/g, '%25'));
            focus = {
              kind: point.focus.kind as NonNullable<ScenarioWaypoint['focus']>['kind'],
              pointer: point.focus.pointer,
            };
          }
          waypoints.push({
            id: point.id,
            narrative: point.narrative,
            location: decoded.location,
            ...(focus ? { focus } : {}),
          });
        } catch (error) {
          diagnostics.push(
            `${entry.id}, waypoint ${i + 1}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      scenarios.push({
        id: entry.id,
        document,
        workflow: entry.workflow,
        expected: entry.expected,
        evidence: entry.evidence,
        ...(entry.title !== undefined ? { title: entry.title as string } : {}),
        ...(entry.assumptions !== undefined ? { assumptions: entry.assumptions as string } : {}),
        ...(entry.tags ? { tags: entry.tags as string[] } : {}),
        waypoints,
      });
    } catch (error) {
      diagnostics.push(
        `Scenario ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return {
    manifest: {
      version: 1,
      ...(envelope.id ? { id: envelope.id as string } : {}),
      ...(envelope.revision ? { revision: envelope.revision as string } : {}),
      scenarios,
    },
    diagnostics,
  };
}
/** Prose-only selections address only their declared workflow. */
export function scenarioWaypoint(
  manifest: ScenarioManifest | undefined,
  selection: ScenarioSelection | null | undefined,
  view: WorkflowLocation['view'] = 'docs',
): ScenarioWaypoint | undefined {
  const scenario = manifest?.scenarios.find((s) => s.id === selection?.scenarioId);
  if (!scenario) return undefined;
  if (selection?.waypointId !== undefined)
    return scenario.waypoints?.find((w) => w.id === selection.waypointId);
  return {
    id: '',
    narrative: '',
    location: {
      version: 1,
      document: scenario.document,
      root: scenario.workflow,
      view,
      subview: 'docs',
    },
  };
}
export function scenarioSelectionKey(value: ScenarioSelection | null | undefined): string {
  return JSON.stringify(
    value && [
      value.manifest,
      value.manifestURI,
      value.revision,
      value.scenarioId,
      value.waypointId,
    ],
  );
}
export function readScenarioSelection(
  value: WorkflowLocationJSON | undefined,
): ScenarioSelection | undefined {
  if (
    !object(value) ||
    !nonempty(value.manifest) ||
    !nonempty(value.scenarioId) ||
    (value.waypointId !== undefined && !nonempty(value.waypointId)) ||
    (value.revision !== undefined && !nonempty(value.revision)) ||
    (value.manifestURI !== undefined && !nonempty(value.manifestURI))
  )
    return undefined;
  return {
    manifest: value.manifest,
    scenarioId: value.scenarioId,
    ...(value.manifestURI ? { manifestURI: value.manifestURI as string } : {}),
    ...(value.waypointId ? { waypointId: value.waypointId as string } : {}),
    ...(value.revision ? { revision: value.revision as string } : {}),
  };
}
export function resolveScenarioWaypoint(
  model: ArazzoViewerModel,
  document: unknown,
  waypoint: ScenarioWaypoint,
  source: { document: string; revision?: string; digest?: string },
) {
  const result = resolveLocation(model, waypoint.location, source);
  let focusValue: unknown;
  if (['restored', 'bounded'].includes(result.status.state) && waypoint.focus) {
    try {
      const tokens = decodePointer('#' + waypoint.focus.pointer.replace(/%/g, '%25'));
      const selection = waypoint.location.selection;
      const sites = selection ? [selection, ...(selection.occurrence ?? [])] : [];
      const prefixes = sites.flatMap((site) => {
        const step = model.stepsByWorkflow.get(site.workflowId)?.get(site.stepId);
        return step ? [step.path.map(String)] : [];
      });
      const workflow = model.workflowsById.get(waypoint.location.root ?? '');
      if (workflow && waypoint.focus.kind === 'output') prefixes.push(workflow.path.map(String));
      const fields: Record<string, string[]> = {
        parameter: ['parameters'],
        payload: ['requestBody'],
        output: ['outputs'],
        criterion: [
          'successCriteria',
          'onFailure',
          'onSuccess',
          'failureActions',
          'successActions',
        ],
        action: ['onFailure', 'onSuccess', 'failureActions', 'successActions'],
      };
      const scoped = prefixes.some(
        (prefix) =>
          prefix.every((token, i) => tokens[i] === token) &&
          fields[waypoint.focus!.kind].includes(tokens[prefix.length]),
      );
      const action = selection?.kind === 'action' ? selection.action : undefined;
      const actionTokens = action ? decodePointer('#' + action.pointer) : undefined;
      const declaredAction =
        actionTokens?.every((token, i) => tokens[i] === token) &&
        ['action', 'criterion', 'parameter'].includes(waypoint.focus.kind);
      if (scoped || declaredAction) focusValue = readPointer(document, tokens);
    } catch {
      /* diagnosed below */
    }
    if (focusValue === undefined)
      result.status = {
        state: 'stale',
        location: waypoint.location,
        message: `Unavailable authored ${waypoint.focus.kind}: ${waypoint.focus.pointer}`,
      };
  }
  return { ...result, focusValue };
}
