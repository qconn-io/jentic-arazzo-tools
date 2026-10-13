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
  const [failed, setFailed] = useState(false);
  const [localSelection, setLocalSelection] = useState<ScenarioSelection | null>(
    initialSelection ?? null,
  );
  const [epoch, setEpoch] = useState(0);
  // explicit example navigation may replace initial host guides; subsequent host updates win.
  const [exampleOverride, setExampleOverride] = useState<{
    manifest: ArazzoUIProps['scenarioManifest'];
    uri: ArazzoUIProps['scenarioManifestURI'];
  }>();
  const usingExample =
    !!exampleOverride &&
    exampleOverride.manifest === props.scenarioManifest &&
    exampleOverride.uri === props.scenarioManifestURI;

  useEffect(() => {
    if (exampleOverride && !usingExample) setExampleOverride(undefined);
  }, [exampleOverride, usingExample]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!uri || (props.scenarioManifest !== undefined && !usingExample)) {
      if (!uri) setLoaded(undefined);
      setMessage('');
      setFailed(false);
      return () => {
        active = false;
        controller.abort();
      };
    }
    setFailed(false);
    setMessage('Loading guided walkthroughs…');
    fetch(uri, { signal: controller.signal, credentials: 'omit' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Guide file unavailable (${response.status}).`);
        const retrieval = response.url || new URL(uri, globalThis.location.href).href;
        let content: unknown;
        try {
          content = await response.json();
        } catch {
          throw new Error('Malformed guide file: expected JSON content.');
        }
        const result = normalizeScenarioManifest(content, retrieval);
        if (!active) return;
        if (!result.manifest)
          throw new Error(`Malformed guide file: ${result.diagnostics.join(' ')}`);
        if (!result.manifest.scenarios.length && result.diagnostics.length)
          throw new Error(
            `Malformed guide file: no usable walkthroughs. ${result.diagnostics.join(' ')}`,
          );
        setLoaded({ manifest: result.manifest, uri: retrieval });
        setMessage(
          result.manifest.scenarios.length
            ? result.diagnostics.join(' ')
            : 'This guide file contains no walkthroughs.',
        );
      })
      .catch((error) => {
        if (active && !controller.signal.aborted) {
          const reason = error instanceof Error ? error.message : String(error);
          setMessage(
            reason.startsWith('Malformed guide file:') ||
              reason.startsWith('Guide file unavailable')
              ? reason
              : `Guide file unavailable: ${reason}`,
          );
          setFailed(true);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [uri, props.scenarioManifest, epoch, usingExample]);
  useEffect(() => {
    if (props.scenarioManifestURI !== undefined) {
      setURI(props.scenarioManifestURI);
      setInput(props.scenarioManifestURI);
    }
  }, [props.scenarioManifestURI]);
  const loadURL = (value: string) => {
    try {
      const target = new URL(value, globalThis.location.href);
      if (!['http:', 'https:'].includes(target.protocol))
        throw new Error('Guide loading requires an HTTP(S) guide file URL.');
      setLocalSelection(null);
      setURI(target.href);
      setInput(target.href);
      setEpoch((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setFailed(false);
    }
  };
  return {
    manifest: usingExample
      ? (loaded?.manifest ?? props.scenarioManifest)
      : (props.scenarioManifest ?? loaded?.manifest),
    uri: usingExample
      ? (loaded?.uri ?? props.scenarioManifestURI)
      : props.scenarioManifest !== undefined
        ? props.scenarioManifestURI
        : loaded?.uri,
    selection: props.scenarioSelection !== undefined ? props.scenarioSelection : localSelection,
    setSelection: (value: ScenarioSelection | null) => {
      if (props.scenarioSelection === undefined) setLocalSelection(value);
      props.onScenarioSelectionChange?.(value);
    },
    input,
    setInput,
    message,
    retry: () => setEpoch((value) => value + 1),
    failed,
    loadExample: (value: string) => {
      setExampleOverride({ manifest: props.scenarioManifest, uri: props.scenarioManifestURI });
      loadURL(value);
    },
    load: () => loadURL(input),
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
