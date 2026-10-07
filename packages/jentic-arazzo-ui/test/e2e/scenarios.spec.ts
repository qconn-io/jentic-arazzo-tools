import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve('public/examples');
const evidence = resolve('../../openspec/changes/add-authored-scenario-explorer/browser-evidence');
mkdirSync(evidence, { recursive: true });
const records: unknown[] = [];
const build = resolve('build');
function hashFiles(directory: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, name.name);
    if (name.isDirectory()) Object.assign(values, hashFiles(path));
    else
      values[path.replace(resolve('.') + '/', '')] = createHash('sha256')
        .update(readFileSync(path))
        .digest('hex');
  }
  return values;
}
const buildHashes = Object.fromEntries(
  (existsSync(build) ? readdirSync(build) : [])
    .filter((name) => /\.(js|css)$/.test(name))
    .map((name) => [
      name,
      createHash('sha256')
        .update(readFileSync(resolve(build, name)))
        .digest('hex'),
    ]),
);
const sourceHashes = hashFiles(resolve('src'));

const fixtures = ['digital-product-stress', 'digital-product'].map((pack) => {
  const content = JSON.parse(readFileSync(`${root}/${pack}/scenarios.json`, 'utf8'));
  return { pack, scenarios: Array.isArray(content) ? content : content.scenarios };
});
test.afterAll(() =>
  writeFileSync(
    `${evidence}/observations.json`,
    JSON.stringify(
      {
        productionBuild: process.env.ARAZZO_SCENARIO_PRODUCTION === '1',
        buildHashes,
        sourceHashes,
        evidenceType:
          'Browser inspection of authored guides; no business operations executed and no scenario outcomes measured.',
        manifestHashes: Object.fromEntries(
          fixtures.map(({ pack }) => [
            pack,
            createHash('sha256')
              .update(readFileSync(`${root}/${pack}/scenarios.json`))
              .digest('hex'),
          ]),
        ),
        observations: records,
      },
      null,
      2,
    ) + '\n',
  ),
);
for (const { pack, scenarios } of fixtures)
  for (const scenario of scenarios) {
    test(`${pack}: ${scenario.id}`, async ({ page }) => {
      const requests: string[] = [];
      page.on('request', (request) => {
        if (request.method() !== 'GET') requests.push(`${request.method()} ${request.url()}`);
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(
        `/?document=${encodeURIComponent(`http://localhost:3000/examples/${pack}/${scenario.document}`)}&scenarios=${encodeURIComponent(`http://localhost:3000/examples/${pack}/scenarios.json`)}`,
      );
      if (process.env.ARAZZO_SCENARIO_PRODUCTION === '1') {
        const script = Object.keys(buildHashes).find(
          (name) => name.startsWith('arazzo-ui-standalone.') && name.endsWith('.js'),
        )!;
        await expect(page.locator('script[src]')).toHaveAttribute('src', `./${script}`);
      }
      const panel = page.getByRole('region', { name: 'Authored scenario guides' });
      await expect(panel).toContainText('Authored expectations');
      await panel.getByRole('button', { name: scenario.id, exact: true }).click();
      await expect(panel).toContainText(scenario.expected);
      await expect(panel).toContainText(scenario.evidence);
      for (const [index, point] of scenario.waypoints.entries()) {
        if (index) await panel.getByRole('button', { name: 'Next waypoint', exact: true }).click();
        await expect(panel).toContainText(point.narrative);
        const details = page.getByRole('region', { name: 'Selection details' });
        await expect(details).toBeVisible();
        const guideBounds = await panel.boundingBox();
        const inspectorBounds = await details.boundingBox();
        expect(guideBounds!.x + guideBounds!.width).toBeLessThanOrEqual(inspectorBounds!.x + 1);
        await expect(details).toContainText(point.location.selection.stepId);
        if (point.location.selection.kind === 'action')
          await expect(details).toContainText(point.location.selection.action.name);
        if (point.location.selection.kind === 'action')
          await expect(details).toContainText(point.location.selection.action.name);
        if (point.focus)
          await expect(
            details
              .getByRole('region', { name: 'Authored guide focus' })
              .or(details.locator('[aria-label="Authored guide focus"]')),
          ).toContainText(point.focus.kind);
        records.push({
          pack,
          scenario: scenario.id,
          waypoint: point.id,
          width: 1440,
          address: point.location,
          guideLabel: await panel.locator('strong').first().textContent(),
          narrative: await panel.locator('.arazzo-scenario-current').textContent(),
          inspector: await details.innerText(),
        });
        if (
          [
            'capture-uncertain-then-confirmed',
            'issuance-rejected-compensation',
            'completion-timeout',
            'failed-device-activation',
          ].includes(scenario.id) &&
          index === scenario.waypoints.length - 1
        )
          await page.screenshot({ path: `${evidence}/${scenario.id}-1440.png` });
        await details.getByRole('button', { name: 'Close details', exact: true }).click();
      }
      await panel.getByRole('button', { name: 'Leave guide', exact: true }).click();
      await expect(panel.locator('.arazzo-scenario-current')).toHaveCount(0);
      await expect(
        page.getByRole('combobox', { name: 'Select workflow', exact: true }),
      ).toBeVisible();
      expect(requests).toEqual([]);
    });
  }
test('480px keyboard inspector return and fresh-session shared polling waypoint', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto(
    '/?document=http://localhost:3000/examples/digital-product-stress/event-based.arazzo.yaml&scenarios=http://localhost:3000/examples/digital-product-stress/scenarios.json',
  );
  const panel = page.getByRole('region', { name: 'Authored scenario guides' });
  const guide = panel.getByRole('button', { name: 'completion-timeout', exact: true });
  await guide.focus();
  await page.keyboard.press('Enter');
  const details = page.getByRole('dialog', { name: 'Selection details' });
  await expect(details).toBeVisible();
  await expect(details.getByRole('button', { name: 'Close details', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(guide).toBeFocused();
  for (let i = 0; i < 3; i++) {
    const next = panel.getByRole('button', { name: 'Next waypoint', exact: true });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(details).toBeVisible();
    await expect(details.getByRole('button', { name: 'Close details', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(details).toBeHidden();
    await expect(
      i === 2 ? panel.getByRole('button', { name: 'Previous waypoint', exact: true }) : next,
    ).toBeFocused();
  }
  await expect(panel).toContainText('Polling still requires authoritative READY');
  await expect.poll(async () => new URL(page.url()).searchParams.get('location')).toBeTruthy();
  const url = page.url();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(480);
  await page.screenshot({ path: `${evidence}/timeout-polling-480.png` });
  const fresh = await context.newPage();
  await fresh.setViewportSize({ width: 480, height: 900 });
  await fresh.goto(url);
  await expect(fresh.getByRole('dialog', { name: 'Selection details' })).toContainText(
    'poll-purchase-until-ready',
  );
  await fresh.keyboard.press('Escape');
  await expect(fresh.getByRole('region', { name: 'Authored scenario guides' })).toContainText(
    'Polling still requires authoritative READY',
  );
  records.push({
    scenario: 'completion-timeout',
    width: 480,
    check: 'Keyboard focus return, no horizontal overflow, fresh-session exact polling restoration',
    url,
  });
  await fresh.close();
});
