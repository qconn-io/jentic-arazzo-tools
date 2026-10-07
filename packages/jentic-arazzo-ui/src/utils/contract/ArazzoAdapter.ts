import { SourceRegistry } from '../source/SourceRegistry';
import { loadDocument } from '../loading/loadDocument';
import { parseContract } from './references';
import { buildViewerModel, type ArazzoViewerModel } from '../model/viewerModel';

export async function projectArazzo(
  content: string | object,
  uri: string,
  registry: SourceRegistry,
  revision?: string,
): Promise<ArazzoViewerModel> {
  const { snapshot } = await loadDocument(await parseContract(content), { baseURI: uri });
  snapshot.retrievalURI = uri;
  snapshot.id = JSON.stringify([uri, revision ?? null]);
  const { inspect } = await import('../inspection');
  const inspectionResult = inspect(snapshot);
  return buildViewerModel(inspectionResult);
}
