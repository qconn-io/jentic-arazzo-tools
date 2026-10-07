// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import type { WorkflowLocation } from '../src/types/location';
import { nestedCalls } from './fixtures/connected';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
vi.mock('../src/components/DiagramView', () => ({ DiagramView: () => null }));
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Element.prototype.scrollIntoView = vi.fn();
const location: WorkflowLocation = {
  version: 1,
  document: 'host:doc',
  root: 'checkout',
  view: 'docs',
  subview: 'sequence',
  selection: {
    kind: 'step',
    workflowId: 'payment',
    stepId: 'charge',
    occurrence: [{ workflowId: 'checkout', stepId: 'secondPayment' }],
  },
};
test('default location restores second occurrence, structured mappings, focus and caller return', async () => {
  const changed = vi.fn();
  render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      defaultLocation={location}
      onLocationChange={changed}
    />,
  );
  const details = await screen.findByRole(
    'region',
    { name: 'Selection details' },
    { timeout: 5000 },
  );
  expect(details.textContent).toContain('checkout.secondPayment');
  expect(details.textContent).toContain('payment.charge');
  expect(details.textContent).toContain('$response.body#/id');
  expect(screen.getByRole('region', { name: 'Sequence checkout' })).toBeTruthy();
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect(changed.mock.calls[0][0].selection.occurrence).toEqual(location.selection!.occurrence);
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  const sequence = screen.getByRole('region', { name: 'Sequence checkout' });
  fireEvent.click(
    within(sequence).getByRole('button', {
      name: /Open workflow payment from checkout.secondPayment/,
    }),
  );
  const back = await screen.findByRole('button', { name: /Back to caller checkout.secondPayment/ });
  fireEvent.click(back);
  await waitFor(() =>
    expect(screen.getByRole('region', { name: 'Sequence checkout' }).textContent).toContain(
      'secondPayment',
    ),
  );
});
test('controlled workflow/node values win and report a single conflict', async () => {
  const status = vi.fn();
  const selected = vi.fn();
  render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      location={location}
      activeWorkflowId="audit"
      selectedNodeId={null}
      onLocationStatus={status}
      onNodeSelect={selected}
    />,
  );
  await waitFor(() => expect(status).toHaveBeenCalled());
  expect(status.mock.calls.at(-1)![0].state).toBe('conflict');
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
  expect(selected).not.toHaveBeenCalled();
  expect(status).toHaveBeenCalledTimes(1);
});
test('unavailable extensions preserve the base address and a replacement location cancels obsolete selection', async () => {
  const status = vi.fn();
  const { rerender } = render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      location={{ ...location, extensions: { 'example.guide': { stage: 1 } } }}
      onLocationStatus={status}
    />,
  );
  await screen.findByRole('region', { name: 'Selection details' });
  expect(screen.getByText(/Unavailable location extension: example.guide/)).toBeTruthy();
  rerender(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      location={{ ...location, root: null, selection: undefined }}
      onLocationStatus={status}
    />,
  );
  await screen.findByRole('region', { name: 'Workflow overview' });
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
});
test('cross-document locations are handed to the host once until the matching source arrives', async () => {
  const status = vi.fn();
  const { rerender } = render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:other"
      location={location}
      onLocationStatus={status}
    />,
  );
  await waitFor(() => expect(status).toHaveBeenCalledTimes(1));
  expect(status.mock.calls[0][0].state).toBe('document-request');
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
  rerender(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      location={location}
      onLocationStatus={status}
    />,
  );
  expect((await screen.findByRole('region', { name: 'Selection details' })).textContent).toContain(
    'secondPayment',
  );
});
test('mode switching retains scoped details and controlled location emits one navigation request', async () => {
  const changed = vi.fn();
  const { rerender } = render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      location={location}
      onLocationChange={changed}
    />,
  );
  await screen.findByRole('region', { name: 'Selection details' });
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(2));
  expect(changed.mock.calls[1][0].selection).toBeUndefined();
  expect((await screen.findByRole('region', { name: 'Selection details' })).textContent).toContain(
    'secondPayment',
  );
  rerender(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      location={{ ...location, view: 'split' }}
      onLocationChange={changed}
    />,
  );
  expect((await screen.findByRole('region', { name: 'Selection details' })).textContent).toContain(
    'secondPayment',
  );
});
test('authored-step locations preserve authored identity without inventing an occurrence', async () => {
  const changed = vi.fn();
  render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      defaultLocation={{
        ...location,
        root: 'payment',
        selection: { kind: 'step', workflowId: 'payment', stepId: 'charge' },
      }}
      onLocationChange={changed}
    />,
  );
  expect((await screen.findByRole('region', { name: 'Selection details' })).textContent).toContain(
    'Authored location',
  );
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect(changed.mock.calls[0][0].selection.occurrence).toBeUndefined();
});
test('unsupported inspection profiles explain the unavailable location to the host', async () => {
  const status = vi.fn();
  render(
    <ArazzoUI
      document={{ ...nestedCalls, arazzo: '1.2.0' }}
      documentIdentity="host:doc"
      location={location}
      onLocationStatus={status}
    />,
  );
  await waitFor(() => expect(status).toHaveBeenCalledTimes(1));
  expect(status.mock.calls[0][0].state).toBe('stale');
  expect(status.mock.calls[0][0].message).toContain('inspection profile');
});
test('authored actions retain declaration identity when no call occurrence is selected', async () => {
  const { actionAddress } = await import('../src/utils/location/resolve');
  const { createSnapshot, inspect } = await import('../src/utils/inspection');
  const { buildViewerModel } = await import('../src/utils/model/viewerModel');
  const doc = structuredClone(nestedCalls);
  doc.workflows[1].steps[0].onFailure = [{ name: 'recover', type: 'retry', workflowId: 'audit' }];
  const model = buildViewerModel(inspect(createSnapshot(doc)));
  const action = actionAddress(
    model.stepsByWorkflow.get('payment')!.get('charge')!.effectiveActions.onFailure[0],
    'host:doc',
  );
  const changed = vi.fn();
  render(
    <ArazzoUI
      document={doc}
      documentIdentity="host:doc"
      defaultLocation={{
        ...location,
        root: 'payment',
        selection: { kind: 'action', workflowId: 'payment', stepId: 'charge', action },
      }}
      onLocationChange={changed}
    />,
  );
  await screen.findByRole('region', { name: 'Selection details' });
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect(changed.mock.calls[0][0].selection).toMatchObject({ kind: 'action', action });
  expect(changed.mock.calls[0][0].selection.occurrence).toBeUndefined();
});
test('a host controlling both workflow and location receives the requested root once', async () => {
  const changed = vi.fn();
  const workflow = vi.fn();
  const { rerender } = render(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      location={{ ...location, selection: undefined }}
      activeWorkflowId="checkout"
      onWorkflowSelect={workflow}
      onLocationChange={changed}
    />,
  );
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole('combobox', { name: 'Select workflow' }), {
    target: { value: 'audit' },
  });
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(2));
  expect(changed.mock.calls[1][0].root).toBe('audit');
  expect(workflow).toHaveBeenCalledExactlyOnceWith('audit');
  expect(screen.getByRole('combobox', { name: 'Select workflow' })).toHaveProperty(
    'value',
    'checkout',
  );
  rerender(
    <ArazzoUI
      document={nestedCalls}
      documentIdentity="host:doc"
      location={{ ...location, root: 'audit', subview: 'docs', selection: undefined }}
      activeWorkflowId="audit"
      onWorkflowSelect={workflow}
      onLocationChange={changed}
    />,
  );
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Select workflow' })).toHaveProperty(
      'value',
      'audit',
    ),
  );
  expect(changed).toHaveBeenCalledTimes(2);
});
