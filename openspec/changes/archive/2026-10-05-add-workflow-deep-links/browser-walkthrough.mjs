// run from the repository root after building the production UI.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/arazzo-browser-smoke/node_modules/playwright/index.mjs');
const build = resolve('packages/jentic-arazzo-ui/build');
const evidence = resolve('openspec/changes/add-workflow-deep-links/browser-evidence');
await mkdir(evidence, { recursive: true });
const assets = await readFile(resolve(build, 'index.html'), 'utf8');
const html = assets.replace(/<script>[^]*?<\/script>/, '');
const script = assets.match(/src="\.\/([^" ]+\.js)"/)[1];
const css = assets.match(/href="\.\/([^" ]+\.css)"/)[1];
const hashes = Object.fromEntries(await Promise.all([script, css].map(async name => [name, createHash('sha256').update(await readFile(resolve(build, name))).digest('hex')])));
const sourceFiles = [...new Set(execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'packages/jentic-arazzo-ui/src', 'packages/jentic-arazzo-ui/scripts'], { encoding: 'utf8' }).trim().split('\n'))].sort();
const sourceHash = createHash('sha256');
for (const path of sourceFiles) sourceHash.update(path + '\0').update(await readFile(path));
const sourceDigest = sourceHash.digest('hex');
const server = createServer(async (req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    const path = resolve(build, name); assert(path.startsWith(build + '/'));
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.yaml': 'application/yaml', '.svg': 'image/svg+xml' }[extname(name)] || 'text/html');
    res.end(name === 'index.html' ? html : await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const documentURI = `${origin}/examples/digital-product-stress/arazzo.yaml`;
const browser = await chromium.launch({ headless: true });
const observations = [], errors = [];
const path = [['batch-fulfilment','second-item'],['fulfil-item','prepare'],['prepare-commerce','commerce'],['reserve-and-capture','capture']].map(([workflowId, stepId]) => ({ workflowId, stepId }));
const capture = { version: 1, document: documentURI, root: 'batch-fulfilment', view: 'docs', subview: 'sequence', selection: { kind: 'step', workflowId: 'capture-authorized-payment', stepId: 'capture-payment', occurrence: path } };
const urlFor = location => { const url = new URL(`${origin}/?theme=dark#section=notes`); url.searchParams.set('document', documentURI); url.searchParams.set('location', JSON.stringify(location)); return url.href; };
const readLocation = page => page.evaluate(() => JSON.parse(new URL(location.href).searchParams.get('location')));
const record = (task, width, values = {}) => observations.push({ task, width, outcome: 'passed', ...values });
async function fresh(url, width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push({ width, message: e.message }));
  page.on('console', e => { if (e.type() === 'error') errors.push({ width, message: e.text() }); });
  await page.goto(url);
  await page.evaluate(document => { window.instance = ArazzoUIStandalone({ dom_id: '#root', document }); }, documentURI);
  await page.locator('.arazzo-workflow-navigation select').waitFor({ state: 'attached' });
  return { page, context };
}
async function checkDetails(page, width) {
  const panel = page.locator('.arazzo-selection-details'); await panel.waitFor();
  const text = await panel.innerText();
  assert(text.includes('batch-fulfilment.second-item'));
  assert(text.includes('capture-authorized-payment.capture-payment'));
  assert(text.includes('{$inputs.purchaseId}-payment'));
  assert(text.includes('$inputs.amountMinor'));
  assert.equal(await panel.getByRole('button', { name: 'Close details' }).evaluate(el => document.activeElement === el), true);
  record('exact second-item capture and focused details', width, { selection: (await readLocation(page)).selection, mappings: ['{$inputs.purchaseId}-payment', '$inputs.amountMinor'], focusedControl: 'Close details' });
  await page.screenshot({ path: resolve(evidence, `capture-${width}.png`) });
  return panel;
}
try {
  for (const width of [1440, 480]) {
    console.log(`Deep-link browser tasks at ${width}px`);
    let { page, context } = await fresh(urlFor(capture), width);
    let panel = await checkDetails(page, width);
    await panel.getByRole('button', { name: 'Copy link' }).click();
    await panel.getByText('Link copied.').waitFor();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(new URL(copied).searchParams.get('theme'), 'dark'); assert.equal(new URL(copied).hash, '#section=notes');
    await context.close();
    ({ page, context } = await fresh(copied, width));
    panel = await checkDetails(page, width);
    record('copied occurrence opens in fresh session', width, { digest: (await readLocation(page)).digest });
    await panel.getByRole('button', { name: 'Close details' }).click();
    await page.getByRole('button', { name: /^Inspect batch-fulfilment\.second-item · call/ }).click();
    panel = page.locator('.arazzo-selection-details');
    const callText = await panel.innerText();
    for (const mapping of ['digital-upgrade', '2499', '{$inputs.purchaseId}-B', 'authorization-demo-upgrade']) assert(callText.includes(mapping), mapping);
    record('second-item caller mappings retained', width, { mappings: ['digital-upgrade', 2499, '{$inputs.purchaseId}-B', 'authorization-demo-upgrade'] });
    await panel.getByRole('button', { name: 'Close details' }).click();
    // each committed transition creates one history entry; search typing leaves it untouched.
    const length = await page.evaluate(() => history.length);
    await page.getByRole('searchbox').fill('capture'); assert.equal(await page.evaluate(() => history.length), length);
    await page.getByRole('searchbox').fill('');
    await page.getByRole('button', { name: /^Open workflow fulfil-item from batch-fulfilment\.second-item/ }).click();
    await page.getByRole('button', { name: 'Back to caller batch-fulfilment.second-item' }).waitFor();
    const calleeURL = page.url();
    assert.equal(await page.evaluate(() => history.length), length + 1);
    await page.goBack();
    await page.locator('.arazzo-workflow-navigation select').waitFor({ state: 'attached' });
    await page.waitForFunction(() => document.querySelector('.arazzo-workflow-navigation select')?.value === 'batch-fulfilment');
    assert.equal(await page.getByRole('button', { name: /Back to caller/ }).count(), 0, 'outgoing caller context is not contaminated');
    await page.goForward();
    await page.getByRole('button', { name: 'Back to caller batch-fulfilment.second-item' }).waitFor();
    assert.equal(page.url(), calleeURL);
    await page.getByRole('button', { name: 'Back to caller batch-fulfilment.second-item' }).click();
    await page.getByRole('region', { name: 'Sequence batch-fulfilment' }).waitFor();
    record('Back/Forward restores once and retains caller return', width, { historyDelta: 1 });
    await context.close();
    for (const [view, subview] of [['docs','docs'],['docs','sequence'],['docs','flowchart'],['diagram','sequence'],['split','sequence']]) {
      ({ page, context } = await fresh(urlFor({ ...capture, view, subview }), width));
      await checkDetails(page, width);
      record(`fresh ${view}/${subview} destination`, width);
      await context.close();
    }
    ({ page, context } = await fresh(urlFor({ ...capture, root: null, selection: undefined }), width));
    await page.getByRole('region', { name: 'Workflow overview' }).waitFor();
    assert.equal(await page.locator('.arazzo-selection-details').count(), 0);
    const geometry = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('.arazzo-ui-toolbar a, .arazzo-ui-toolbar input[type=text], .arazzo-ui-toolbar button')].map(el => { const r = el.getBoundingClientRect(); return { label: el.getAttribute('aria-label') || el.textContent.trim() || el.title, x: r.x, y: r.y, width: r.width, height: r.height }; });
      return { controls, width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
    });
    assert(geometry.scrollWidth <= geometry.width + 1);
    geometry.controls.forEach((a, i) => {
      assert(a.x >= 0 && a.x + a.width <= geometry.width + 1, a.label);
      for (const b of geometry.controls.slice(i + 1)) assert(!(a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1), `overlapping ${a.label}/${b.label}`);
    });
    record('toolbar geometry and page containment', width, geometry);
    await page.screenshot({ path: resolve(evidence, `overview-${width}.png`) });
    record('overview address restores', width);
    await context.close();
    ({ page, context } = await fresh(urlFor({ ...capture, digest: 'sha256:' + '0'.repeat(64) }), width));
    await page.getByText(/Document revision mismatch/).waitFor();
    assert.equal(await page.locator('.arazzo-selection-details').count(), 0);
    assert.equal(await page.getByRole('combobox', { name: 'Select workflow' }).inputValue(), 'batch-fulfilment');
    record('revision mismatch retains root without selecting another occurrence', width);
    await context.close();
    ({ page, context } = await fresh(urlFor({ ...capture, selection: { ...capture.selection, occurrence: [{ workflowId: 'batch-fulfilment', stepId: 'removed-item' }] } }), width));
    await page.getByText(/Unavailable call segment: batch-fulfilment.removed-item/).waitFor();
    assert.equal(await page.locator('.arazzo-selection-details').count(), 0);
    record('missing occurrence explains exact segment', width);
    await context.close();
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
} finally {
  await writeFile(resolve(evidence, 'observations.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceDigest, hashes, observations, errors }, null, 2));
  await browser.close(); await new Promise(r => server.close(r));
}
console.log(`PASS ${observations.length} browser observations; ${errors.length} browser errors`);
