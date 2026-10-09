import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const evidence = resolve('test-output/browser/archival/systems');
mkdirSync(evidence, { recursive: true });
async function systems(page: Page, path: string, profile = 'profile=digital-product') {
  await page.goto(`/?document=${encodeURIComponent(`http://localhost:3000${path}`)}&${profile}`);
  await expect(page.locator('details.arazzo-advanced-tools')).toHaveAttribute('open', '');
  await page.getByRole('combobox', { name: 'Perspective' }).selectOption('systems');
  await expect(page.locator('.arazzo-systems')).toBeVisible();
}
for (const width of [1440, 480]) {
  test(`five participants, exact payment round trip and contained scene at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await systems(page, '/examples/digital-product/arazzo.yaml');
    await expect(page.locator('.arazzo-systems-participants > div')).toHaveCount(5);
    await expect(page.locator('.arazzo-systems-controls')).toContainText(
      'Descriptive implementation: fulfil-purchase',
    );
    await expect(
      page.getByRole('button', { name: 'Inspect system client-journey.purchase', exact: true }),
    ).toHaveCount(1);
    const expand = page.getByRole('button', {
      name: 'Expand standard call fulfil-purchase.reserve-and-pay',
    });
    await expand.focus();
    await page.keyboard.press('Enter');
    const payment = page.getByRole('button', {
      name: 'Inspect system reserve-and-capture.capture-payment',
    });
    await payment.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole(width === 480 ? 'dialog' : 'region', {
      name: 'Selection details',
      exact: true,
    });
    await expect(panel).toContainText('Selected system: reserve-and-capture.capture-payment');
    await expect(panel.getByRole('button', { name: 'Close details' })).toBeFocused();
    await panel.getByRole('button', { name: 'Close details' }).click();
    await expect(payment).toBeFocused();
    await page.keyboard.press('Enter');
    await panel.getByRole('button', { name: 'Open exact workflow occurrence' }).click();
    await expect(panel).toContainText('fulfil-purchase.reserve-and-pay');
    await panel.getByRole('button', { name: 'Return to Systems context' }).click();
    await expect(panel).toContainText('Selected system: reserve-and-capture.capture-payment');
    await panel.getByRole('button', { name: 'Close details' }).click();
    const geometry = await page.locator('.arazzo-systems-canvas').evaluate((el) => ({
      client: el.clientWidth,
      scroll: el.scrollWidth,
      page: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(geometry.page).toBeLessThanOrEqual(geometry.viewport + 1);
    if (width === 480) expect(geometry.scroll).toBeGreaterThan(geometry.client);
    await page.locator('.arazzo-systems-canvas').evaluate((el) => {
      el.scrollLeft = 350;
      el.scrollTop = 100;
    });
    await page.screenshot({ path: `${evidence}/purchase-${width}.png`, fullPage: true });
  });
  test(`declared completion endpoint, correlation and timeout at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await systems(
      page,
      '/examples/digital-product-stress/event-based.arazzo.yaml',
      'systemsProfile=/examples/digital-product-stress/systems-profile.json',
    );
    await page.locator('.arazzo-workflow-navigation select').selectOption('event-driven-purchase');
    await page
      .getByRole('button', { name: 'Inspect system event-driven-purchase.await-ready' })
      .click();
    const panel = page.getByRole(width === 480 ? 'dialog' : 'region', {
      name: 'Selection details',
      exact: true,
    });
    await panel.getByRole('checkbox', { name: 'Show declared event relationships' }).check();
    await expect(panel).toContainText('Contract not established');
    await panel.getByRole('button', { name: 'Load source events', exact: true }).click();
    await expect(panel).toContainText(
      'Declared event association; delivery and correlation success are not established',
    );
    await expect(panel).toContainText('12000');
    await expect(panel).toContainText('$inputs.purchaseId');
    await expect(panel).toContainText('purchase-event-worker');
    await panel.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({ path: `${evidence}/event-${width}.png`, fullPage: true });
    await panel.getByRole('button', { name: 'Open declared event endpoint' }).click();
    await expect(panel).toContainText('publish-ready');
  });
}
test('second occurrence mappings remain 2499 and recursive/row boundaries are inspectable', async ({
  page,
}) => {
  await systems(page, '/examples/digital-product-stress/arazzo.yaml');
  await page.locator('.arazzo-workflow-navigation select').selectOption('batch-fulfilment');
  await page
    .getByRole('button', { name: 'Expand standard call batch-fulfilment.second-item' })
    .click();
  const row = page.getByRole('button', { name: /^Inspect system fulfil-item\./ }).first();
  await row.click();
  const panel = page.getByRole('region', { name: 'Selection details', exact: true });
  await panel
    .getByText('Selected mappings and prerequisites (not evaluated)', { exact: true })
    .click();
  await expect(panel).toContainText('2499');
  await expect(panel).toContainText('second-item');
  await expect(panel).not.toContainText('1299');
  await page.screenshot({ path: `${evidence}/second-item.png`, fullPage: true });
  await systems(page, '/examples/digital-product-stress/boundaries/row-limit.arazzo.yaml');
  await expect(page.locator('.arazzo-systems-controls')).toContainText('200 rows');
  await expect(page.locator('.arazzo-systems')).toContainText('Unknown actor');
  await page.screenshot({ path: `${evidence}/unknown-limit.png`, fullPage: true });
});

test('depth and recursive markers keep the declared target navigable', async ({ page }) => {
  await systems(page, '/examples/digital-product-stress/boundaries/depth-limit.arazzo.yaml');
  for (let i = 0; i <= 8; i++)
    await page
      .getByRole('button', { name: `Expand standard call layer-${i}.next`, exact: true })
      .click();
  await expect(page.locator('.arazzo-systems-controls')).toContainText(
    'Depth limit: eight groups; open layer-9',
  );
  await page.getByRole('button', { name: 'Open full authored workflow', exact: true }).click();
  await expect(page.locator('.arazzo-workflow-navigation select')).toHaveValue('layer-9');
  await systems(page, '/examples/digital-product-stress/boundaries/recursion.arazzo.yaml');
  await page
    .getByRole('button', { name: 'Expand standard call recursive-A.enter-B', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Expand standard call recursive-B.return-A', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Expand standard call recursive-A.enter-B', exact: true })
    .click();
  await expect(page.locator('.arazzo-systems-controls')).toContainText(
    'Recursive association/call',
  );
});
