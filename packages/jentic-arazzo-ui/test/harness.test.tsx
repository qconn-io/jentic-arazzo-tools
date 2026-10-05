// @vitest-environment jsdom
import React from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ViewModeControl } from '../src/components/ViewModeControl';
import '../src/components/WorkflowTabs.css';

test('TSX components and CSS imports execute with jsdom', () => {
  const change = vi.fn();
  render(<ViewModeControl value="docs" onChange={change} />);
  fireEvent.click(screen.getByRole('button', { name: 'diagram' }));
  expect(change).toHaveBeenCalledExactlyOnceWith('diagram');
});
