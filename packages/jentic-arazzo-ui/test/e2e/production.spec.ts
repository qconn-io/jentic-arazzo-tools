import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

type HostState = {
  providerRequests: string[];
  locations: { selection?: { occurrence?: { stepId: string }[] } }[];
};
const identity = JSON.parse(readFileSync('test-output/browser/identity.json', 'utf8'));

const staticPaths = new Set(
  Object.keys(identity.artifacts)
    .filter((path) => /\.(?:m?js|css|svg|png|jpe?g|ico|woff2?|wasm)$/.test(path))
    .map((path) =>
      path.startsWith('build/')
        ? `/${path.slice(6)}`
        : `/consumer/${path.slice('test-output/package-consumer/app/'.length)}`,
    ),
);
test.beforeEach(async ({ page, baseURL }) => {
  const response = await page.request.get('/__identity');
  expect(response.headers()['content-type']).toContain('charset=utf-8');
  expect(await response.json()).toEqual(identity);
  const errors: string[] = [],
    forbidden: string[] = [],
    dependencies: string[] = [];
  const explicitSources = new Set<string>();

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const current = new URL(page.url());
    const allowed = [current.searchParams.get('document'), current.searchParams.get('scenarios')];
    const requested = new URL(request.url());
    const dataRequest = !request.isNavigationRequest() && !staticPaths.has(requested.pathname);
    const selected = allowed.includes(request.url());
    const fixture = requested.pathname === '/fixtures/readiness.json';
    if (dataRequest && !selected && !fixture) dependencies.push(request.url());
    if (
      request.method() !== 'GET' ||
      requested.origin !== new URL(baseURL!).origin ||
      (dataRequest && !selected && !fixture && !explicitSources.has(request.url()))
    )
      forbidden.push(`${request.method()} ${request.url()}`);
  });
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(baseURL!).origin
      ? route.continue()
      : route.abort(),
  );
  await page.addInitScript(() => {
    const originalPush = history.pushState.bind(history),
      originalReplace = history.replaceState.bind(history);
    Object.assign(window, { acceptanceHistory: [] as string[] });
    history.pushState = (...args) => {
      (window as unknown as { acceptanceHistory: string[] }).acceptanceHistory.push('push');
      originalPush(...args);
    };
    history.replaceState = (...args) => {
      (window as unknown as { acceptanceHistory: string[] }).acceptanceHistory.push('replace');
      originalReplace(...args);
    };
  });
  Object.assign(page, {
    acceptanceErrors: errors,
    acceptanceForbidden: forbidden,
    acceptanceDependencies: dependencies,
    acceptanceExplicitSources: explicitSources,
  });
});

