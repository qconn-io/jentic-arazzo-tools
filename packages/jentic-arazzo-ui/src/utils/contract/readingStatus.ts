import type { OperationLookupStatus } from './OperationStatusResolver';

export const contractReadingStatus: Record<OperationLookupStatus, string> = {
  'not-loaded': 'API description not loaded',
  loading: 'Checking API description',
  located: 'Operation found',
  missing: 'Operation not found',
  ambiguous: 'Multiple matching operations',
  unsupported: 'Unsupported API description',
  failed: 'API description unavailable',
};
