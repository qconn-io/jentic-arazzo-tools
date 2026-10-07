import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const root = resolve('packages/jentic-arazzo-ui/build');
const evidence = resolve('openspec/changes/add-system-interaction-view/browser-evidence');
await mkdir(evidence, { recursive: true });
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const script = html.match(/src="([^\"]+\.js)"/)?.[1];
const stylesheet = html.match(/href="([^\"]+\.css)"/)?.[1];
console.log(JSON.stringify({ script, stylesheet }));
if (!script || !stylesheet) throw new Error('Built application assets unavailable');
const hash = async path => createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/system-harness.html') { res.setHeader('Content-Type', 'text/html'); res.end(`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/${stylesheet}"><style>html,body,#system-production{width:100%;height:100%;margin:0}</style></head><body><div id="system-production"></div><script src="/${script}"></script></body></html>`); return; }
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${root}${sep}`)) throw new Error('Outside static root');
    const content = await readFile(file);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.yaml': 'application/yaml' })[extname(file)] ?? 'application/octet-stream');
    res.end(content);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const observations = [];
const errors = [];
try {
  for (const width of [1440, 480]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', error => { errors.push(error.message); console.log('Browser error:', error.message); });
    page.on('response', response => { if (!response.ok()) console.log('Failed asset:', response.status(), response.url()); });
    await page.goto(`${base}/system-harness.html`);
    await page.evaluate(workflow => {
      const host = document.getElementById('system-production');
      window.ArazzoUIStandalone({ domNode: host, document: workflow, viewProfileAdapter: 'digital-product' });
    }, `${base}/examples/digital-product/arazzo.yaml`);
    const host = page.locator('#system-production');
    await host.getByRole('combobox', { name: 'Perspective' }).selectOption('systems');
    if (await host.locator('.arazzo-systems-participants > div').count() !== 5) throw new Error('Expected five business participants');
    await host.getByRole('button', { name: 'Expand standard call fulfil-purchase.reserve-and-pay', exact: true }).click();
    const control = host.getByRole('button', { name: 'Inspect system reserve-and-capture.capture-payment', exact: true });
    await control.focus(); await page.keyboard.press('Enter');
    const panel = host.getByRole(width === 480 ? 'dialog' : 'region', { name: 'Selection details', exact: true });
    await panel.getByRole('button', { name: 'Open exact workflow occurrence' }).click();
    await panel.getByRole('button', { name: 'Return to Systems context' }).click();
    await panel.getByText('Selected system: reserve-and-capture.capture-payment', { exact: true }).waitFor();
    await panel.getByRole('button', { name: 'Close details' }).click();
    const geometry = await host.locator('.arazzo-systems-canvas').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, page: document.documentElement.scrollWidth, viewport: innerWidth }));
    if (geometry.page > geometry.viewport + 1 || (width === 480 && geometry.scroll <= geometry.client)) throw new Error('Uncontained system scene');
    await host.locator('.arazzo-systems').evaluate(el => { el.scrollTop = 0; });
    await host.locator('.arazzo-systems-canvas').evaluate(el => { el.scrollTop = 0; el.scrollLeft = 0; });
    await page.screenshot({ path: `${evidence}/production-purchase-${width}.png`, fullPage: true });
    observations.push({ width, check: 'built UMD five participants, payment occurrence return, keyboard and containment', pass: true, geometry });
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
  page.on('pageerror', error => { errors.push(error.message); console.log('Browser error:', error.message); });
    page.on('response', response => { if (!response.ok()) console.log('Failed asset:', response.status(), response.url()); });
  let contractRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/events.asyncapi.yaml')) contractRequests++; });
  await page.goto(`${base}/system-harness.html`);
  await page.evaluate(async base => {
    const host = document.getElementById('system-production');
    const documentURL = `${base}/examples/digital-product-stress/event-based.arazzo.yaml`;
    const profile = await fetch(`${base}/examples/digital-product-stress/systems-profile.json`).then(r => r.json());
    profile.document = documentURL;
    for (const a of profile.events) { a.channel.uri = new URL(a.channel.uri, documentURL).href; a.message.uri = new URL(a.message.uri, documentURL).href; }
    window.ArazzoUIStandalone({ domNode: host, document: documentURL, viewProfile: profile });
  }, base);
  const host = page.locator('#system-production');
  await host.getByRole('combobox', { name: 'Perspective' }).selectOption('systems');
  await host.getByRole('button', { name: 'Inspect system event-driven-purchase.await-ready', exact: true }).click();
  const panel = host.getByRole('dialog', { name: 'Selection details', exact: true });
  await panel.getByRole('checkbox', { name: 'Show declared event relationships' }).check();
  if (contractRequests !== 0) throw new Error('Implicit contract acquisition');
  await panel.getByRole('button', { name: 'Load source events', exact: true }).click();
  await panel.getByText('purchase-completion: Declared event association; delivery and correlation success are not established', { exact: true }).waitFor();
  if (contractRequests !== 1) throw new Error('Unexpected contract acquisition count');
  await panel.evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ path: `${evidence}/production-event-480.png`, fullPage: true });
  observations.push({ width: 480, check: 'built UMD explicit event identity validation and source loading', pass: true, contractRequests });
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(`${evidence}/production-observations.json`, JSON.stringify({ assets: { script, stylesheet, scriptSHA256: await hash(script), stylesheetSHA256: await hash(stylesheet) }, observations, errors }, null, 2));
  console.log(`${observations.length} built UMD observations passed; no browser errors`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
