import React, { useEffect, useState, useMemo } from 'react';
import { useArazzoViewer } from '../context/ArazzoViewerContext';
import { resolveOperationStatus, OperationLookupStatus, OperationLookupResult } from '../utils/contract/OperationStatusResolver';
import type { ContractDocumentFacts } from '../utils/contract/types';
import { projectOpenAPI } from '../utils/contract/OpenAPIAdapter';
import { projectAsyncAPI } from '../utils/contract/AsyncAPIAdapter';
import { projectArazzo } from '../utils/contract/ArazzoAdapter';

export function ContractPanel({ workflowId, stepId }: { workflowId: string, stepId?: string }) {
  const { model, sourceRegistry } = useArazzoViewer();
  const step = stepId ? model.stepsByWorkflow.get(workflowId)?.get(stepId) : undefined;
  const sourceBinding = step?.sourceBinding;
  const sourceURL = model.document.sourceDescriptions?.find(s => s.name === sourceBinding?.sourceName)?.url;

  const [docState, setDocState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [facts, setFacts] = useState<ContractDocumentFacts | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [customUri, setCustomUri] = useState<string>('');

  const targetUrl = customUri || sourceURL;

  useEffect(() => {
    if (!targetUrl) {
      setDocState('idle');
      return;
    }

    let isMounted = true;
    setDocState('loading');
    setError(undefined);

    sourceRegistry.acquire(targetUrl, undefined, model.inspection.snapshot.baseURI)
      .then(async (content) => {
        if (!isMounted) return;
        try {
          let projected: ContractDocumentFacts;
          const type = sourceBinding?.sourceType || 'openapi';
          if (type.startsWith('asyncapi')) {
            projected = await projectAsyncAPI(content.content as any, content.retrievalURI, sourceRegistry);
          } else if (type.startsWith('arazzo')) {
            const modelResult = await projectArazzo(content.content as any, content.retrievalURI, sourceRegistry);
            projected = {
              version: '1.0.0',
              dialect: 'unsupported',
              uri: content.retrievalURI,
              operations: new Map(),
              rawContent: content.content,
              unsupportedDiagnostics: ['Arazzo sources should be navigated as external workflows']
            };
          } else {
            projected = await projectOpenAPI(content.content as any, content.retrievalURI, sourceRegistry);
          }
          if (!isMounted) return;
          setFacts(projected);
          setDocState('success');
        } catch (e) {
          if (isMounted) {
            setError(e instanceof Error ? e : new Error(String(e)));
            setDocState('error');
          }
        }
      })
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setDocState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [targetUrl, sourceBinding?.sourceType, sourceRegistry, sourceRegistry.getProviderGeneration()]);

  let targetId = sourceBinding?.locators?.operationId || sourceBinding?.locators?.operationPath || sourceBinding?.locators?.channelPath;
  if (typeof targetId === 'string' && targetId.startsWith('$sourceDescriptions.')) {
    targetId = targetId.split('.').pop() || targetId;
  }
  const statusResult = useMemo(() => {
    if (!targetId) return null;
    return resolveOperationStatus(targetId, docState, facts, error);
  }, [targetId, docState, facts, error]);

  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const uri = fd.get('uri') as string;
    if (uri) setCustomUri(uri);
  };

  if (!sourceURL && !customUri) {
    return (
      <section className="arazzo-contract-panel">
        <h3>Load Contract Source</h3>
        <form onSubmit={handleLoad} style={{ display: 'flex', gap: '8px' }}>
          <input name="uri" type="url" placeholder="Enter source URL" required />
          <button type="submit">Load</button>
        </form>
      </section>
    );
  }

  return (
    <section className="arazzo-contract-panel">
      <h3>Contract & Source</h3>
      <div style={{ marginBottom: '8px' }}>
        <form onSubmit={handleLoad} style={{ display: 'flex', gap: '8px' }}>
          <input name="uri" type="url" placeholder="Override source URL" defaultValue={targetUrl} />
          <button type="submit">Load</button>
          <button type="button" onClick={() => sourceRegistry.reload(targetUrl!)}>Reload</button>
        </form>
      </div>

      <p>Source URL: <code>{targetUrl}</code></p>
      <p>Base URI: <code>{model.inspection.snapshot.baseURI}</code></p>
      <p>Status: <strong>{statusResult?.status || docState}</strong></p>
      
      {statusResult?.diagnostics && statusResult.diagnostics.length > 0 && (
        <div className="arazzo-diagnostics">
          <h4>Diagnostics</h4>
          <ul>
            {statusResult.diagnostics.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {statusResult?.operation && (
        <details>
          <summary>Operation Details</summary>
          <pre>{JSON.stringify(statusResult.operation, null, 2)}</pre>
        </details>
      )}

      {facts && (
        <details>
          <summary>Raw Source Document</summary>
          <pre>{typeof facts.rawContent === 'string' ? facts.rawContent : JSON.stringify(facts.rawContent, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
