import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const evidence = resolve('../../openspec/changes/add-workflow-capability-catalog/browser-evidence');
mkdirSync(evidence, { recursive: true });
const observations: unknown[] = [];
const catalog = 'http://localhost:3000/examples/catalog.json';
const hashes = Object.fromEntries(
  readdirSync('build')
    .filter((f) => /\.(js|css)$/.test(f))
    .map((f) => [
      f,
      createHash('sha256')
        .update(readFileSync(`build/${f}`))
        .digest('hex'),
    ]),
);
test.afterAll(() =>
  writeFileSync(
    `${evidence}/observations.json`,
    JSON.stringify(
      {
        evidenceType:
          'Production Chromium task walkthroughs; authored inspection only, no business operations or human-comprehension research.',
        buildHashes: hashes,
        manifestHash: createHash('sha256')
          .update(readFileSync('public/examples/catalog.json'))
          .digest('hex'),
        observations,
      },
      null,
      2,
    ) + '\n',
  ),
);
for (const width of [1440, 480]) {
  test(`catalog discovery and classified reverse usage at ${width}`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    const requests: string[] = [],
      errors: string[] = [];
    page.on('request', (r) => {
      if (r.method() !== 'GET' || /api\.example/.test(r.url()))
        requests.push(`${r.method()} ${r.url()}`);
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/?catalog=${encodeURIComponent(catalog)}`);
    const script = Object.keys(hashes).find(
      (f) => f.startsWith('arazzo-ui-standalone.') && f.endsWith('.js'),
    )!;
    await expect(page.locator('script[src]')).toHaveAttribute('src', `./${script}`);
    await expect(page.getByRole('heading', { name: 'Workflow capability catalog' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Catalog coverage' })).toContainText(
      'Partial coverage',
    );
    await page.getByLabel('Capability', { exact: true }).selectOption('purchase');
    await page
      .getByRole('button', {
        name: 'full-stress-journey — http-commerce / sample-2026-10-07',
        exact: true,
      })
      .click();
    const details = page.getByRole('region', { name: 'Catalog details' });
    await expect(details).toContainText('Owner: unknown');
    await expect(details).toContainText('Role: entry');
    const shared = page.url();
    expect(new URL(shared).searchParams.get('catalog')).toBe(catalog);
    const fresh = await context.newPage();
    await fresh.setViewportSize({ width, height: 1000 });
    await fresh.goto(shared);
    await expect(
      fresh
        .getByRole('region', { name: 'Catalog details' })
        .getByRole('heading', { name: 'full-stress-journey', exact: true }),
    ).toBeVisible();
    await fresh.close();
    await page.getByLabel('Search', { exact: true }).fill('reconcile-payment');
    await page
      .getByRole('button', {
        name: 'reconcile-payment — http-commerce / sample-2026-10-07',
        exact: true,
      })
      .click();
    await expect(details).toContainText('retry from capture-authorized-payment');
    await details.getByRole('button', { name: /retry from capture-authorized-payment/ }).click();
    const viewer = page.getByRole('region', { name: 'Selected workflow viewer' });
    await expect(
      page.getByRole(width === 480 ? 'dialog' : 'region', { name: 'Selection details' }),
    ).toContainText('retry');
    await page.keyboard.press('Escape');
    await details.getByRole('button', { name: 'Consumers of capturePayment', exact: true }).click();
    const consumers = details.getByRole('region', { name: 'Operation consumers' });
    await expect(consumers).toContainText('direct authored step uses');
    await consumers.getByText('Exact operation declaration', { exact: true }).click();
    await expect(consumers).toContainText('capturePayment');
    await expect(consumers).toContainText('/captures');
    await page.getByLabel('Capability', { exact: true }).selectOption('inspection-diagnostics');
    await page.getByLabel('Search', { exact: true }).fill('cycle-A');
    await page
      .getByRole('button', {
        name: 'cycle-A — prerequisite-cycle / sample-2026-10-07',
        exact: true,
      })
      .click();
    await expect(details).toContainText('prerequisite from cycle-B');
    await expect(viewer).toContainText('prerequisite-only cycle');
    await page
      .getByRole('region', { name: 'Catalog coverage' })
      .getByText(/Source coverage/)
      .click();
    await expect(page.getByRole('region', { name: 'Catalog coverage' })).toContainText(
      'not-supplied.arazzo.yaml',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByLabel('Search', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Product', { exact: true })).toBeFocused();
    await page.screenshot({ path: `${evidence}/catalog-${width}.png`, fullPage: true });
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    observations.push({
      width,
      shared,
      capabilityDiscovery: true,
      unknownOwnership: true,
      recovery: 'retry',
      prerequisiteCycle: true,
      operation: 'capturePayment',
      failedSourceVisible: true,
      keyboard: true,
      containedWidth: true,
      businessRequests: requests,
      browserErrors: errors,
    });
  });
}

test('rejects unavailable shared catalog revision and preserves plain document viewing', async ({
  page,
}) => {
  const shared = new URL(`http://localhost:3000/?catalog=${encodeURIComponent(catalog)}`);
  shared.searchParams.set(
    'location',
    JSON.stringify({
      version: 1,
      document: 'http://localhost:3000/examples/digital-product-stress/arazzo.yaml',
      revision: 'sample-2026-10-07',
      root: 'full-stress-journey',
      view: 'docs',
      subview: 'docs',
      extensions: {
        'jentic.catalog': {
          catalogId: 'digital-product-reference',
          catalogRevision: 'missing',
          documentId: 'http-commerce',
          revision: 'sample-2026-10-07',
        },
      },
    }),
  );
  await page.goto(shared.href);
  await expect(page.getByRole('alert')).toContainText('Unavailable catalog revision');
  await page.goto('/?document=http://localhost:3000/examples/digital-product/arazzo.yaml');
  await expect(page.locator('.arazzo-ui')).toContainText('client-journey');
  await expect(page.getByRole('heading', { name: 'Workflow capability catalog' })).toHaveCount(0);
  observations.push({ unavailableSharedRevision: true, plainDocumentDefault: true });
});
