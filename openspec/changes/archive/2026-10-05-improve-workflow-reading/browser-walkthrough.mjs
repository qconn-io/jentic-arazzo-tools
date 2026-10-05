// run from the repository root after building @jentic/arazzo-ui.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/arazzo-browser-smoke/node_modules/playwright/index.mjs');
const build = resolve('packages/jentic-arazzo-ui/build');
const evidence = resolve('openspec/changes/improve-workflow-reading/browser-evidence/acceptance');
await mkdir(evidence, { recursive: true });
const html = (await readFile(resolve(build, 'index.html'), 'utf8')).replace(/<script>[^]*?<\/script>/, '');
const documents = [
  ['digital-product/arazzo.yaml', 3],
  ['digital-product-stress/arazzo.yaml', 18],
  ['digital-product-stress/event-based.arazzo.yaml', 4],
  ['digital-product-stress/boundaries/metadata-heavy.arazzo.yaml', 2],
  ['digital-product-stress/boundaries/recursion.arazzo.yaml', 2],
  ['digital-product-stress/boundaries/depth-limit.arazzo.yaml', 12],
  ['digital-product-stress/boundaries/row-limit.arazzo.yaml', 1],
  ['digital-product-stress/diagnostics/unavailable-targets.arazzo.yaml', 1],
  ['digital-product-stress/diagnostics/prerequisite-cycle.arazzo.yaml', 2],
];
const observations = [], errors = [], failures = [];
const assets = await readFile(resolve(build, 'index.html'), 'utf8');
const scriptName = assets.match(/src="\.\/([^" ]+\.js)"/)[1];
const cssName = assets.match(/href="\.\/([^" ]+\.css)"/)[1];
const hashes = Object.fromEntries(await Promise.all([scriptName, cssName].map(async name => [name, createHash('sha256').update(await readFile(resolve(build, name))).digest('hex')])));
const server = createServer(async (req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    const path = resolve(build, name);
    assert(path.startsWith(build + '/'));
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.yaml': 'application/yaml' }[extname(name)] || 'text/html');
    res.end(name === 'index.html' ? html : await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
function record(task, width, document, data = {}) { observations.push({ task, width, document, outcome: 'passed', ...data }); }
async function shot(page, name, width) {
  await page.screenshot({ path: resolve(evidence, `${name}-${width}.png`) });
}
const details = page => page.locator('.arazzo-selection-details');
async function dismiss(page, origin, width) {
  await details(page).getByRole('button', { name: 'Close details' }).press('Escape');
  await details(page).waitFor({ state: 'hidden' });
  assert(await origin.evaluate(el => document.activeElement === el), `focus restoration at ${width}`);
  assert.equal(await page.locator('[inert]').count(), 0);
}
async function layout(page) {
  const geometry = await page.evaluate(() => {
    const toolbar = document.querySelector('.arazzo-ui-toolbar');
    const controls = [...toolbar.querySelectorAll('a, input[type=text], button')].filter(el => el.getBoundingClientRect().width);
    const rects = controls.map(el => ({ label: el.getAttribute('aria-label') || el.textContent || el.title, x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
    return { pageWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, controls: rects };
  });
  assert(geometry.scrollWidth <= geometry.pageWidth + 1, `whole page overflows: ${JSON.stringify(geometry)}`);
  geometry.controls.forEach((a, i) => {
    assert(a.x >= 0 && a.x + a.width <= geometry.pageWidth + 1);
    geometry.controls.slice(i + 1).forEach(b => assert(!(a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1), `overlapping ${a.label} and ${b.label}`));
  });
  return geometry;
}
async function load(page, path) {
  await page.goto(url);
  await page.evaluate(documentURL => { window.instance = ArazzoUIStandalone({ dom_id: '#root', document: documentURL }); }, `${url}/examples/${path}`);
  await page.getByRole('combobox', { name: 'Select workflow' }).waitFor();
  return page.evaluate(() => window.instance.getRef().getDocument());
}
try {
  for (const width of [1440, 480]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', error => errors.push({ width, url: page.url(), message: error.message }));
    page.on('console', event => { if (event.type() === 'error') errors.push({ width, url: page.url(), message: event.text() }); });
    for (const [index, [path, count]] of documents.entries()) {
      console.log(`Checking ${width}px ${path}`);
      const document = await load(page, path);
      assert.equal(document.workflows.length, count);
      const nav = page.getByRole('combobox', { name: 'Select workflow' });
      record('header and navigation geometry', width, path, await layout(page));
      await shot(page, `d${index}-docs`, width);
      for (const workflow of document.workflows) {
        await nav.selectOption(workflow.workflowId);
        await page.getByRole('button', { name: 'Sequence', exact: true }).click();
        const scene = page.getByRole('region', { name: `Sequence ${workflow.workflowId}`, exact: true });
        await scene.waitFor();
        const rows = await scene.locator('[data-sequence-id]').count();
        assert(rows > 0 && rows <= 200);
        const control = scene.getByRole('button', { name: /^Inspect / }).first();
        await control.click();
        await details(page).waitFor();
        const context = await details(page).getByRole('region', { name: 'Owning context' }).textContent();
        assert(context.includes('Owning workflow'));
        if (width === 480) {
          assert.equal(await details(page).getAttribute('role'), 'dialog');
          assert.equal(await details(page).getAttribute('aria-modal'), 'true');
          assert(await page.locator('.arazzo-workflow-navigation').evaluate(el => !!el.closest('[inert]')));
          const close = details(page).getByRole('button', { name: 'Close details' });
          await close.focus();
          await page.keyboard.press('Shift+Tab');
          assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Advanced authored content and provenance');
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close details');
        } else {
          assert.equal(await page.locator('[inert]').count(), 0);
          await nav.focus();
          assert(await nav.evaluate(el => el === document.activeElement));
        }
        await dismiss(page, control, width);
        record('workflow sequence and keyboard inspection', width, path, { workflow: workflow.workflowId, authoredSteps: workflow.steps.length, rows, context });
        if (path === 'digital-product/arazzo.yaml') {
          for (const step of workflow.steps) {
            await page.getByRole('button', { name: 'Documentation', exact: true }).click();
            const origin = page.getByRole('button', { name: `Inspect ${workflow.workflowId}.${step.stepId}`, exact: true });
            await origin.click();
            const text = await details(page).textContent();
            assert(text.includes(`${workflow.workflowId}.${step.stepId}`));
            if (step.requestBody) assert((await details(page).locator('[data-reading-section="Request body / message payload"]').textContent()).includes('payload'));
            await shot(page, `small-${workflow.workflowId}-${step.stepId}`, width);
            await dismiss(page, origin, width);
            record('small-pack step details', width, path, { workflow: workflow.workflowId, step: step.stepId });
          }
        }
      }
      await nav.selectOption(document.workflows[0].workflowId);
      await page.getByRole('button', { name: 'Sequence', exact: true }).click();
      const fullLabel = page.locator('.arazzo-full-label').first();
      await fullLabel.focus();
      assert(await fullLabel.evaluate(el => el.title === el.textContent && getComputedStyle(el).whiteSpace === 'normal'));
      record('full participant label on keyboard focus', width, path, { label: await fullLabel.textContent() });
      await shot(page, `d${index}-sequence`, width);
      for (const mode of ['diagram', 'split', 'docs']) {
        await page.getByRole('button', { name: mode, exact: true }).click();
        record('root mode and contained page width', width, path, { mode, geometry: await layout(page) });
      }
      if (path === 'digital-product/arazzo.yaml' && width === 1440) {
        await page.getByRole('button', { name: 'Documentation', exact: true }).click();
        const origin = page.getByRole('button', { name: 'Inspect client-journey.purchase', exact: true });
        await origin.click();
        const facts = await details(page).locator('[data-reading-section]').allTextContents();
        for (const mode of ['diagram', 'split']) {
          await page.getByRole('button', { name: mode, exact: true }).click();
          assert.deepEqual(await details(page).locator('[data-reading-section]').allTextContents(), facts);
        }
        await page.getByRole('button', { name: 'diagram', exact: true }).click();
        await details(page).getByRole('button', { name: 'Close details' }).press('Escape');
        await page.waitForFunction(() => document.activeElement === document.querySelector('.arazzo-workflow-navigation select'));
        await page.getByRole('button', { name: 'docs', exact: true }).click();
        record('shared facts across modes and removed-origin navigation fallback', width, path);
      }
      if (path.endsWith('row-limit.arazzo.yaml')) {
        await page.getByRole('searchbox').fill('observation-250');
        const result = page.getByRole('button', { name: /Inspect authored step .*\.observation-250/ });
        await result.click();
        assert((await details(page).textContent()).includes('observation-250'));
        await dismiss(page, result, width);
        record('row-boundary authored search', width, path);
        await page.getByRole('searchbox').fill('');
      }
      if (path.endsWith('depth-limit.arazzo.yaml') || path.endsWith('recursion.arazzo.yaml')) {
        for (let n = 0; n < 10; n++) {
          const expand = page.getByRole('button', { name: /^Expand / });
          if (!(await expand.count())) break;
          await expand.first().click();
        }
        assert((await page.locator('.arazzo-sequence-list').textContent()).includes(path.includes('recursion') ? 'Recursion' : 'eight nested'));
        const boundary = page.locator('.arazzo-sequence-list').getByRole('button', { name: /^Open workflow .*marker/ }).first();
        const target = (await boundary.getAttribute('aria-label')).split(' · ')[0].slice('Open workflow '.length);
        await boundary.click();
        await page.waitForFunction(target => document.querySelector('.arazzo-workflow-navigation select')?.value === target, target);
        record('boundary destination navigation', width, path);
      }
      if (path === 'digital-product-stress/arazzo.yaml') {
        await page.getByRole('button', { name: 'All workflows', exact: true }).click();
        const overview = page.getByRole('region', { name: 'Workflow overview' });
        for (const type of ['call', 'prerequisite', 'goto', 'retry']) {
          await overview.getByRole('combobox', { name: 'Relationship type' }).selectOption(type);
          const links = await overview.locator('[data-relationship-type]').evaluateAll(elements => elements.map(el => el.dataset.relationshipType));
          assert(links.length && links.every(value => value === type));
          record('classified incoming/outgoing filter', width, path, { type, relationships: links.length });
        }
        await overview.getByRole('combobox', { name: 'Relationship type' }).selectOption('all');
        await shot(page, 'stress-overview', width);
        await nav.selectOption('full-stress-journey');
        for (let n = 0; n < 40; n++) {
          const expand = page.getByRole('button', { name: /^Expand / });
          if (!(await expand.count())) break;
          await expand.first().click();
        }
        const sequence = page.getByRole('region', { name: 'Sequence full-stress-journey' });
        assert.equal(await sequence.locator('[data-sequence-id]').count(), 48);
        const names = await sequence.getByRole('button').evaluateAll(buttons => buttons.map(el => el.getAttribute('aria-label') || el.textContent));
        assert.equal(new Set(names).size, names.length);
        const canvas = sequence.locator('.arazzo-sequence-canvas');
        await canvas.evaluate(el => { el.scrollTop = el.scrollHeight; el.scrollLeft = el.scrollWidth; });
        const geometry = await canvas.evaluate(el => {
          const header = el.querySelector('.arazzo-sequence-participants').getBoundingClientRect();
          const viewport = el.getBoundingClientRect();
          return { scrollTop: el.scrollTop, scrollLeft: el.scrollLeft, headerTop: header.top, canvasTop: viewport.top, width: el.clientWidth, scrollWidth: el.scrollWidth };
        });
        assert(geometry.scrollTop > 0 && geometry.scrollLeft > 0);
        assert(Math.abs(geometry.headerTop - geometry.canvasTop) <= 2);
        await canvas.scrollIntoViewIfNeeded();
        await shot(page, 'stress-scrolled', width);
        record('48-row scene sticky participants and unique occurrence controls', width, path, { geometry, names });
        const capture = sequence.getByRole('button', { name: /^Inspect capture-authorized-payment.capture-payment.*operation/ });
        assert.equal(await capture.count(), 2);
        await capture.nth(1).press('Enter');
        const recovery = await details(page).locator('[data-reading-section="Possible actions — viewer inspection order"]').textContent();
        for (const fact of ['UNKNOWN', '503', 'DECLINED', 'reconcile-payment', 'Retry limit3', 'Retry delay0.5']) assert(recovery.includes(fact));
        await shot(page, 'capture-recovery', width);
        await details(page).locator('.arazzo-recovery-card').filter({ hasText: 'reconcile-payment' }).first().scrollIntoViewIfNeeded();
        await shot(page, 'capture-recovery-card', width);
        await dismiss(page, capture.nth(1), width);
        const selectedContext = await sequence.getByRole('status').textContent();
        assert(selectedContext.includes('capture-authorized-payment.capture-payment') && selectedContext.includes('Caller path:'));
        record('selected caller context outside scrolling canvas', width, path, { selectedContext });
        record('capture uncertainty, bounded recovery and distinct abort evidence', width, path);
        await nav.selectOption('batch-fulfilment');
        await page.getByRole('button', { name: 'Sequence', exact: true }).click();
        const second = page.getByRole('button', { name: /^Inspect batch-fulfilment.second-item.*call/ });
        await second.press('Enter');
        const caller = await details(page).locator('[data-reading-section="Caller-supplied parameters"]').textContent();
        assert(caller.includes('2499') && caller.includes('-B') && caller.includes('digital-upgrade'));
        await shot(page, 'second-item', width);
        await dismiss(page, second, width);
        const open = page.getByRole('button', { name: /^Open workflow fulfil-item from batch-fulfilment.second-item/ });
        await open.press('Enter');
        await page.getByRole('button', { name: 'Back to caller batch-fulfilment.second-item', exact: true }).click();
        await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label')?.startsWith('Collapse batch-fulfilment.second-item'));
        record('second-item mappings and exact caller return', width, path);
      }
      if (path.endsWith('event-based.arazzo.yaml')) {
        await nav.selectOption('event-driven-purchase');
        const origin = page.getByRole('button', { name: /^Inspect event-driven-purchase.await-ready.*operation/ });
        await origin.click();
        const source = await details(page).locator('[data-reading-section="Source / operation"]').textContent();
        assert(source.includes('Correlation$inputs.purchaseId') && source.includes('Timeout12000'));
        const recovery = await details(page).locator('[data-reading-section="Possible actions — viewer inspection order"]').textContent();
        assert(recovery.includes('poll-purchase-until-ready') && recovery.includes('Retry limit2'));
        await details(page).locator('[data-reading-section="Source / operation"]').scrollIntoViewIfNeeded();
        await shot(page, 'event-timeout', width);
        await details(page).locator('.arazzo-recovery-card').filter({ hasText: 'poll-purchase-until-ready' }).scrollIntoViewIfNeeded();
        await shot(page, 'event-fallback', width);
        await dismiss(page, origin, width);
        record('correlation, timeout, receive retry and polling fallback', width, path);
      }
    }
    await page.close();
  }
  assert.equal(observations.filter(o => o.task === 'workflow sequence and keyboard inspection').length, 90);
  assert.equal(observations.filter(o => o.task === 'small-pack step details').length, 14);
  assert.deepEqual(errors, []);
} catch (error) {
  failures.push({ outcome: 'failed', message: error.message, stack: error.stack });
  throw error;
} finally {
  await writeFile(resolve(evidence, 'observations.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceDiff: createHash('sha256').update(execFileSync('git', ['diff', '--', 'packages/jentic-arazzo-ui'])).digest('hex'), buildHashes: hashes, observations, errors, failures, humanComprehension: 'Not measured; see comprehension-protocol.md' }, null, 2));
  await browser.close();
  server.close();
}
console.log(`Passed ${observations.length} observations across nine documents, 45 workflows and both widths.`);
