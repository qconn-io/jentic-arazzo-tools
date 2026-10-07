import React from 'react';
import { useContractFacts } from '../context/ContractFactsContext';

import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { resolveScopedOperation } from '../utils/contract/OperationStatusResolver';

function Declaration({ title, value }: { title: string; value: unknown }) {
  if (value === undefined) return null;
  return (
    <details>
      <summary>{title}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
export function ContractPanel({ workflowId, stepId }: { workflowId: string; stepId?: string }) {
  const { model, sourceRegistry, sourceProvider, onExternalNavigation } = useArazzoViewer();
  const binding = stepId
    ? model.stepsByWorkflow.get(workflowId)?.get(stepId)?.sourceBinding
    : undefined;
  const { loaded: currentLoaded, load } = useContractFacts();
  if (!binding || !Object.keys(binding.locators).length) return null;
  const sources = (model.document.sourceDescriptions ?? []).filter((source) =>
    binding.candidates.includes(source.name),
  );
  const locators = { ...binding.locators };
  if (binding.sourceName) {
    for (const key of Object.keys(locators)) {
      const locator = locators[key];
      if (typeof locator !== 'string') continue;
      const prefix = `$sourceDescriptions.${binding.sourceName}.`;
      const urlPrefix = `{$sourceDescriptions.${binding.sourceName}.url}`;
      locators[key] = locator.startsWith(prefix)
        ? locator.slice(prefix.length)
        : locator.startsWith(urlPrefix)
          ? locator.slice(urlPrefix.length)
          : locator;
    }
  }
  const result = resolveScopedOperation(
    locators,
    sources.map((source) => currentLoaded[source.name] ?? { state: 'idle' }),
  );
  const operation = result.operation;
  return (
    <section className="arazzo-contract-panel" aria-label="Contract and source">
      <h3>Contract &amp; Source</h3>
      <p>
        Authored locator: <code>{Object.values(binding.locators).join(' · ')}</code>
      </p>
      {!Object.hasOwn(binding.locators, 'workflowId') && (
        <p role="status">
          Status: <strong>{result.status}</strong>
        </p>
      )}
      {result.diagnostics?.map((message) => (
        <p key={message}>{message}</p>
      ))}
      {!sourceProvider && <p>Source not checked. Supply a source provider to enable inspection.</p>}
      {sources.map((source) => {
        const value = currentLoaded[source.name];
        const target = typeof locators.workflowId === 'string' ? locators.workflowId : undefined;
        const workflow = target ? value?.workflowModel?.workflowsById.get(target) : undefined;
        return (
          <section key={source.name} aria-label={`Source ${source.name}`}>
            <h4>{source.name}</h4>
            <p>
              Source URL: <code>{source.url}</code>
            </p>
            <p>Source state: {value?.state ?? 'not-loaded'}</p>
            {sourceProvider && (
              <button
                type="button"
                disabled={value?.state === 'loading'}
                onClick={() => void load(source, !!value)}
              >
                {' '}
                {value ? 'Reload' : 'Load'} source {source.name}
              </button>
            )}
            {value?.error && <p role="status">{value.error.message}</p>}
            {value?.facts && (
              <p>
                Contract profile: {value.facts.dialect} {value.facts.version}
              </p>
            )}
            {value?.facts?.unsupportedDiagnostics.map((message) => (
              <p key={message}>{message}</p>
            ))}
            {value?.content && (
              <>
                <p>
                  Retrieval URI: <code>{value.content.retrievalURI}</code>
                </p>
                <p>
                  Revision: <code>{value.content.revision ?? 'unpinned'}</code>
                </p>
                <p>Provider generation: {sourceRegistry.getProviderGeneration()}</p>
                <details>
                  <summary>Raw Source Document</summary>
                  <pre>
                    {typeof value.content.content === 'string'
                      ? value.content.content
                      : JSON.stringify(value.content.content, null, 2)}
                  </pre>
                </details>
              </>
            )}
            {value?.workflowModel && (
              <>
                <p>Status: {workflow ? 'located' : 'missing'}</p>
                {workflow && onExternalNavigation && (
                  <button
                    type="button"
                    onClick={() =>
                      onExternalNavigation({
                        documentUri: value.content!.retrievalURI,
                        revision: value.content!.revision,
                        workflowId: target,
                      })
                    }
                  >
                    Open workflow {target}
                  </button>
                )}
              </>
            )}
          </section>
        );
      })}
      {operation && (
        <section aria-label="Operation declaration">
          <h4>Operation Details</h4>
          <p>
            {operation.operationId} {operation.method} {operation.path}
          </p>
          <p>
            Located means found in this source; it does not establish full contract validity or
            execution.
          </p>
          {!!operation.schemaReferences?.length && (
            <section aria-label="Referenced schema declarations">
              <h4>Referenced schema declarations</h4>
              <p>
                Authored references and sibling constraints remain in their schema declarations.
                Targets are shown separately without combining constraints.
              </p>
              {operation.schemaReferences.map((reference, index) => (
                <details key={`${reference.declaringURI}:${reference.occurrence}:${index}`}>
                  <summary>
                    {reference.authoredReference} — {reference.status}
                  </summary>
                  <p>
                    Occurrence:{' '}
                    <code>
                      {reference.declaringURI}
                      {reference.occurrence}
                    </code>
                  </p>
                  {reference.targetURI && (
                    <p>
                      Target:{' '}
                      <code>
                        {reference.targetURI}
                        {reference.targetPointer}
                      </code>
                    </p>
                  )}
                  <p>
                    Revision: <code>{reference.revision ?? 'unpinned'}</code>
                  </p>
                  {reference.diagnostic && <p>{reference.diagnostic}</p>}
                  {reference.declaration !== undefined && (
                    <pre>{JSON.stringify(reference.declaration, null, 2)}</pre>
                  )}
                </details>
              ))}
            </section>
          )}
          <Declaration title="Declared parameters" value={operation.parameters} />
          <Declaration title="Request media types and schemas" value={operation.requestBody} />
          <Declaration
            title="Response alternatives (declared, not observed)"
            value={operation.responses}
          />
          <Declaration title="Declared servers" value={operation.servers} />
          <Declaration title="Applicable security requirements" value={operation.security} />
          {operation.action && <p>Declared direction: {operation.action}</p>}
          {operation.channel && <p>Channel: {operation.channel}</p>}
          <Declaration title="Channel address" value={operation.address} />
          <Declaration
            title="Message alternatives, headers, payload and correlation declarations"
            value={operation.messages}
          />
        </section>
      )}
    </section>
  );
}
