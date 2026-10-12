import React, { createRef } from 'react';
import { createRoot, Root } from 'react-dom/client';

import { ArazzoUIStandalone as ArazzoUIStandaloneComponent } from './ArazzoUIStandalone';
import type {
  ArazzoUIRef,
  ArazzoUIProps,
  ViewerMode,
  WorkflowLocationProps,
  WorkflowPerspectiveProps,
} from './types/index';
import type { ArazzoUIStandaloneProps } from './ArazzoUIStandalone';
import type { ArazzoDocument } from './types/arazzo';

export interface ArazzoUIStandaloneConfig extends WorkflowLocationProps, WorkflowPerspectiveProps {
  dom_id?: string;
  domNode?: HTMLElement;
  document: ArazzoDocument | string;
  initialView?: ViewerMode;
  catalog?: ArazzoUIStandaloneProps['catalog'];
  catalogURI?: ArazzoUIStandaloneProps['catalogURI'];
  catalogSelection?: ArazzoUIStandaloneProps['catalogSelection'];
  onCatalogSelectionChange?: ArazzoUIStandaloneProps['onCatalogSelectionChange'];
  sourceProvider?: ArazzoUIProps['sourceProvider'];
  activeWorkflowId?: string | null;
  selectedNodeId?: string | null;
  onNodeSelect?: ArazzoUIProps['onNodeSelect'];
  onEdgeSelect?: ArazzoUIProps['onEdgeSelect'];
  onWorkflowSelect?: (workflowId: string) => void;
  onViewChange?: (view: ViewerMode) => void;
}

export interface ArazzoUIStandaloneInstance {
  unmount(): void;
  getRef(): ArazzoUIRef | null;
}

function ArazzoUIStandalone(config: ArazzoUIStandaloneConfig): ArazzoUIStandaloneInstance {
  const { dom_id, domNode, ...props } = config;
  const container = domNode ?? (dom_id ? globalThis.document.querySelector(dom_id) : null);

  if (!container) {
    throw new Error(
      'ArazzoUIStandalone: provide either dom_id (CSS selector) or domNode (HTMLElement)',
    );
  }

  const ref = createRef<ArazzoUIRef>();
  const root: Root = createRoot(container as HTMLElement);

  root.render(React.createElement(ArazzoUIStandaloneComponent, { ...props, ref }));

  return {
    unmount: () => root.unmount(),
    getRef: () => ref.current,
  };
}

export default ArazzoUIStandalone;
