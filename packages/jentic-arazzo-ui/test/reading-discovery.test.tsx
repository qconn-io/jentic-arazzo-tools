// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { loadDocument } from '../src/utils/loading/loadDocument';
import { nestedCalls } from './fixtures/connected';
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg />' })) },
}));
Element.prototype.scrollIntoView = vi.fn();

test('Docs bulk disclosure follows the rendered workflow details across overview selection', async () => {
  render(<ArazzoUI document={nestedCalls} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Step descriptions' }));
  const detail = document.querySelector<HTMLDetailsElement>('.workflow-details')!;
  expect(detail.open).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Collapse All' }));
  expect(detail.open).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Expand All' }));
  expect(detail.open).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'All workflows' }));
  expect(document.querySelector('.workflow-details')).toBeNull();
  expect(screen.queryByRole('button', { name: /^(Expand|Collapse) All$/ })).toBeNull();
  fireEvent.change(screen.getByRole('combobox', { name: 'Select workflow' }), {
    target: { value: 'checkout' },
  });
  expect(document.querySelector<HTMLDetailsElement>('.workflow-details')?.open).toBe(true);
  expect(screen.getByRole('button', { name: 'Collapse All' })).toBeTruthy();
});

test('authored search scopes duplicate step IDs and operation locators without guessing occurrences', async () => {
  const doc = structuredClone(nestedCalls);
  doc.workflows[2].steps[0].stepId = 'charge';
  render(<ArazzoUI document={doc} />);
  const search = await screen.findByRole('searchbox', { name: 'Search workflows and steps' });
  fireEvent.change(search, { target: { value: 'charge' } });
  const results = screen.getByRole('list', { name: 'Search results' });
  expect(
    within(results).getByRole('button', { name: 'Inspect authored step payment.charge' }),
  ).toBeTruthy();
  fireEvent.click(
    within(results).getByRole('button', { name: 'Inspect authored step audit.charge' }),
  );
  const details = await screen.findByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('audit.charge');
  expect(details.textContent).toContain('Authored location (no call occurrence selected)');
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  fireEvent.change(search, { target: { value: 'STORE.API.RECORD' } });
  expect(screen.getByRole('button', { name: 'Inspect authored step audit.charge' })).toBeTruthy();
  fireEvent.change(search, { target: { value: 'enabled' } });
  expect(screen.queryByRole('button', { name: /Inspect authored step/ })).toBeNull();
});
test('search opens observation-250 beyond the sequence display budget', async () => {
  const doc = (
    await loadDocument(
      readFileSync(
        'public/examples/digital-product-stress/boundaries/row-limit.arazzo.yaml',
        'utf8',
      ),
    )
  ).document;
  render(<ArazzoUI document={doc} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence diagram' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'observation-250' } });
  fireEvent.click(
    screen.getByRole('button', { name: /Inspect authored step .*\.observation-250/ }),
  );
  expect(screen.getByRole('region', { name: 'Selection details' }).textContent).toContain(
    'observation-250',
  );
  expect(document.querySelectorAll('[data-sequence-id]')).toHaveLength(200);
});
test('overview filters classified incoming and outgoing calls, prerequisites, goto and retry', async () => {
  const doc = (
    await loadDocument(readFileSync('public/examples/digital-product-stress/arazzo.yaml', 'utf8'))
  ).document;
  render(<ArazzoUI document={doc} />);
  fireEvent.click(await screen.findByRole('button', { name: 'All workflows' }));
  const overview = screen.getByRole('region', { name: 'Workflow overview' });
  expect(overview.querySelectorAll('article')).toHaveLength(18);
  expect(within(overview).getAllByRole('button', { name: /^Open workflow / })).toHaveLength(18);
  expect(overview.querySelectorAll('details[open]')).toHaveLength(0);
  const disclosures = within(overview).getAllByText(/^Relationships \(/);
  expect(disclosures.length).toBeGreaterThan(0);
  disclosures.forEach((disclosure) => fireEvent.click(disclosure));
  fireEvent.click(within(overview).getByText('Relationship filters'));
  const filter = within(overview).getByRole('combobox', { name: 'Relationship type' });
  for (const [type, label] of [
    ['call', 'Call'],
    ['prerequisite', 'Prerequisite'],
    ['goto', 'One-way goto'],
    ['retry', 'Retry recovery'],
  ]) {
    fireEvent.change(filter, { target: { value: type } });
    const links = overview.querySelectorAll('[data-relationship-type]');
    expect(links.length).toBeGreaterThan(0);
    expect([...links].every((el) => el.getAttribute('data-relationship-type') === type)).toBe(true);
    expect(overview.textContent).toContain(label);
    expect(overview.textContent).toContain('Incoming');
    expect(overview.textContent).toContain('Outgoing');
  }
});

test('host selection supersedes an unaccepted authored search navigation', async () => {
  const selected = vi.fn();
  const mount = (workflow: string, selection: string | null) => (
    <ArazzoUI
      document={nestedCalls}
      activeWorkflowId={workflow}
      selectedNodeId={selection}
      onNodeSelect={selected}
    />
  );
  const { rerender } = render(mount('checkout', null));
  const search = await screen.findByRole('searchbox');
  fireEvent.change(search, { target: { value: 'record' } });
  fireEvent.click(screen.getByRole('button', { name: 'Inspect authored step audit.record' }));
  rerender(mount('checkout', 'host-selected-node'));
  rerender(mount('audit', 'host-selected-node'));
  expect(screen.queryByRole('region', { name: 'Selection details' })).toBeNull();
  expect(selected).not.toHaveBeenCalled();
});

test('reading view has scoped selection and overview has no invented sequence', async () => {
  render(<ArazzoUI document={nestedCalls} />);
  const group = await screen.findByRole('group', { name: 'Reading view' });
  expect(within(group).getByText('Reading view')).toBeTruthy();
  expect(
    within(group).getByRole('button', { name: 'Step descriptions' }).getAttribute('aria-pressed'),
  ).toBe('false');
  expect(
    within(group).getByRole('button', { name: 'Sequence diagram' }).getAttribute('aria-pressed'),
  ).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'All workflows' }));
  expect(screen.queryByRole('group', { name: 'Reading view' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Sequence diagram for/ })).toBeNull();
});
test('implicit embedded reading selects sequence without requesting a host view change', async () => {
  const change = vi.fn();
  render(<ArazzoUI document={nestedCalls} onViewChange={change} />);
  expect(await screen.findByRole('region', { name: 'Sequence checkout' })).toBeTruthy();
  expect(change).not.toHaveBeenCalled();
});
test('an explicit descriptions layout retains its historical initial representation', async () => {
  render(<ArazzoUI document={nestedCalls} view="docs" />);
  await screen.findByRole('button', { name: 'Inspect checkout.firstPayment' });
  expect(screen.queryByRole('region', { name: 'Sequence checkout' })).toBeNull();
});
test('More views keeps alternatives reachable and Side by side reversible', async () => {
  render(<ArazzoUI document={nestedCalls} />);
  await screen.findByRole('region', { name: 'Sequence checkout' });
  fireEvent.click(screen.getByText('More views'));
  const alternatives = screen.getByRole('group', { name: 'More views' });
  expect(within(alternatives).getByRole('button', { name: 'Workflow diagram' })).toBeTruthy();
  expect(within(alternatives).getByRole('button', { name: 'Flowchart' })).toBeTruthy();
  const sideBySide = within(alternatives).getByRole('button', { name: 'Side by side' });
  fireEvent.click(sideBySide);
  expect(sideBySide.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(sideBySide);
  expect(sideBySide.getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('region', { name: 'Sequence checkout' })).toBeTruthy();
});
test('direct sequence request waits for the controlled layout and emits only one request', async () => {
  const change = vi.fn();
  const mount = (view: 'diagram' | 'docs' | 'split', workflow = 'checkout', doc = nestedCalls) => (
    <ArazzoUI document={doc} view={view} activeWorkflowId={workflow} onViewChange={change} />
  );
  const { rerender } = render(mount('diagram'));
  const direct = await screen.findByRole('button', { name: 'Sequence diagram' });
  fireEvent.click(direct);
  fireEvent.click(direct);
  expect(change).toHaveBeenCalledExactlyOnceWith('docs');
  expect(screen.queryByRole('region', { name: 'Sequence checkout' })).toBeNull();
  rerender(mount('docs'));
  expect(await screen.findByRole('region', { name: 'Sequence checkout' })).toBeTruthy();
  rerender(mount('split'));
  fireEvent.click(screen.getByRole('button', { name: 'Step descriptions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sequence diagram' }));
  expect(screen.getByRole('region', { name: 'Sequence checkout' })).toBeTruthy();
  expect(change).toHaveBeenCalledTimes(1);
});
test('unaccepted direct sequence request is cancelled on workflow or document replacement', async () => {
  const mount = (view: 'diagram' | 'docs', workflow: string, doc = nestedCalls) => (
    <ArazzoUI document={doc} view={view} activeWorkflowId={workflow} onViewChange={vi.fn()} />
  );
  const { rerender } = render(mount('diagram', 'checkout'));
  fireEvent.click(await screen.findByRole('button', { name: 'Sequence diagram' }));
  rerender(mount('diagram', 'payment'));
  rerender(mount('docs', 'checkout'));
  expect(
    await screen.findByRole('button', { name: 'Step descriptions', pressed: true }),
  ).toBeTruthy();
  rerender(mount('diagram', 'checkout'));
  fireEvent.click(screen.getByRole('button', { name: 'Sequence diagram' }));
  rerender(mount('diagram', 'checkout', structuredClone(nestedCalls)));
  await screen.findByRole('button', { name: 'Sequence diagram' });
  rerender(mount('docs', 'checkout'));
  expect(
    await screen.findByRole('button', { name: 'Step descriptions', pressed: true }),
  ).toBeTruthy();
});
