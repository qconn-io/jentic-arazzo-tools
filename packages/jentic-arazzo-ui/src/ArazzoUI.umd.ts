import React, { createRef } from 'react';
import { createRoot, Root } from 'react-dom/client';

import { ArazzoUI as ArazzoUIComponent } from './ArazzoUI';
import type { ArazzoUIProps, ArazzoUIRef, ViewerMode } from './types/index';
import type { ArazzoDocument } from './types/arazzo';

export interface ArazzoUIConfig {
  dom_id?: string;
  domNode?: HTMLElement;
  document: ArazzoDocument | string;
  viewProfile?: ArazzoUIProps['viewProfile'];
  viewProfileAdapter?: ArazzoUIProps['viewProfileAdapter'];
  perspective?: ArazzoUIProps['perspective'];
  onPerspectiveChange?: ArazzoUIProps['onPerspectiveChange'];
  view?: ViewerMode;
  activeWorkflowId?: string | null;
  selectedNodeId?: string | null;
  onNodeSelect?: ArazzoUIProps['onNodeSelect'];
  onEdgeSelect?: ArazzoUIProps['onEdgeSelect'];
  onWorkflowSelect?: ArazzoUIProps['onWorkflowSelect'];
  onViewChange?: ArazzoUIProps['onViewChange'];
  location?: ArazzoUIProps['location'];
  defaultLocation?: ArazzoUIProps['defaultLocation'];
  onLocationChange?: ArazzoUIProps['onLocationChange'];
  onLocationStatus?: ArazzoUIProps['onLocationStatus'];
  documentIdentity?: ArazzoUIProps['documentIdentity'];
  documentRevision?: ArazzoUIProps['documentRevision'];
  locationAdapters?: ArazzoUIProps['locationAdapters'];
}

export interface ArazzoUIInstance {
  unmount(): void;
  getRef(): ArazzoUIRef | null;
}

function ArazzoUI(config: ArazzoUIConfig): ArazzoUIInstance {
  const { dom_id, domNode, ...props } = config;
  const container = domNode ?? (dom_id ? globalThis.document.querySelector(dom_id) : null);

  if (!container) {
    throw new Error('ArazzoUI: provide either dom_id (CSS selector) or domNode (HTMLElement)');
  }

  const ref = createRef<ArazzoUIRef>();
  const root: Root = createRoot(container as HTMLElement);

  root.render(React.createElement(ArazzoUIComponent, { ...props, ref }));

  return {
    unmount: () => root.unmount(),
    getRef: () => ref.current,
  };
}

export default ArazzoUI;