test.afterEach(async ({ page }, info) => {
  const state = page as Page & {
    acceptanceErrors: string[];
    acceptanceForbidden: string[];
    acceptanceDependencies: string[];
  };
  expect(state.acceptanceErrors).toEqual([]);
  expect(state.acceptanceForbidden).toEqual([]);
  if (info.title.startsWith('standalone viewing'))
    expect(state.acceptanceDependencies).toHaveLength(1);
  else expect(state.acceptanceDependencies).toEqual([]);
  if (page.url().includes('/consumer/'))
    expect(
      await page.evaluate(
        () => (window as unknown as { acceptanceHistory: string[] }).acceptanceHistory,
      ),
    ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await info.attach('current-production-artifacts', {
    body: JSON.stringify(identity),
    contentType: 'application/json',
  });
  if (info.status === 'passed')
    await info.attach('production-view', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
});

async function hostState(page: Page): Promise<HostState> {
  return page.evaluate(() => (window as unknown as { acceptanceState: HostState }).acceptanceState);
}
const inspector = (page: Page) => page.getByLabel('Selection details', { exact: true });

test('identified installed ESM plain viewing and provider denial', async ({ page }) => {
  await page.goto('/consumer/');
  await expect(page.getByRole('heading', { name: 'Scoped consumers', exact: true })).toBeVisible();
  expect((await hostState(page)).providerRequests).toEqual([]);
  await page.getByRole('combobox', { name: 'Select workflow' }).selectOption('helper');
  await page.getByRole('button', { name: 'Inspect helper.capture', exact: true }).click();
  const panel = inspector(page);
  expect((await hostState(page)).providerRequests).toEqual([]);
  await panel.getByRole('button', { name: 'Load source pay', exact: true }).click();
  await expect(panel).toContainText('failed');
  await expect(panel).toContainText('Explicit host provider denied');
  expect((await hostState(page)).providerRequests).toEqual(['https://example.test/pay.json']);
});

test('standalone viewing discloses setup and acquires only explicitly loaded contracts', async ({
  page,
  baseURL,
}) => {
  const contractRequests: string[] = [];
  page.on('request', (request) => {
    if (/\.(?:openapi|asyncapi)\.yaml/.test(request.url())) contractRequests.push(request.url());
  });
  await page.goto(
    `/?document=${encodeURIComponent(`${baseURL}/examples/digital-product/arazzo.yaml`)}`,
  );
  await expect(page.locator('.arazzo-ui')).toContainText('client-journey');
  const advanced = page.locator('details.arazzo-advanced-tools');
  await expect(advanced).not.toHaveAttribute('open', '');
  await advanced.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Scenario manifest URL' })).toBeVisible();
  expect(contractRequests).toEqual([]);
  await page.getByRole('button', { name: 'diagram', exact: true }).click();
  await page
    .getByRole('button', { name: 'Details for client-journey.purchase', exact: true })
    .click();
  expect(contractRequests).toEqual([]);
  (page as Page & { acceptanceExplicitSources: Set<string> }).acceptanceExplicitSources.add(
    `${baseURL}/examples/digital-product/coordinator.openapi.yaml`,
  );
  await inspector(page)
    .getByRole('button', { name: 'Load source coordinator', exact: true })
    .click();
  await expect(inspector(page)).toContainText('purchaseProduct');
  await expect(inspector(page)).toContainText('requestBody');
  expect(contractRequests).toHaveLength(1);
});

test('repeated calls retain distinct contexts and helpers have Unknown actor', async ({ page }) => {
  await page.goto('/consumer/');
  await page.getByRole('combobox', { name: 'Perspective' }).selectOption('systems');
  await expect(page.locator('.arazzo-systems')).toContainText('Client');
  for (const step of ['first-item', 'second-item']) {
    await page
      .getByRole('button', { name: `Expand standard call entry.${step}`, exact: true })
      .click();
  }
  const rows = page.getByRole('button', { name: /^Inspect system helper.capture · occurrence/ });
  await expect(rows).toHaveCount(2);
  await expect(page.locator('.arazzo-systems')).toContainText('Unknown actor');
  for (const [index, step] of ['first-item', 'second-item'].entries()) {
    await rows.nth(index).click();
    await expect(inspector(page)).toContainText('Unknown actor');
    await inspector(page).getByRole('button', { name: 'Open exact workflow occurrence' }).click();
    await expect(inspector(page)).toContainText(step);
    await inspector(page).getByRole('button', { name: 'Return to Systems context' }).click();
    await inspector(page).getByRole('button', { name: 'Close details' }).click();
  }
  expect((await hostState(page)).providerRequests).toEqual([]);
});

test('operation panel opens both entry occurrences without another workflow choice', async ({
  page,
}) => {
  await page.goto('/consumer/?surface=catalog');
  await page.getByRole('button', { name: 'helper — flow / old', exact: true }).click();
  await page.getByRole('button', { name: 'Consumers of capture', exact: true }).click();
  const consumers = page.getByRole('region', { name: 'Operation consumers' });
  await expect(consumers).toContainText('1 direct authored step uses');
  for (const step of ['first-item', 'second-item']) {
    await consumers
      .getByRole('button', { name: `Inspect call occurrence entry.${step}`, exact: true })
      .click();
    await expect(inspector(page)).toContainText(step);
    await expect(inspector(page)).toContainText('capture');
    await inspector(page).getByRole('button', { name: 'Close details' }).click();
  }
  const state = await hostState(page);
  expect(
    state.locations.some((location) =>
      location.selection?.occurrence?.some((call) => call.stepId === 'first-item'),
    ),
  ).toBe(true);
  expect(
    state.locations.some((location) =>
      location.selection?.occurrence?.some((call) => call.stepId === 'second-item'),
    ),
  ).toBe(true);
});

test('shared defaults show scoped before and after potential impact', async ({ page }) => {
  await page.goto('/consumer/?surface=review');
  await page.getByRole('button', { name: /retryLimit/ }).click();
  for (const label of ['Before · old', 'After · new']) {
    const side = page.getByRole('region', { name: label });
    await expect(side).toContainText('Potential entry: flow');
    await expect(side).toContainText('first-item');
    await expect(side).toContainText('second-item');
    await expect(side).not.toContainText('unrelated');
    await expect(side).toContainText('Runtime effect undetermined');
    await side.getByText('Applicable action use · helper / capture', { exact: true }).click();
    await side.getByRole('button', { name: 'Open applicable use', exact: true }).click();
    await expect(side.getByLabel('Selection details', { exact: true })).toContainText('recover');
    await side.getByRole('button', { name: 'Close details' }).click();
  }
});

test('scenario focus, dismissal and restored guide context', async ({
  page,
  context,
  baseURL,
}, info) => {
  await page.goto(
    `/?document=${baseURL}/examples/digital-product-stress/event-based.arazzo.yaml&scenarios=${baseURL}/examples/digital-product-stress/scenarios.json`,
  );
  await expect(page.locator('details.arazzo-advanced-tools')).toHaveAttribute('open', '');
  const panel = page.getByRole('region', { name: 'Authored scenario guides' });
  const guide = panel.getByRole('button', { name: 'completion-timeout', exact: true });
  await guide.focus();
  await page.keyboard.press('Enter');
  const details = inspector(page);
  await expect(details).toBeVisible();
  await expect(details.getByRole('button', { name: 'Close details', exact: true })).toBeFocused();
  if (info.project.name === 'mobile') {
    await expect(details).toHaveAttribute('role', 'dialog');
    await expect(page.locator('[inert]').first()).toHaveCount(1);
    for (let index = 0; index < 6; index++) {
      await page.keyboard.press('Tab');
      expect(await details.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    }
  }
  await page.keyboard.press('Escape');
  await expect(guide).toBeFocused();
  const shared = page.url();
  const restored = await context.newPage();
  const restoredErrors: string[] = [],
    restoredForbidden: string[] = [];
  restored.on('pageerror', (error) => restoredErrors.push(error.message));
  restored.on('request', (request) => {
    if (
      request.method() !== 'GET' ||
      new URL(request.url()).origin !== new URL(baseURL!).origin ||
      (!request.isNavigationRequest() &&
        !staticPaths.has(new URL(request.url()).pathname) &&
        ![
          new URL(shared).searchParams.get('document'),
          new URL(shared).searchParams.get('scenarios'),
        ].includes(request.url()))
    )
      restoredForbidden.push(request.url());
  });
  await restored.goto(shared);
  await expect(restored.locator('details.arazzo-advanced-tools')).toHaveAttribute('open', '');
  await expect(inspector(restored)).toBeVisible();
  await restored.keyboard.press('Escape');
  await expect(restored.getByRole('region', { name: 'Authored scenario guides' })).toContainText(
    'completion-timeout',
  );
  expect(restoredErrors).toEqual([]);
  expect(restoredForbidden).toEqual([]);
  await restored.close();
});

test('pinned Jentic Asana, Xero and Stripe remain readable without acquisition', async ({
  page,
}) => {
  const documents = {
    asana: ['create-project-add-sections-and-tasks', 'create-project'],
    xero: ['credit-note-application-to-invoice', 'create-credit-note'],
    stripe: ['process-and-manage-one-time-payments', 'create-payment-intent'],
  };
  for (const [name, [workflow, step]] of Object.entries(documents)) {
    await page.goto(`/consumer/?surface=representative&fixture=${name}`);
    await page.getByRole('combobox', { name: 'Select workflow' }).selectOption(workflow);
    await page.getByRole('button', { name: `Inspect ${workflow}.${step}`, exact: true }).click();
    await expect(inspector(page)).toContainText(step);
    expect((await hostState(page)).providerRequests).toEqual([]);
    await page.keyboard.press('Escape');
  }
});
