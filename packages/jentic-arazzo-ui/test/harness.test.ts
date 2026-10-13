import { expect, test } from 'vitest';
import { mergeActionsForDisplay } from '../src/utils/actionUtils';

test('pure TypeScript action utilities execute under the package-local runner', () => {
  expect(mergeActionsForDisplay([], [{ name: 'finish', type: 'end' }])).toHaveLength(1);
});
