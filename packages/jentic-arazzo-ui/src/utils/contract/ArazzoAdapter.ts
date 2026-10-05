import { SourceRegistry } from '../source/SourceRegistry';
import { loadDocument } from '../loading/loadDocument';
import { buildViewerModel, type ArazzoViewerModel } from '../model/viewerModel';

export async function projectArazzo(
  content: any,
  uri: string,
  registry: SourceRegistry,
  revision?: string,
): Promise<ArazzoViewerModel> {
  const { snapshot } = await loadDocument(content, { baseURI: uri });
  const { inspect } = await import('../inspection');
  const inspectionResult = inspect(snapshot);
  return buildViewerModel(inspectionResult);
}
