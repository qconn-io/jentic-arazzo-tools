import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const evidence = dirname(fileURLToPath(import.meta.url));
const ui = resolve(evidence, '../../../../packages/jentic-arazzo-ui');
const port = await new Promise((accept) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => accept(port)); });
});
const host = spawn(process.execPath, ['scripts/serve-production-browser.mjs'], { cwd: ui, env: { ...process.env, ARAZZO_BROWSER_PORT: String(port) }, stdio: 'inherit' });
const browser = await chromium.launch();
const base = `http://127.0.0.1:${port}`;
const identity = JSON.parse(await readFile(resolve(evidence, 'identity.json'), 'utf8'));
const results = [];
try {
  await expect.poll(async () => { try { return (await fetch(`${base}/__identity`)).status; } catch { return 0; } }).toBe(200);
  expect(await (await fetch(`${base}/__identity`)).json()).toEqual(identity);
  for (const [project, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 480, height: 900 }]]) {
    for (const embedded of [false, true]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const name = 'A source with a long authored name '.repeat(8);
      const url = `${base}/capture-source.json`;
      const primary = `${base}/capture.arazzo.yaml`;
      const document = { arazzo: '1.0.1', info: { title: 'Long sources', version: '1' }, sourceDescriptions: [{ name, type: 'openapi', url }], workflows: [{ workflowId: 'root', steps: [{ stepId: 'call', operationId: 'run' }] }] };
      await page.route('**/*', async (route) => {
        const request = route.request();
        if (request.method() !== 'GET' || new URL(request.url()).origin !== base) return route.abort();
        if (request.url() === primary) return route.fulfill({ json: document });
        if (request.url() === url) return route.fulfill({ json: { openapi: '3.1.0', paths: {} } });
        if (request.url() === `${base}/fixtures/readiness.json`) {
          const response = await route.fetch();
          return route.fulfill({ json: { ...await response.json(), digitalProduct: document } });
        }
        return route.continue();
      });
      await page.goto(embedded ? `${base}/consumer/?surface=source-recovery` : `${base}/?document=${encodeURIComponent(primary)}`);
      if (!embedded) {
        await page.getByRole('button', { name: 'Step descriptions', exact: true }).click();
      }
      const information = page.locator('.arazzo-document-information');
      await information.locator('summary').first().click();
      const action = information.getByRole('button', { name: /^(Load|Reload) API description / });
      await expect(action).toBeVisible();
      const geometry = await action.boundingBox();
      expect(geometry.width).toBeGreaterThanOrEqual(44);
      expect(geometry.height).toBeGreaterThanOrEqual(44);
      await expect(information.locator('.arazzo-source-meaning')).toBeVisible();
      await page.keyboard.press('Tab');
      await action.focus();
      const focus = await action.evaluate((node) => ({ outlineStyle: getComputedStyle(node).outlineStyle, outlineWidth: getComputedStyle(node).outlineWidth, fontSize: getComputedStyle(node).fontSize }));
      expect(focus.fontSize).toBe('13px');
      expect(focus.outlineStyle).toBe('solid');
      expect(parseFloat(focus.outlineWidth)).toBeGreaterThanOrEqual(3);
      await page.keyboard.press('Enter');
      await expect(information.getByRole('status', { name: 'Source action result' })).toHaveText(`${name}: Loaded.`);
      await expect(information.locator('.arazzo-source-description')).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      const path = `captures/${project}/api-document-information-${embedded ? 'embedded' : 'standalone'}.png`;
      await mkdir(resolve(evidence, `captures/${project}`), { recursive: true });
      await page.screenshot({ path: resolve(evidence, path) });
      results.push({ project, embedded, geometry, focus, path, explicitResult: 'Loaded', overflow: false, pageErrors: errors });
      await information.locator('summary').first().click();
      await page.getByRole('button', { name: 'Inspect root.call', exact: true }).click();
      const contract = page.locator('.arazzo-contract-panel');
      await expect(contract).toContainText('Operation not found');
      await contract.locator('.arazzo-source-meaning').scrollIntoViewIfNeeded();
      const inspectorPath = `captures/${project}/api-inspector-scope-${embedded ? 'embedded' : 'standalone'}.png`;
      await page.screenshot({ path: resolve(evidence, inspectorPath) });
      results.push({ project, embedded, path: inspectorPath, operation: 'not found', description: 'Loaded' });
      await page.close();
    }
  }
  await writeFile(resolve(evidence, 'document-information.json'), JSON.stringify(results, null, 2));
  console.log('PASS four fresh document-information and four inspector-scope captures, target/style/focus/live-text checks and source/build identity');
} finally {
  await browser.close();
  host.kill('SIGINT');
  await new Promise((accept) => host.once('exit', accept));
}
