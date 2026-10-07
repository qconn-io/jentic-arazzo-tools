import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const evidence = resolve('../../openspec/changes/compare-workflow-revisions/browser-evidence');
mkdirSync(evidence, { recursive: true });
const observations: unknown[] = [];
test.afterAll(() =>
  writeFileSync(
    `${evidence}/observations.json`,
    JSON.stringify(
      {
        evidenceType:
          'Production ESM consumer Chromium walkthroughs and visual checks; authored inspection, not business execution or human research.',
        sourceHashes: Object.fromEntries(
          readdirSync('src', { recursive: true })
            .filter((f) => /\.(tsx?|css)$/.test(String(f)))
            .map((f) => [
              String(f),
              createHash('sha256')
                .update(readFileSync(`src/${f}`))
                .digest('hex'),
            ]),
        ),
        snapshotHashes: Object.fromEntries(
          ['purchase', 'event', 'partial-purchase', 'formatting'].map((name) => [
            name,
            createHash('sha256')
              .update(readFileSync(`public/examples/revision-review/${name}.json`))
              .digest('hex'),
          ]),
        ),
        esmHash: createHash('sha256').update(readFileSync('dist/arazzo-ui.mjs')).digest('hex'),
        consumerStyleHash: createHash('sha256')
          .update(readFileSync('build/review/arazzo-ui.css'))
          .digest('hex'),
        consumerHash: createHash('sha256')
          .update(readFileSync('build/review/review-example.js'))
          .digest('hex'),
        observations,
      },
      null,
      2,
    ) + '\n',
  ),
);
for (const width of [1440, 480]) {
  test(`purchase before/after, provenance and partial export at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [],
      requests: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
      if (/review\.example/.test(r.url()) || r.method() !== 'GET') requests.push(r.url());
    });
    await page.goto('/review/?pair=purchase');
    await expect(
      page.getByRole('heading', { name: 'Workflow revision review', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Finding category').selectOption('structure');
    await page.getByRole('button', { name: /structure.*revoke-license/ }).click();
    const before = page.getByRole('region', { name: 'Before · baseline-r1' }),
      after = page.getByRole('region', { name: 'After · candidate-r2' });
    await expect(before).toContainText('Compensation declaration');
    await expect(after).toContainText('Absent in this revision');
    await before.getByRole('button', { name: 'Open before location' }).click();
    await expect(before.getByLabel('Selection details', { exact: true })).toContainText(
      'revoke-license',
    );
    if (width === 480) await page.getByRole('button', { name: 'Close details' }).click();
    await page.getByLabel('Finding category').selectOption('mappings');
    await page.getByRole('button', { name: /mappings.*value/ }).click();
    await before.getByRole('button', { name: 'Open before location' }).click();
    await before.getByRole('button', { name: 'Load source pay' }).click();
    await expect(before.getByLabel('Selection details', { exact: true })).toContainText(
      'Revision: baseline-r1',
    );
    if (width === 480) await page.getByRole('button', { name: 'Close details' }).click();
    await after.getByRole('button', { name: 'Open after location' }).click();
    await after.getByRole('button', { name: 'Load source pay' }).click();
    await expect(after.getByLabel('Selection details', { exact: true })).toContainText(
      'Revision: candidate-r2',
    );
    await page.getByLabel('Selection details', { exact: true }).evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({ path: `${evidence}/purchase-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.goto('/review/?pair=partial-purchase');
    await expect(page.getByRole('region', { name: 'Review coverage' })).toContainText(
      'unavailable',
    );
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export JSON' }).click();
    const downloaded = await pending;
    const path = await downloaded.path();
    const exported = JSON.parse(readFileSync(path!, 'utf8'));
    expect(exported.runtimeEffect).toBe('undetermined');
    expect(exported.baseline.revision).toBe('baseline-r1');
    expect(exported.baseline.coverage.some((c: { state: string }) => c.state === 'failed')).toBe(
      true,
    );
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
    observations.push({
      width,
      task: 'purchase/partial',
      exactBeforeAfter: true,
      partialExport: true,
      errors,
      requests,
    });
  });
  test(`event declaration impact and formatting-only review at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/review/?pair=event');
    await page.getByLabel('Finding category').selectOption('contracts');
    await page.getByRole('button', { name: /contracts.*type/ }).click();
    const after = page.getByRole('region', { name: 'After · candidate-e2' });
    await expect(after).toContainText('Direct api');
    await expect(after).toContainText('Potential entry');
    await expect(after).toContainText('Runtime effect undetermined');
    await after.getByRole('button', { name: /Direct api:.*capture-evidence/ }).click();
    await after.getByRole('button', { name: 'Load source events' }).click();
    await expect(after.getByLabel('Selection details', { exact: true })).toContainText(
      'Revision: candidate-e2',
    );
    await page.getByLabel('Selection details', { exact: true }).evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({ path: `${evidence}/event-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.goto('/review/?pair=formatting');
    await expect(page.getByText('0 authored findings · 0 shown')).toBeVisible();
    observations.push({
      width,
      task: 'event/formatting',
      locatedEventUser: true,
      formattingFindings: 0,
    });
  });
}
