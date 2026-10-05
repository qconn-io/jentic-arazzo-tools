import { createContext } from 'react';

import type { WorkflowLocation } from '../types/location';
// browser history carries authored caller addresses, never private session frames.
export const LocationHistoryContext = createContext<{
  callers?: WorkflowLocation[];
  requestedLocation?: WorkflowLocation;
  commit: (location: WorkflowLocation) => void;
  recordCallers: (callers: WorkflowLocation[], destination: WorkflowLocation) => void;
} | null>(null);
