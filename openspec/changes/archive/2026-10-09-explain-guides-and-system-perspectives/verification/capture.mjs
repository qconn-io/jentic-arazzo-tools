import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium, expect } from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const build = resolve(repo, 'packages/jentic-arazzo-ui/build');
const assets = await readdir(build);
const script = assets.find((name) => /^arazzo-ui-standalone.*\.js$/.test(name));
const css = assets.find((name) => /^arazzo-ui.*\.css$/.test(name));
const output = fileURLToPath(new URL('../captures/', import.meta.url));
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://local').pathname;
    if (path === '/configured.html') {
      response.setHeader('Content-Type', 'text/html');
      response.end(`<!doctype html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="/${css}"><style>*{box-sizing:border-box;margin:0}html,body,#root{width:100%;height:100%}</style></head><body><div id="root"></div><script src="/${script}"></script><script>ArazzoUIStandalone({dom_id:'#root',document:location.origin+'/examples/digital-product/arazzo.yaml',viewProfileAdapter:'digital-product'})</script></body></html>`);
    } else {
      const data = await readFile(resolve(build, '.' + (path === '/' ? '/index.html' : path)));
      response.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.yaml': 'text/yaml', '.json': 'application/json', '.svg': 'image/svg+xml' }[extname(path)] ?? 'text/html');
      response.end(data);
    }
  } catch { response.statusCode = 404; response.end('Missing'); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const observations = [];
const errors = [];
try {
  for (const width of [1440, 480]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', (e) => errors.push(String(e)));
    const requests = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname));
    const capture = async (state) => {
      const metrics = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      expect(metrics.page).toBeLessThanOrEqual(width + 1);
      expect(metrics.body).toBeLessThanOrEqual(width + 1);
      observations.push({ width, state, ...metrics });
      await page.screenshot({ path: resolve(output, `${width}-${state}.png`) });
    };
    await page.goto(base + '/');
    await expect(page.getByRole('combobox', { name: 'Select workflow' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Guided walkthroughs' })).toContainText('Follow an author-provided guide');
    await capture('plain-entry');
    await page.getByText('Systems view', { exact: true }).click();
    await expect(page.getByText('This document has no supplied system participant information.')).toBeVisible();
    await capture('unconfigured-systems');
    const beforeHelp = requests.length;
    await page.getByText('Load guides from a URL', { exact: true }).click();
    await page.getByText('Guide file format', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open guided example' })).toBeVisible();
    expect(requests.length).toBe(beforeHelp);
    await capture('guide-help');
    await page.getByRole('button', { name: 'Open guided example' }).click();
    await expect(page.getByRole('button', { name: 'inventory-evidence-mismatch', exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('document')).toBe(base + '/examples/digital-product/arazzo.yaml');
    expect(new URL(page.url()).searchParams.get('scenarios')).toBe(base + '/examples/digital-product/scenarios.json');
    // supplied guide choices remain direct after closing URL setup.
    await page.getByText('Load guides from a URL', { exact: true }).click();
    await capture('supplied-guides');
    const origin = page.getByRole('button', { name: 'inventory-evidence-mismatch', exact: true });
    await origin.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole(width === 480 ? 'dialog' : 'region', { name: 'Selection details' })).toBeVisible();
    if (width === 480) {
      expect(await page.locator('.arazzo-guide-setup').getAttribute('inert')).toBe('');
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(true);
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(true);
    }
    await capture('guide-inspection');
    await page.getByRole('button', { name: 'Close details' }).press('Escape');
    await expect(origin).toBeFocused();
    await page.goto(base + '/configured.html');
    await expect(page.getByRole('combobox', { name: 'Perspective' })).toBeVisible();
    expect(await page.getByRole('combobox', { name: 'Perspective' }).evaluate((node) => !!node.closest('details'))).toBe(false);
    await page.getByRole('combobox', { name: 'Perspective' }).selectOption('systems');
    await expect(page.getByRole('region', { name: 'Systems client-journey' })).toBeVisible();
    await capture('configured-systems');
    const restored = new URL(base + '/');
    restored.searchParams.set('location', JSON.stringify({
      version: 1, document: base + '/petstore-order-workflow.arazzo.yaml',
      root: 'authenticateAndOrderPet', view: 'docs', subview: 'docs',
      extensions: { 'arazzo.scenario': { manifest: 'missing-guide', manifestURI: base + '/unavailable-guide.json', scenarioId: 'missing', waypointId: 'missing-step' } },
    }));
    await page.goto(restored.href);
    await expect(page.getByRole('button', { name: 'Retry guide loading' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Select workflow' })).toBeVisible();
    await expect(page.locator('.arazzo-advanced-tools')).not.toHaveAttribute('open', '');
    await capture('failed-restoration');
    await page.close();
  }
  expect(errors).toEqual([]);
  const hashes = {};
  for (const name of [script, css]) hashes[name] = createHash('sha256').update(await readFile(resolve(build, name))).digest('hex');
  await writeFile(resolve(output, 'observations.json'), JSON.stringify({ hashes, errors, observations }, null, 2) + '\n');
  console.log(`${observations.length} captures passed; no page-wide overflow or browser errors.`);
} finally { await browser.close(); await new Promise((done) => server.close(done)); }
