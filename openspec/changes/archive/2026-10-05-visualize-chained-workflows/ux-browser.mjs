import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { nestedCalls, difficultCalls, recursiveCalls } from '../../../packages/jentic-arazzo-ui/test/fixtures/connected.ts';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/arazzo-browser-smoke/node_modules/playwright/index.mjs');
const build = resolve('packages/jentic-arazzo-ui/build');
const evidence = resolve('openspec/changes/visualize-chained-workflows/browser-evidence/ux');
await mkdir(evidence, { recursive: true });
const html = (await readFile(resolve(build, 'index.html'), 'utf8')).replace(/<script>[^]*?<\/script>/, '');
const server = createServer(async (req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    const path = resolve(build, name);
    assert(path.startsWith(build + '/'));
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(name)] || 'text/html');
    res.end(name === 'index.html' ? html : await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const observations = [];
try {
  for (const width of [1440, 480]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto(url);
    await page.evaluate((document) => { window.instance = ArazzoUIStandalone({ dom_id: '#root', document }); }, nestedCalls);
    const nav = page.getByRole('navigation', { name: 'Workflows' });
    await nav.waitFor();
    assert((await nav.getByRole('combobox').boundingBox()).width >= 180);
    assert.equal(await nav.getByRole('combobox').inputValue(), 'checkout');
    await nav.getByRole('button', { name: 'All workflows' }).click();
    await page.getByRole('region', { name: 'Workflow overview' }).waitFor();
    await page.screenshot({ path: resolve(evidence, `overview-${width}.png`) });
    await page.getByRole('button', { name: 'Open workflow payment', exact: true }).click();
    await page.getByRole('button', { name: 'Sequence', exact: true }).waitFor();
    assert.equal(await nav.getByRole('combobox').inputValue(), 'payment');
    observations.push({ task: 'Default Docs → All workflows → payment → visible Sequence choice', width, outcome: 'passed' });
    await nav.getByRole('combobox').selectOption('checkout');
    await page.getByRole('button', { name: 'Sequence', exact: true }).click();
    const sequence = page.getByRole('region', { name: 'Sequence checkout' });
    await sequence.waitFor();
    assert.equal(await sequence.getByRole('button', { name: 'Expand payment.audit → audit', exact: true }).count(), 2);
    await sequence.getByRole('button', { name: 'Expand payment.audit → audit', exact: true }).first().press('Enter');
    await sequence.getByRole('button', { name: 'Inspect audit.record', exact: true }).waitFor();
    await sequence.getByRole('button', { name: 'Inspect checkout.firstPayment', exact: true }).click();
    const details = page.getByRole('region', { name: 'Selection details' });
    await details.waitFor();
    assert((await details.textContent()).includes('"value": 0'));
    assert((await details.textContent()).includes('Declared callee inputs'));
    await page.screenshot({ path: resolve(evidence, `mapping-${width}.png`) });
    await details.getByRole('button', { name: 'Close details' }).press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Inspect checkout.firstPayment');
    await sequence.getByRole('button', { name: 'Open workflow payment from checkout.firstPayment', exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Back to caller checkout.firstPayment', exact: true }).waitFor();
    for (const mode of ['diagram', 'split', 'docs']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      await page.screenshot({path: resolve(evidence, `${mode}-${width}.png`)});
    }
    await page.getByRole('button', { name: 'Back to caller checkout.firstPayment', exact: true }).press('Enter');
    await sequence.waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Collapse checkout.firstPayment → payment');
    assert.equal(await sequence.getByRole('button', { name: 'Inspect audit.record', exact: true }).count(), 1);
    await sequence.getByRole('button', { name: 'Collapse checkout.firstPayment → payment', exact: true }).click();
    assert.equal(await sequence.getByRole('button', { name: 'Inspect audit.record', exact: true }).count(), 0);
    await sequence.locator('.arazzo-sequence-canvas').evaluate(el => {el.scrollTop = 0; el.scrollLeft = 0;});
    await sequence.evaluate(el => {let parent = el.parentElement; while (parent) {parent.scrollTop = 0; parent = parent.parentElement;}});
    await page.screenshot({ path: resolve(evidence, `sequence-${width}.png`) });
    observations.push({ task: 'Nested expansion, distinct repeated calls, full mapping inspection, keyboard close, exact caller return across modes, expansion restoration and collapse', width, outcome: 'passed' });
    await sequence.locator('.arazzo-sequence-canvas').screenshot({path: resolve(evidence, `canvas-${width}.png`)});
    const canvas = sequence.locator('svg');
    const labels = await canvas.locator('text').evaluateAll((texts) => texts.map((text) => ({ size: Number(text.getAttribute('font-size')), x: text.getBBox().x, y: text.getBBox().y, width: text.getBBox().width, height: text.getBBox().height })));
    const svgWidth = Number(await canvas.getAttribute('width'));
    const svgHeight = Number(await canvas.getAttribute('height'));
    assert(labels.every((label) => label.size >= 11 && Number.isFinite(label.width) && label.x >= 0 && label.x + label.width <= svgWidth && label.y >= 0 && label.y + label.height <= svgHeight));
    const viewport = sequence.locator('.arazzo-sequence-canvas');
    const scrolling = await viewport.evaluate(el => ({client: el.clientWidth, total: el.scrollWidth}));
    if (width === 480) assert(scrolling.total > scrolling.client);
    await viewport.evaluate(el => {el.scrollLeft = el.scrollWidth;});
    if (width === 480) assert(await viewport.evaluate(el => el.scrollLeft > 0));
    observations.push({ task: 'Readable SVG labels and horizontal canvas scrolling', width, outcome: 'passed', labels, canvasWidth: await canvas.getAttribute('width') });
    for (const [name, fixture] of [['recursion', recursiveCalls], ['difficult', difficultCalls]]) {
      await page.goto(url);
      await page.evaluate((document) => { window.instance = ArazzoUIStandalone({ dom_id: '#root', document }); }, fixture);
      await page.getByRole('button', { name: 'Sequence', exact: true }).click();
      if (name === 'recursion') {
        await page.getByRole('button', { name: 'Expand payment.again → checkout', exact: true }).click();
        assert((await page.getByRole('region', { name: 'Sequence checkout' }).textContent()).includes('Recursion'));
      } else {
        const region = page.getByRole('region', { name: /^Sequence entry/ });
        const text = await region.textContent();
        assert(text.includes('external-workflow') && text.includes('missing') && text.includes('ambiguous destination'));
        for (const mode of ['diagram', 'split', 'docs']) await page.getByRole('button', { name: mode, exact: true }).click();
      }
      await page.screenshot({ path: resolve(evidence, `${name}-${width}.png`) });
      observations.push({ task: `${name} markers, long labels and mode round trips`, width, outcome: 'passed' });
    }
    await page.close();
  }
  const samplePath = resolve('packages/jentic-arazzo-ui/public/openapi_samples/workflows/d1-wallet-adapter-standard.arazzo.yaml');
  const sample = await readFile(samplePath, 'utf8');
  const checksum = createHash('sha256').update(sample).digest('hex');
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url);
  await page.evaluate((document) => { window.instance = ArazzoUIStandalone({ dom_id: '#root', document }); }, sample);
  await page.getByRole('button', { name: 'All workflows', exact: true }).click();
  const overview = page.getByRole('region', { name: 'Workflow overview' });
  await overview.waitFor();
  const calls = await overview.locator('article').evaluateAll((cards) => cards.map((card) => ({ workflow: card.querySelector('h3')?.textContent, calls: [...card.querySelectorAll('strong')].find((s) => s.textContent === 'Calls')?.parentElement?.querySelectorAll('li').length ?? 0 })));
  assert.equal(calls.reduce((sum, entry) => sum + entry.calls, 0), 6);
  await page.screenshot({ path: resolve(evidence, 'd1-overview.png') });
  const adapters = calls.filter((entry) => entry.calls > 0);
  for (const entry of adapters) {
    await page.getByRole('combobox', { name: 'Select workflow' }).selectOption(entry.workflow);
    await page.getByRole('button', { name: 'Sequence', exact: true }).click();
    const scene = page.getByRole('region', { name: `Sequence ${entry.workflow}`, exact: true });
    await scene.waitFor();
    const text = await scene.textContent();
    assert(text.includes('Structural continuation'));
    const loaded = await page.evaluate(() => window.instance.getRef().getDocument());
    const caller = loaded.workflows.find((workflow) => workflow.workflowId === entry.workflow);
    const call = caller.steps.find((step) => step.workflowId);
    const calleeId = call.workflowId.replace(/^\$workflows\./, '');
    const callee = loaded.workflows.find((workflow) => workflow.workflowId === calleeId);
    assert(callee && callee.steps.some((step) => step.operationId || step.operationPath || step.channelPath));
    const operation = callee.steps.find((step) => step.operationId || step.operationPath || step.channelPath);
    await scene.getByRole('button', { name: `Inspect ${calleeId}.${operation.stepId}`, exact: true }).waitFor();
    await page.screenshot({ path: resolve(evidence, `d1-${entry.workflow.replace(/[^a-z0-9]/gi, '-')}.png`) });
    observations.push({ task: 'D1 adapter exposes downstream ABT operations through standard calls', workflow: entry.workflow, callee: calleeId, operation: operation.stepId, samplePath, checksum, outcome: 'passed' });
  }
  observations.push({ task: 'D1 overview has six standard calls and no inferred calls for descriptive client workflows', samplePath, checksum, calls, outcome: 'passed' });
  await page.close();
} catch (error) {
  observations.push({ outcome: 'failed', message: error.message });
  throw error;
} finally {
  await writeFile(resolve(evidence, 'observations.json'), JSON.stringify(observations, null, 2));
  await browser.close();
  server.close();
}
