import React from 'react';

import { contractReadingStatus } from '../utils/contract/readingStatus';
import { useContractFacts } from '../context/ContractFactsContext';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { resolveStepOperation } from '../utils/contract/stepOperation';

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
  const step = stepId ? model.stepsByWorkflow.get(workflowId)?.get(stepId) : undefined;
  const binding = step?.sourceBinding;
  const { loaded: currentLoaded, load } = useContractFacts();
  if (!binding || !Object.keys(binding.locators).length) return null;
  const sources = (model.document.sourceDescriptions ?? []).filter((source) =>
    binding.candidates.includes(source.name),
  );
  const result = resolveStepOperation(model, step!, currentLoaded);
  const locators = result.normalizedLocators ?? binding.locators;
  const operation = result.operation;
  return (
    <section className="arazzo-contract-panel" aria-label="Contract and source">
      <h3>Contract &amp; Source</h3>
      {!Object.hasOwn(binding.locators, 'workflowId') && (
        <p role="status">
          <strong>{contractReadingStatus[result.status]}</strong>
        </p>
      )}
      {result.sourceName && (
        <p>
          Destination source: <strong>{result.sourceName}</strong>
        </p>
      )}
      {result.status === 'not-loaded' && <p>This operation has not been checked.</p>}
      {result.status === 'not-loaded' &&
        sources.some((source) => currentLoaded[source.name]?.state === 'success') && (
          <p>
            Some possible API descriptions remain unchecked. A unique operation has not been
            established.
          </p>
        )}
      <details>
        <summary>Technical lookup details</summary>
        <p>
          Authored locator: <code>{Object.values(binding.locators).join(' · ')}</code>
        </p>
        <p>
          Lookup status: <strong>{result.status}</strong>
        </p>
        {result.diagnostics?.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </details>
      {!sourceProvider && (
        <>
          <p>API-description loading is unavailable in this viewer.</p>
          <details data-advanced>
            <summary>Developer configuration</summary>
            <p>This host has no source provider configured for API-description loading.</p>
          </details>
        </>
      )}
      {sources.map((source) => {
        const value = currentLoaded[source.name];
        const target = typeof locators.workflowId === 'string' ? locators.workflowId : undefined;
        const workflow = target ? value?.workflowModel?.workflowsById.get(target) : undefined;
        return (
          <section key={source.name} aria-label={`Source ${source.name}`} tabIndex={-1}>
            <h4>{source.name}</h4>
            <details>
              <summary>Source acquisition details</summary>
              <p>
                Source URL: <code>{source.url}</code>
              </p>
              <p>Source state: {value?.state ?? 'idle'}</p>
              {value?.content && (
                <>
                  <p>
                    Retrieval URI: <code>{value.content.retrievalURI}</code>
                  </p>
                  <p>
                    Revision: <code>{value.content.revision ?? 'unpinned'}</code>
                  </p>
                </>
              )}
            </details>
            {sourceProvider && (
              <button
                type="button"
                disabled={value?.state === 'loading'}
                onClick={(event) => {
                  if (document.activeElement === event.currentTarget)
                    event.currentTarget.parentElement?.focus();
                  void load(source, !!value);
                }}
              >
                {' '}
                {value?.state === 'loading'
                  ? 'Checking'
                  : value?.state === 'error'
                    ? 'Retry'
                    : value
                      ? 'Reload'
                      : 'Load'}{' '}
                API description {source.name}
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
                <details data-advanced>
                  <summary>Advanced source provenance</summary>
                  <p>Provider generation: {sourceRegistry.getProviderGeneration()}</p>
                  <details>
                    <summary>Raw Source Document</summary>
                    <pre>
                      {typeof value.content.content === 'string'
                        ? value.content.content
                        : JSON.stringify(value.content.content, null, 2)}
                    </pre>
                  </details>
                </details>
              </>
            )}
            {value?.workflowModel && (
              <>
                <p>{workflow ? 'Workflow found' : 'Workflow not found'}</p>
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
            Operation found means located in this source; it does not establish full contract
            validity or execution.
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
