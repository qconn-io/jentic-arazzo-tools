import { SourceRegistry, type SourceValidityToken } from '../source/SourceRegistry';
import { loadDocument } from '../loading/loadDocument';
import { parseContract } from './references';
import { buildViewerModel, type ArazzoViewerModel } from '../model/viewerModel';

export async function projectArazzo(
  content: string | object,
  uri: string,
  registry: SourceRegistry,
  revision?: string,
  acquisitionValidity?: SourceValidityToken,
): Promise<ArazzoViewerModel> {
  const validity = acquisitionValidity ?? registry.captureValidity(uri, revision);
  const ensureCurrent = () => {
    if (!registry.isCurrent(validity)) throw new Error('Obsolete Arazzo projection');
  };
  ensureCurrent();
  const { snapshot } = await loadDocument(await parseContract(content), {
    baseURI: uri,
    contentOnly: true,
    secondaryRegistry: registry,
    sourceRevision: revision,
    sourceValidity: validity,
  });
  ensureCurrent();
  snapshot.retrievalURI = uri;
  snapshot.id = JSON.stringify([uri, revision ?? null]);
  const { inspect } = await import('../inspection');
  ensureCurrent();
  const inspectionResult = inspect(snapshot);
  return buildViewerModel(inspectionResult);
}
