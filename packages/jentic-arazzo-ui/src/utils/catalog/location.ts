import type { WorkflowCatalogManifest, WorkflowCatalogSelection } from '../../types/catalog';
import type { WorkflowLocation } from '../../types/location';
import { CATALOG_NAMESPACE } from './manifest';

export function catalogLocation(
  manifest: WorkflowCatalogManifest,
  selection: WorkflowCatalogSelection,
  location: WorkflowLocation,
): WorkflowLocation {
  return {
    ...location,
    extensions: {
      ...location.extensions,
      [CATALOG_NAMESPACE]: {
        catalogId: manifest.id,
        catalogRevision: manifest.revision,
        documentId: selection.documentId,
        revision: selection.revision,
      },
    },
  };
}
export function readCatalogLocation(
  manifest: WorkflowCatalogManifest,
  location?: WorkflowLocation,
): { selection?: WorkflowCatalogSelection; error?: string } {
  if (!location) return {};
  const value = location.extensions?.[CATALOG_NAMESPACE];
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { error: 'Catalog location identity is unavailable' };
  if (value.catalogId !== manifest.id || value.catalogRevision !== manifest.revision)
    return {
      error:
        'Unavailable catalog revision; supplied manifest does not match the shared catalog revision',
    };
  if (
    typeof value.documentId !== 'string' ||
    !value.documentId ||
    typeof value.revision !== 'string' ||
    !value.revision ||
    !location.root
  )
    return { error: 'Invalid catalog document/revision/workflow location' };
  if (location.revision !== value.revision)
    return { error: 'Catalog document revision conflicts with the workflow location' };
  return {
    selection: {
      documentId: value.documentId,
      revision: value.revision,
      workflowId: location.root,
      location,
    },
  };
}
