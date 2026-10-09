import { test, expect, type Page } from '@playwright/test';
import { staticPaths, installProductionChecks, inspector } from './productionSupport';

type HostState = {
  providerRequests: string[];
  locations: { selection?: { occurrence?: { stepId: string }[] } }[];
};
installProductionChecks();

async function hostState(page: Page): Promise<HostState> {
  return page.evaluate(() => (window as unknown as { acceptanceState: HostState }).acceptanceState);
}

test('identified installed ESM plain viewing and provider denial', async ({ page }) => {
  await page.goto('/consumer/');
  await expect(page.getByRole('heading', { name: 'Scoped consumers', exact: true })).toBeVisible();
  expect((await hostState(page)).providerRequests).toEqual([]);
  await page.getByRole('combobox', { name: 'Select workflow' }).selectOption('helper');
  await page.getByRole('button', { name: 'View details for helper.capture', exact: true }).click();
  const panel = inspector(page);
  expect((await hostState(page)).providerRequests).toEqual([]);
  await panel.getByRole('button', { name: 'Load API description pay', exact: true }).click();
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
  await advanced.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Guide file URL' })).toBeVisible();
  expect(contractRequests).toEqual([]);
  await page.getByRole('button', { name: 'Workflow diagram', exact: true }).click();
  await page
    .getByRole('button', { name: 'View details for client-journey.purchase', exact: true })
    .click();
  expect(contractRequests).toEqual([]);
  (page as Page & { acceptanceExplicitSources: Set<string> }).acceptanceExplicitSources.add(
    `${baseURL}/examples/digital-product/coordinator.openapi.yaml`,
  );
  await inspector(page)
    .getByRole('button', { name: 'Load API description coordinator', exact: true })
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
  await expect(page.locator('details.arazzo-advanced-tools')).not.toHaveAttribute('open', '');
  const panel = page.getByRole('region', { name: 'Guided walkthroughs' });
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
  await expect(restored.locator('details.arazzo-advanced-tools')).not.toHaveAttribute('open', '');
  await expect(inspector(restored)).toBeVisible();
  await restored.keyboard.press('Escape');
  await expect(restored.getByRole('region', { name: 'Guided walkthroughs' })).toContainText(
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
    await page
      .getByRole('button', { name: `View details for ${workflow}.${step}`, exact: true })
      .click();
    await expect(inspector(page)).toContainText(step);
    expect((await hostState(page)).providerRequests).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

for (const fixture of ['petstore', 'long-label'] as const) {
  test(`F1 flowchart labels stay readable with contained keyboard scrolling: ${fixture}`, async ({
    page,
    baseURL,
  }, info) => {
    if (fixture === 'long-label') {
      const url = `${baseURL}/examples/acceptance-long.arazzo.yaml`;
      await page.route(url, (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            arazzo: '1.0.1',
            info: { title: 'Long-label flowchart', version: '1' },
            sourceDescriptions: [{ name: 'petstoreAPI', type: 'openapi', url: './api.yaml' }],
            workflows: [
              {
                workflowId: 'long-workflow',
                summary: 'Inspect a long authored operation',
                steps: [
                  {
                    stepId:
                      'findAvailablePetsWithAnExtremelyLongAuthoredIdentifierThatMustStayReadable',
                    operationId: '$sourceDescriptions.petstoreAPI.findPetsByStatus',
                  },
                ],
              },
            ],
          }),
        }),
      );
      await page.goto(`/?document=${encodeURIComponent(url)}`);
    } else await page.goto('/');
    await page.getByRole('button', { name: 'Flowchart', exact: true }).click();
    const region = page.getByRole('region', { name: 'Flowchart', exact: true });
    const svg = region.locator('svg');
    await expect(svg).toBeVisible();
    const sizes = await svg.evaluate((node) => {
      if (!(node instanceof SVGSVGElement)) throw new Error('Expected a rendered SVG');
      const scale = Math.abs(node.getScreenCTM()?.a ?? 1);
      return [...node.querySelectorAll('text, .nodeLabel p, .edgeLabel p')].map(
        (label) => parseFloat(getComputedStyle(label).fontSize) * scale,
      );
    });
    expect(sizes.length, 'Flowchart must contain actual readable labels').toBeGreaterThan(0);
    expect(
      Math.min(...sizes),
      'F1-flowchart-readability: displayed labels must be at least 12px',
    ).toBeGreaterThanOrEqual(12);
    await expect(region).toHaveAttribute('tabindex', '0');
    await region.focus();
    if (await region.evaluate((node) => node.scrollWidth > node.clientWidth)) {
      await page.keyboard.press('ArrowRight');
      await expect
        .poll(() => region.evaluate((node) => node.scrollLeft), {
          message: 'Flowchart content must be keyboard reachable in its contained scroll region',
        })
        .toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      info.project.use.viewport!.width + 1,
    );
    await info.attach(`${fixture}-flowchart`, {
      body: await region.screenshot(),
      contentType: 'image/png',
    });
  });
}
