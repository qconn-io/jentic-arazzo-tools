import { useEffect, useRef, useState } from 'react';

import type { ArazzoUIProps } from '../../types/viewer';
import type { ScenarioManifest, ScenarioSelection } from '../../types/scenario';
import { normalizeScenarioManifest, readScenarioSelection, SCENARIO_NAMESPACE } from './manifest';
import { readLocationURL } from '../location/codec';
/** Only explicit manifest URLs are acquired; no sibling discovery. */
export function useStandaloneScenarios(props: ArazzoUIProps) {
  const initial = useRef(readLocationURL(new URL(globalThis.location.href)).location);
  const initialSelection = readScenarioSelection(initial.current?.extensions?.[SCENARIO_NAMESPACE]);
  const initialURI =
    props.scenarioManifestURI ??
    new URL(globalThis.location.href).searchParams.get('scenarios') ??
    initialSelection?.manifestURI;
  const [uri, setURI] = useState(initialURI ?? '');
  const [input, setInput] = useState(initialURI ?? '');
  const [loaded, setLoaded] = useState<{ manifest: ScenarioManifest; uri: string }>();
  const [message, setMessage] = useState('');
  const [localSelection, setLocalSelection] = useState<ScenarioSelection | null>(
    initialSelection ?? null,
  );
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoaded(undefined);
    if (!uri || props.scenarioManifest) return () => controller.abort();
    setMessage('Loading authored scenario manifest…');
    fetch(uri, { signal: controller.signal, credentials: 'omit' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Scenario manifest unavailable (${response.status}).`);
        const retrieval = response.url || new URL(uri, globalThis.location.href).href;
        const result = normalizeScenarioManifest(await response.json(), retrieval);
        if (!active) return;
        if (!result.manifest) throw new Error(result.diagnostics.join(' '));
        setLoaded({ manifest: result.manifest, uri: retrieval });
        setMessage(result.diagnostics.join(' '));
      })
      .catch((error) => {
        if (active && !controller.signal.aborted)
          setMessage(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [uri, props.scenarioManifest, epoch]);
  useEffect(() => {
    if (props.scenarioManifestURI !== undefined) {
      setURI(props.scenarioManifestURI);
      setInput(props.scenarioManifestURI);
    }
  }, [props.scenarioManifestURI]);
  return {
    manifest: props.scenarioManifest ?? loaded?.manifest,
    uri: props.scenarioManifestURI ?? loaded?.uri,
    selection: props.scenarioSelection !== undefined ? props.scenarioSelection : localSelection,
    setSelection: (value: ScenarioSelection | null) => {
      if (props.scenarioSelection === undefined) setLocalSelection(value);
      props.onScenarioSelectionChange?.(value);
    },
    input,
    setInput,
    message,
    load: () => {
      try {
        const target = new URL(input, globalThis.location.href);
        if (!['http:', 'https:'].includes(target.protocol))
          throw new Error('Scenario loading requires an HTTP(S) manifest URI.');
        setLocalSelection(null);
        setURI(target.href);
        setEpoch((value) => value + 1);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    },
    restore: (url: URL) => {
      const selection = readScenarioSelection(
        readLocationURL(url).location?.extensions?.[SCENARIO_NAMESPACE],
      );
      setLocalSelection(selection ?? null);
      const next = url.searchParams.get('scenarios') ?? selection?.manifestURI ?? '';
      setURI(next);
      setInput(next);
    },
  };
}
