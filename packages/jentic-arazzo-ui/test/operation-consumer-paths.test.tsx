// @vitest-environment jsdom
import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { ArazzoCatalog } from '../src/ArazzoCatalog';
import { consumerCatalog } from './fixtures/upstream-readiness';

vi.mock('../src/ArazzoUI', () => ({ ArazzoUI: () => <div>Selected workflow</div> }));
afterEach(cleanup);

it('opens both operation entry call paths without a separate workflow selection', async () => {
  const selection = vi.fn();
  render(<ArazzoCatalog manifest={consumerCatalog()} onSelectionChange={selection} />);
  const operation = (await screen.findByLabelText('Operation')) as HTMLSelectElement;
  const options = [...operation.options].filter((option) => option.value);
  expect(options).toHaveLength(1);
  fireEvent.change(operation, { target: { value: options[0].value } });
  const panel = screen.getByRole('region', { name: 'Operation consumers' });
  expect(panel.textContent).toContain('1 direct authored step uses');
  const paths = within(panel).getAllByRole('button', { name: /Inspect call occurrence/ });
  expect(paths).toHaveLength(2);
  fireEvent.click(paths[0]);
  expect(selection.mock.calls.at(-1)?.[0].location.selection.occurrence).toEqual([
    { workflowId: 'entry', stepId: 'first-item' },
  ]);
  fireEvent.click(within(panel).getAllByRole('button', { name: /Inspect call occurrence/ })[1]);
  expect(selection.mock.calls.at(-1)?.[0].location.selection.occurrence).toEqual([
    { workflowId: 'entry', stepId: 'second-item' },
  ]);
  expect(selection).toHaveBeenCalledTimes(2);
  expect(panel.textContent).not.toContain('unrelated / flow');
});
