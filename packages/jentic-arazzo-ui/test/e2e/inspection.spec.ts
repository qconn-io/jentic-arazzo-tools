import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    contractHostState: { loads: number; aborted: boolean; navigation: unknown };
    replaceContractProvider: () => void;
    replaceContractDocument: () => void;
  }
}

const httpDocument = '/examples/digital-product/arazzo.yaml';
const eventDocument = '/examples/digital-product-stress/event-based.arazzo.yaml';

async function selectStep(page: Page, document: string, step: string, workflow?: string) {
  await page.goto(`/?document=${encodeURIComponent(`http://localhost:3000${document}`)}`);
  await page.getByRole('button', { name: 'diagram', exact: true }).click();
  if (workflow) await page.locator('.arazzo-workflow-navigation select').selectOption(workflow);
  await page
    .getByRole('button', {
      name: `Details for ${workflow ?? 'client-journey'}.${step}`,
      exact: true,
    })
    .click();
  await expect(page.locator('.arazzo-contract-panel')).toBeVisible();
  return page.locator('.arazzo-contract-panel');
}

test.describe('API Contract Inspection', () => {
  test('requires explicit loading and retains HTTP request, security and response alternatives', async ({
    page,
  }) => {
    let requests = 0;
    await page.route('**/coordinator.openapi.yaml', async (route) => {
      requests++;
      await route.continue();
    });
    const panel = await selectStep(page, httpDocument, 'purchase');
    await expect(
      panel.getByRole('button', { name: 'Load source coordinator', exact: true }),
    ).toBeVisible();
    expect(requests).toBe(0);
    await panel.getByRole('button', { name: 'Load source coordinator', exact: true }).click();
    await expect(panel).toContainText('located');
    await expect(panel).toContainText('purchaseProduct');
    await expect(panel).toContainText('Idempotency-Key');
    await expect(panel).toContainText('bearerAuth');
    await expect(panel).toContainText('requestBody');
    await expect(panel).toContainText('201');
    await expect(panel).toContainText('409');
    await expect(panel).toContainText('503');
    await expect(panel).toContainText('paymentToken');
    expect(requests).toBe(1);
    await panel.getByRole('button', { name: 'Reload source coordinator', exact: true }).click();
    await expect.poll(() => requests).toBe(2);
    await expect(panel).toContainText('located');
  });

  test('projects receive direction, channel, message payload and correlation details', async ({
    page,
  }) => {
    const panel = await selectStep(page, eventDocument, 'await-ready', 'event-driven-purchase');
    await panel.getByRole('button', { name: 'Load source events', exact: true }).click();
    await expect(panel).toContainText('located');
    await expect(panel).toContainText('receivePurchaseCompleted');
    await expect(panel).toContainText('receive');
    await expect(panel).toContainText('purchase.completed');
    await expect(panel).toContainText('PurchaseCompleted');
    await expect(panel).toContainText('payload');
    await expect(panel).toContainText('correlationId');
    await expect(panel).toContainText('headers');
    await expect(panel).toContainText('READY');
    await expect(panel).toContainText('FAILED');
  });

  test('reports source failure and reloads successfully without changing the step', async ({
    page,
  }) => {
    let failing = true;
    await page.route('**/coordinator.openapi.yaml', async (route) => {
      if (failing) await route.fulfill({ status: 503, body: 'Unavailable contract' });
      else await route.continue();
    });
    const panel = await selectStep(page, httpDocument, 'purchase');
    await panel.getByRole('button', { name: 'Load source coordinator', exact: true }).click();
    await expect(panel).toContainText('failed');
    await expect(panel).not.toContainText('Operation Details');
    failing = false;
    await panel.getByRole('button', { name: 'Reload source coordinator', exact: true }).click();
    await expect(panel).toContainText('located');
  });

  test('loads external commerce separately and exposes its authored workflow target', async ({
    page,
  }) => {
    const panel = await selectStep(page, eventDocument, 'fulfil-command', 'purchase-event-worker');
    await panel.getByRole('button', { name: 'Load source commerce', exact: true }).click();
    await expect(
      panel.getByRole('button', { name: 'Open workflow fulfil-item', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Arazzo document URL' })).toHaveValue(
      `http://localhost:3000${eventDocument}`,
    );
    await panel.getByRole('button', { name: 'Open workflow fulfil-item', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Select workflow' })).toHaveValue(
      'fulfil-item',
    );
    await page.getByRole('button', { name: 'docs', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('HTTP orchestration');
  });
});

// Exercise the public embedded component with host providers rather than the standalone fetch default.
async function mountHost(page: Page, kind: 'replacement' | 'external' | 'unavailable') {
  await page.goto('/');
  const main = await (await page.request.get('/main.tsx')).text();
  const reactUrl = main.match(/from "([^"]*\/react\.js[^"]*)"/)?.[1];
  const domUrl = main.match(/from "([^"]*\/react-dom_client\.js[^"]*)"/)?.[1];
  if (!reactUrl || !domUrl) throw new Error('Cannot identify the development app React modules');
  const componentUrl = `/@fs${new URL('../../src/ArazzoUI.tsx', import.meta.url).pathname}`;
  await page.evaluate(
    async ({ reactUrl, domUrl, componentUrl, kind }) => {
      const React = (await import(reactUrl)).default;
      const dom = await import(domUrl);
      const createRoot = dom.createRoot ?? dom.default.createRoot;
      const { ArazzoUI } = await import(componentUrl);
      document.getElementById('root')!.style.display = 'none';
      const container = document.createElement('div');
      container.style.width = '100vw';
      container.style.height = '100vh';
      document.body.append(container);
      const root = createRoot(container);
      const state = { loads: 0, aborted: false, navigation: null as unknown };
      const doc = {
        arazzo: '1.0.1',
        info: { title: 'Host contract fixture', version: '1' },
        sourceDescriptions: [
          {
            name: 'source',
            type: kind === 'external' ? 'arazzo' : 'openapi',
            url: 'https://contracts.example.test/source',
          },
        ],
        workflows: [
          {
            workflowId: 'host-flow',
            steps: [
              {
                stepId: 'inspect-host',
                ...(kind === 'external'
                  ? { workflowId: '$sourceDescriptions.source.child' }
                  : { operationId: '$sourceDescriptions.source.run' }),
              },
            ],
          },
        ],
      };
      const source =
        kind === 'external'
          ? {
              arazzo: '1.0.1',
              info: { title: 'External fixture', version: '1' },
              sourceDescriptions: [],
              workflows: [{ workflowId: 'child', steps: [{ stepId: 'run', operationId: 'run' }] }],
            }
          : {
              openapi: '3.1.0',
              info: { title: 'Replacement contract', version: '1' },
              paths: {
                '/run': {
                  get: {
                    operationId: 'run',
                    responses: { '200': { description: 'replacement-result' } },
                  },
                },
              },
            };
      const ready = {
        async load(request: { uri: string }) {
          state.loads++;
          return { content: source, retrievalURI: request.uri, revision: 'host-v2' };
        },
      };
      const pending = {
        load(request: { signal: AbortSignal }) {
          state.loads++;
          return new Promise((_, reject) =>
            request.signal.addEventListener(
              'abort',
              () => {
                state.aborted = true;
                reject(new DOMException('Provider replaced', 'AbortError'));
              },
              { once: true },
            ),
          );
        },
      };
      const render = (provider: unknown, document = doc, view = 'diagram') =>
        root.render(
          React.createElement(ArazzoUI, {
            document,
            view,
            sourceProvider: provider,
            onExternalNavigation: (request: unknown) => {
              state.navigation = request;
            },
          }),
        );
      Object.assign(window, {
        contractHostState: state,
        replaceContractProvider: () => render(ready),
        replaceContractDocument: () =>
          render(
            pending,
            {
              ...doc,
              info: { title: 'New primary document', version: '1' },
              sourceDescriptions: [],
            },
            'docs',
          ),
      });
      render(kind === 'replacement' ? pending : kind === 'unavailable' ? undefined : ready);
    },
    { reactUrl, domUrl, componentUrl, kind },
  );
  await page
    .getByRole('button', { name: 'Details for host-flow.inspect-host', exact: true })
    .click();
  return page.locator('.arazzo-contract-panel');
}

test('provider replacement aborts pending work and uses the replacement content', async ({
  page,
}) => {
  const panel = await mountHost(page, 'replacement');
  expect(await page.evaluate(() => window.contractHostState.loads)).toBe(0);
  await panel.getByRole('button', { name: 'Load source source', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.contractHostState.loads)).toBe(1);
  await page.evaluate(() => window.replaceContractProvider());
  await expect.poll(() => page.evaluate(() => window.contractHostState.aborted)).toBe(true);
  await panel.getByRole('button', { name: 'Load source source', exact: true }).click();
  await expect(panel).toContainText('located');
  await expect(panel).toContainText('replacement-result');
});

test('external navigation sends the retrieved URI, revision and workflow to the host', async ({
  page,
}) => {
  const panel = await mountHost(page, 'external');
  await panel.getByRole('button', { name: 'Load source source', exact: true }).click();
  await panel.getByRole('button', { name: 'Open workflow child', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.contractHostState.navigation))
    .toMatchObject({
      documentUri: 'https://contracts.example.test/source',
      workflowId: 'child',
      revision: 'host-v2',
    });
  await expect(page.getByRole('combobox', { name: 'Select workflow' })).toHaveValue('host-flow');
});

test('embedded viewing reports unavailable acquisition without a host provider', async ({
  page,
}) => {
  const panel = await mountHost(page, 'unavailable');
  await expect(panel).toContainText(/provider|unavailable/i);
  expect(await page.evaluate(() => window.contractHostState.loads)).toBe(0);
});

test('document replacement cancels source work and retains the new primary document', async ({
  page,
}) => {
  const panel = await mountHost(page, 'replacement');
  await panel.getByRole('button', { name: 'Load source source', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.contractHostState.loads)).toBe(1);
  await page.evaluate(() => window.replaceContractDocument());
  await expect.poll(() => page.evaluate(() => window.contractHostState.aborted)).toBe(true);
  await expect(
    page.getByRole('heading', { name: 'New primary document', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.arazzo-contract-panel')).toHaveCount(0);
});

test('unavailable-target pack keeps candidate coverage incomplete until every API source is checked', async ({
  page,
}) => {
  const panel = await selectStep(
    page,
    '/examples/digital-product-stress/diagnostics/unavailable-targets.arazzo.yaml',
    'ambiguous-operation',
    'diagnostic-probe',
  );
  await expect(panel).toContainText('getLicenseByKey');
  await panel.getByRole('button', { name: 'Load source license', exact: true }).click();
  await expect(panel).toContainText('Incomplete candidate coverage');
  await expect(panel.getByRole('status')).toContainText('not-loaded');
  await panel.getByRole('button', { name: 'Load source coordinator', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('located');
});

async function routeReferencedContract(
  page: Page,
  state: { revision: number; roots: number; schemas: number; responses: number },
) {
  await page.route('**/coordinator.openapi.yaml', async (route) => {
    state.roots++;
    await route.fulfill({
      json: {
        openapi: '3.1.0',
        info: { title: 'Reference regression', version: String(state.revision) },
        paths: {
          '/purchase': {
            post: {
              operationId: 'purchaseProduct',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: './repair-schema.json#/Base',
                      required: ['name'],
                      properties: { name: { type: 'string' } },
                    },
                  },
                },
              },
              responses: { '200': { $ref: './repair-response.json#/Response' } },
            },
          },
        },
      },
    });
  });
  await page.route('**/repair-schema.json', async (route) => {
    state.schemas++;
    await route.fulfill({
      json: { Base: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
    });
  });
  await page.route('**/repair-response.json', async (route) => {
    state.responses++;
    await route.fulfill({
      json: { Response: { description: `refreshed dependency ${state.revision}` } },
    });
  });
}

test('inspector keeps schema siblings and referenced constraints in separate accessible declarations', async ({
  page,
}) => {
  const state = { revision: 1, roots: 0, schemas: 0, responses: 0 };
  await routeReferencedContract(page, state);
  const panel = await selectStep(page, httpDocument, 'purchase');
  expect(state.roots + state.schemas + state.responses).toBe(0);
  await panel.getByRole('button', { name: 'Load source coordinator', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('located');
  await panel.getByText('Request media types and schemas', { exact: true }).click();
  const request = panel
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: /^Request media types and schemas$/ }) });
  await expect(request.locator('pre')).toContainText('"name"');
  await expect(request.locator('pre')).toContainText('"$ref"');
  await expect(request.locator('pre')).not.toContainText('"id"');
  const references = panel.getByRole('region', {
    name: 'Referenced schema declarations',
    exact: true,
  });
  await references.getByText('./repair-schema.json#/Base — located', { exact: true }).click();
  await expect(references.locator('pre')).toBeVisible();
  await expect(references.locator('pre')).toContainText('"id"');
  await expect(references).toContainText('repair-schema.json#/Base');
  await expect(references).toContainText('Revision: unpinned');
});

test('Reload source refreshes external schema and response dependencies', async ({ page }) => {
  const state = { revision: 1, roots: 0, schemas: 0, responses: 0 };
  await routeReferencedContract(page, state);
  const panel = await selectStep(page, httpDocument, 'purchase');
  await panel.getByRole('button', { name: 'Load source coordinator', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('located');
  await expect(panel).toContainText('refreshed dependency 1');
  state.revision = 2;
  await panel.getByRole('button', { name: 'Reload source coordinator', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('located');
  await expect(panel).toContainText('refreshed dependency 2');
  await expect(panel).not.toContainText('refreshed dependency 1');
  expect(state.roots).toBe(2);
  expect(state.schemas).toBe(2);
  expect(state.responses).toBe(2);
});
