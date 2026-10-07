// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ArazzoUI } from '../src/ArazzoUI';
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Element.prototype.scrollIntoView = vi.fn();
test('Systems is optional and preserves exact exchange inspection on workflow return', async () => {
  render(
    <ArazzoUI
      document={readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8')}
      documentIdentity="small"
      viewProfileAdapter="digital-product"
    />,
  );
  const settings = await screen.findByRole('combobox', { name: 'Perspective' });
  expect((settings as HTMLSelectElement).value).toBe('workflow');
  fireEvent.change(settings, { target: { value: 'systems' } });
  await screen.findByRole('region', { name: 'Systems client-journey' });
  const call = screen.getByRole('button', {
    name: 'Expand standard call fulfil-purchase.reserve-and-pay',
  });
  fireEvent.click(call);
  const exchange = screen.getByRole('button', {
    name: 'Inspect system reserve-and-capture.capture-payment',
  });
  fireEvent.click(exchange);
  await screen.findByText('Selected system: reserve-and-capture.capture-payment');
  fireEvent.click(screen.getByRole('button', { name: 'Open exact workflow occurrence' }));
  await screen.findByRole('button', { name: 'Return to Systems context' });
  fireEvent.click(screen.getByRole('button', { name: 'Return to Systems context' }));
  await screen.findByText('Selected system: reserve-and-capture.capture-payment');
});
test('unconfigured documents have no Systems switch and keep standard defaults', async () => {
  render(
    <ArazzoUI document={readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8')} />,
  );
  await waitFor(() => expect(screen.getAllByText('client-journey').length).toBeGreaterThan(0));
  expect(screen.queryByRole('combobox', { name: 'Perspective' })).toBeNull();
});

test('namespaced locations restore descriptive associations and helper expansion', async () => {
  const location = {
    version: 1 as const,
    document: 'small',
    root: 'client-journey',
    view: 'docs' as const,
    subview: 'docs' as const,
    extensions: {
      'jentic.systems': {
        version: 1,
        perspective: 'systems',
        root: 'client-journey',
        collapsed: [],
        expanded: [
          {
            workflowId: 'fulfil-purchase',
            stepId: 'reserve-and-pay',
            path: [],
            associations: ['client-journey.purchase'],
            kind: 'call',
          },
        ],
        selection: {
          workflowId: 'reserve-and-capture',
          stepId: 'capture-payment',
          path: [['fulfil-purchase', 'reserve-and-pay']],
          associations: ['client-journey.purchase'],
          kind: 'exchange',
        },
      },
    },
  };
  const changed = vi.fn();
  render(
    <ArazzoUI
      document={readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8')}
      documentIdentity="small"
      viewProfileAdapter="digital-product"
      defaultLocation={location}
      onLocationChange={changed}
    />,
  );
  await screen.findByText('Selected system: reserve-and-capture.capture-payment');
  await waitFor(() =>
    expect(changed.mock.calls.at(-1)?.[0].extensions['jentic.systems'].selection.stepId).toBe(
      'capture-payment',
    ),
  );
  expect(changed.mock.calls.at(-1)?.[0].selection).toBeUndefined();
});

test('host-controlled locations reject unaccepted Systems perspective changes', async () => {
  const changed = vi.fn();
  const location = {
    version: 1 as const,
    document: 'small',
    root: 'client-journey',
    view: 'docs' as const,
    subview: 'docs' as const,
    extensions: {
      'jentic.systems': {
        version: 1,
        perspective: 'workflow',
        root: 'client-journey',
        expanded: [],
        collapsed: [],
      },
    },
  };
  render(
    <ArazzoUI
      document={readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8')}
      documentIdentity="small"
      viewProfileAdapter="digital-product"
      location={location}
      onLocationChange={changed}
    />,
  );
  const select = await screen.findByRole('combobox', { name: 'Perspective' });
  await waitFor(() => expect(changed).toHaveBeenCalled());
  fireEvent.change(select, { target: { value: 'systems' } });
  await waitFor(() =>
    expect(
      changed.mock.calls.some(
        ([value]) => value.extensions?.['jentic.systems']?.perspective === 'systems',
      ),
    ).toBe(true),
  );
  await waitFor(() => expect((select as HTMLSelectElement).value).toBe('workflow'));
});
test('restores an ordinary controlled step location after Systems', async () => {
  const document = readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8');
  const location = {
    version: 1 as const,
    document: 'small',
    root: 'client-journey',
    view: 'docs' as const,
    subview: 'sequence' as const,
    extensions: {
      'jentic.systems': {
        version: 1,
        perspective: 'systems',
        root: 'client-journey',
        expanded: [],
        collapsed: [],
      },
    },
  };
  const props = {
    document,
    documentIdentity: 'small',
    viewProfileAdapter: 'digital-product' as const,
  };
  const rendered = render(<ArazzoUI {...props} location={location} />);
  await screen.findByRole('region', { name: 'Systems client-journey' });
  rendered.rerender(
    <ArazzoUI
      {...props}
      location={{
        version: 1,
        document: 'small',
        root: 'client-journey',
        view: 'docs',
        subview: 'sequence',
        selection: {
          kind: 'step',
          workflowId: 'client-journey',
          stepId: 'purchase',
          occurrence: [],
        },
      }}
    />,
  );
  await waitFor(() =>
    expect((screen.getByRole('combobox', { name: 'Perspective' }) as HTMLSelectElement).value).toBe(
      'workflow',
    ),
  );
});
test('malformed controlled extension remains diagnostic instead of crashing', async () => {
  class Boundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
    state = { error: '' };
    static getDerivedStateFromError(e: Error) {
      return { error: e.message };
    }
    render() {
      return this.state.error ? <p>Error captured: {this.state.error}</p> : this.props.children;
    }
  }
  const document = readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8');
  const location = {
    version: 1 as const,
    document: 'small',
    root: 'client-journey',
    view: 'docs' as const,
    subview: 'docs' as const,
    extensions: {
      'jentic.systems': {
        version: 1,
        perspective: 'systems',
        root: 'client-journey',
        expanded: [{}],
        collapsed: [],
      },
    },
  };
  render(
    <Boundary>
      <ArazzoUI
        document={document}
        documentIdentity="small"
        viewProfileAdapter="digital-product"
        location={location}
      />
    </Boundary>,
  );
  await screen.findByText(/Unavailable location extension: jentic.systems/);
  expect(screen.queryByText(/Error captured:/)).toBeNull();
});

test('manual workflow-to-Systems switch preserves an already selected nested occurrence', async () => {
  const location = {
    version: 1 as const,
    document: 'small',
    root: 'fulfil-purchase',
    view: 'docs' as const,
    subview: 'sequence' as const,
    selection: {
      kind: 'step' as const,
      workflowId: 'reserve-and-capture',
      stepId: 'capture-payment',
      occurrence: [{ workflowId: 'fulfil-purchase', stepId: 'reserve-and-pay' }],
    },
  };
  render(
    <ArazzoUI
      document={readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8')}
      documentIdentity="small"
      viewProfileAdapter="digital-product"
      defaultLocation={location}
    />,
  );
  await screen.findByRole('region', { name: 'Selection details' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Perspective' }), {
    target: { value: 'systems' },
  });
  await screen.findByText('Selected system: reserve-and-capture.capture-payment');
});

test('host perspective updates preserve selected occurrences without echoing change callbacks', async () => {
  const changed = vi.fn();
  const location = {
    version: 1 as const,
    document: 'small',
    root: 'fulfil-purchase',
    view: 'docs' as const,
    subview: 'sequence' as const,
    selection: {
      kind: 'step' as const,
      workflowId: 'reserve-and-capture',
      stepId: 'capture-payment',
      occurrence: [{ workflowId: 'fulfil-purchase', stepId: 'reserve-and-pay' }],
    },
  };
  const props = {
    document: readFileSync('public/examples/digital-product/arazzo.yaml', 'utf8'),
    documentIdentity: 'small',
    viewProfileAdapter: 'digital-product' as const,
    defaultLocation: location,
    onPerspectiveChange: changed,
  };
  const rendered = render(<ArazzoUI {...props} perspective="workflow" />);
  await screen.findByRole('region', { name: 'Selection details' });
  rendered.rerender(<ArazzoUI {...props} perspective="systems" />);
  await screen.findByText('Selected system: reserve-and-capture.capture-payment');
  expect(changed).not.toHaveBeenCalled();
});
