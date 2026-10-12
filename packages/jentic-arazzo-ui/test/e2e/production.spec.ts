import { test, expect, type Page } from '@playwright/test';
import { staticPaths, installProductionChecks, inspector } from './productionSupport';

type HostState = {
  providerRequests: string[];
  locations: { selection?: { occurrence?: { stepId: string }[] } }[];
};
installProductionChecks();

test('UX installed embed preserves prerequisite order, geometry modality and raw sizing', async ({
  page,
}, info) => {
  await page.goto('/consumer/?surface=embedded-repair');
  const viewer = page.locator('.embedded-repair');
  await expect(viewer.getByRole('list', { name: 'Ordered interactions' })).toHaveCount(1);
  const list = viewer.locator('ol[aria-label="Ordered interactions"]');
  const root = viewer.locator('button[aria-label^="Inspect entry · prerequisite"]');
  await expect(root).toHaveCount(1);
  expect(
    await root.evaluate(
      (node) =>
        node.closest('ol') === null &&
        !!(
          node.compareDocumentPosition(
            document.querySelector('ol[aria-label="Ordered interactions"]')!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  const first = list.locator('button[aria-label^="Inspect entry.first-item · call"]');
  const dependencies = list.locator(
    'button[aria-label^="Inspect entry.first-item · prerequisite"]',
  );
  await expect(dependencies).toHaveCount(2);
  await expect(dependencies.nth(0)).toContainText('missing');
  await expect(dependencies.nth(1)).toContainText('external-step');
  expect(
    await first.evaluate((node) =>
      [
        ...node
          .closest('li')!
          .querySelectorAll('button[aria-label^="Inspect entry.first-item · prerequisite"]'),
      ].every(
        (before) => !!(before.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING),
      ),
    ),
  ).toBe(true);
  const prerequisites = list.locator('button[aria-label^="Inspect helper · prerequisite"]');
  await expect(prerequisites).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const path = `entry.${i ? 'second' : 'first'}-item`;
    await expect(prerequisites.nth(i)).toHaveAttribute('aria-label', new RegExp(path));
    expect(
      await prerequisites.nth(i).evaluate((node) => {
        const item = node.closest('li')!;
        const next = item.nextElementSibling!;
        return (
          item.querySelector('button[aria-label*=" · call"]') !== null &&
          next.querySelector('button[aria-label^="Inspect helper.capture · operation"]') !== null
        );
      }),
    ).toBe(true);
  }
  await info.attach('embedded-prerequisites', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  const navigation = viewer.locator('.arazzo-workflow-navigation');
  await navigation.evaluate((node) => {
    node.setAttribute('inert', 'preserved');
    node.setAttribute('aria-hidden', 'false');
  });
  const origin = prerequisites.nth(1);
  await origin.click();
  await expect(page.getByRole('dialog', { name: 'Selection details' })).toHaveAttribute(
    'aria-modal',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Wide host', exact: true })).toBeVisible();
  expect(
    await page
      .getByRole('button', { name: 'Wide host', exact: true })
      .evaluate((node) => node.closest('[inert]') === null),
  ).toBe(true);
  await expect(inspector(page)).toContainText('entry.second-item');
  await expect(
    inspector(page).locator('[data-reading-section="Caller-supplied parameters"]'),
  ).toContainText('2499');
  const close = inspector(page).getByRole('button', { name: 'Close details' });
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  expect(await inspector(page).evaluate((node) => node.contains(document.activeElement))).toBe(
    true,
  );
  await info.attach('embedded-covering', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.keyboard.press('Escape');
  await expect(origin).toBeFocused();
  await expect(navigation).toHaveAttribute('inert', 'preserved');
  await expect(navigation).toHaveAttribute('aria-hidden', 'false');
  await navigation.evaluate((node) => {
    node.removeAttribute('inert');
    node.removeAttribute('aria-hidden');
  });
  if (info.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Wide host', exact: true }).click();
    await origin.click();
    await expect(page.getByRole('region', { name: 'Selection details' })).not.toHaveAttribute(
      'aria-modal',
    );
    await page.getByRole('button', { name: 'Narrow host', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Selection details' })).toBeVisible();
    await page.getByRole('button', { name: 'Wide host', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Selection details' })).toBeVisible();
    await expect(viewer.locator('[inert]')).toHaveCount(0);
    await info.attach('embedded-nonmodal', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Narrow host', exact: true }).click();
  }
  await origin.click();
  await expect(page.getByRole('dialog', { name: 'Selection details' })).toBeVisible();
  await origin.evaluate((node) => node.remove());
  await page.keyboard.press('Escape');
  await expect(viewer.getByRole('combobox', { name: 'Select workflow' })).toBeFocused();
  await viewer.getByRole('button', { name: 'Step descriptions', exact: true }).click();
  await viewer.getByRole('combobox', { name: 'Select workflow' }).selectOption('helper');
  await viewer.getByRole('button', { name: 'Step descriptions', exact: true }).click();
  const long = viewer.locator('.timeline-item-last');
  await expect(long.locator('h3 button')).toBeVisible();
  await expect(long.locator('h3 button')).toContainText('a-very-long-authored-step-title');
  expect(
    await long.evaluate((node) => {
      const marker = node.querySelector('.timeline-marker')!.getBoundingClientRect();
      const heading = node.querySelector('h3')!.getBoundingClientRect();
      return (
        heading.left >= marker.right && heading.right <= node.getBoundingClientRect().right + 1
      );
    }),
  ).toBe(true);
  await long.locator('h3 button').focus();
  await expect(long.locator('h3 button')).toBeFocused();
  await info.attach('embedded-long-timeline', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Replace supported profile' }).click();
  await expect(viewer).toContainText('has no semantic inspection profile');
  await expect(viewer.locator('pre')).toContainText('1.2.0');
  await expect(viewer.locator('.arazzo-sequence')).toHaveCount(0);
  const bounds = await viewer.boundingBox();
  expect(bounds?.width).toBe(400);
  expect(bounds?.height).toBe(700);
  await info.attach('embedded-unsupported', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Replace supported profile' }).click();
  await expect(viewer.getByRole('region', { name: 'Sequence entry' })).toBeVisible();
  expect((await viewer.boundingBox())?.height).toBe(700);
});
async function choose(page: Page, name: string) {
  const disclosure = page.locator('details.arazzo-more-views');
  if (!(await disclosure.evaluate((element) => (element as HTMLDetailsElement).open)))
    await disclosure.locator(':scope > summary').click();
  await disclosure.getByRole('button', { name, exact: true }).click();
}

async function hostState(page: Page): Promise<HostState> {
  return page.evaluate(() => (window as unknown as { acceptanceState: HostState }).acceptanceState);
}

test('identified installed ESM plain viewing and provider denial', async ({ page }) => {
  await page.goto('/consumer/');
  await expect(page.locator('.arazzo-document-identity')).toContainText('Scoped consumers');
  expect((await hostState(page)).providerRequests).toEqual([]);
  await page.getByRole('combobox', { name: 'Select workflow' }).selectOption('helper');
  await page.getByRole('button', { name: 'Inspect helper.capture', exact: true }).click();
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
  await page.getByText('Load guides from a URL', { exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Guide file URL' })).toBeVisible();
  expect(contractRequests).toEqual([]);
  await choose(page, 'Workflow diagram');
  await page.getByRole('button', { name: 'Inspect client-journey.purchase', exact: true }).click();
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
  await choose(page, 'Systems view');
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
  await panel.locator(':scope > details > summary').click();
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
    await page.getByRole('button', { name: `Inspect ${workflow}.${step}`, exact: true }).click();
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
    await choose(page, 'Flowchart');
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
