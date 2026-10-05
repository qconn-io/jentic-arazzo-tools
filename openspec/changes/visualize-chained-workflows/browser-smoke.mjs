// run with Node from .nvmrc; PLAYWRIGHT_MODULE may point to an isolated Playwright install.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import {
  relationshipGraph,
  callRecoveryCycle,
  mixedCycle,
  unlinkedGraph,
  localPrerequisites,
} from '../../../packages/jentic-arazzo-ui/test/fixtures/graphs.ts';
import {
  scopedActions,
  classifiedTargets,
} from '../../../packages/jentic-arazzo-ui/test/fixtures/navigation.ts';
import { asynchronous } from '../../../packages/jentic-arazzo-ui/test/fixtures/sources.ts';
import {
  unknownVersion,
  newerFieldsIn10,
  provenance,
} from '../../../packages/jentic-arazzo-ui/test/fixtures/versions.ts';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const build = resolve(root, 'packages/jentic-arazzo-ui/build');
const evidence = process.env.BROWSER_EVIDENCE_DIR
  ? resolve(process.env.BROWSER_EVIDENCE_DIR)
  : fileURLToPath(new URL('./browser-evidence/', import.meta.url));
await mkdir(evidence, { recursive: true });
const builtHTML = await readFile(resolve(build, 'index.html'), 'utf8');
// retain the built assets and CSS, mounting fixtures through the production imperative API.
const harnessHTML = builtHTML.replace(/<script>[^]*?<\/script>/, '');
const assetTypes = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.yaml': 'text/plain',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const name = pathname === '/' || pathname === '/app' ? 'index.html' : pathname.slice(1);
    const path = resolve(build, name);
    assert(path.startsWith(build + '/'));
    res.setHeader('Content-Type', assetTypes[extname(name)] || 'text/html');
    res.end(
      name === 'index.html'
        ? pathname === '/app'
          ? builtHTML
          : harnessHTML
        : await readFile(path),
    );
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: chromium.executablePath(),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10000);
const failures = [];
page.on('pageerror', (e) => failures.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') failures.push(m.text());
});
const observations = [];
const externalRequests = [];
page.on('request', (request) => {
  if (!request.url().startsWith(url)) externalRequests.push(request.url());
});
const record = (name, data = {}) => {
  observations.push({ name, ...data });
  console.log(`PASS ${name}`);
};
const screenshot = (name) => page.screenshot({ path: resolve(evidence, name + '.png') });
const ref = async (method) => page.evaluate((m) => window.instance.getRef()[m](), method);
async function mount(document, initialView = 'diagram') {
  await page.goto(url);
  await page.evaluate(
    ({ document, initialView }) => {
      window.instance = ArazzoUIStandalone({ dom_id: '#root', document, initialView });
    },
    { document, initialView },
  );
  await page.waitForFunction(() => !!window.instance.getRef());
  if (document.arazzo !== '1.2.0') await page.locator('.react-flow__node').first().waitFor();
  await page.waitForTimeout(150);
}
async function tab(name) {
  await page.locator('.arazzo-workflow-tabs').getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(450);
}
async function fit() {
  await page.evaluate(() => window.instance.getRef().fitView());
  await page.waitForTimeout(250);
}
async function geometry() {
  return page.locator('.react-flow__node').evaluateAll((elements) =>
    elements.map((el) => {
      const box = el.getBoundingClientRect();
      const card = el.firstElementChild.getBoundingClientRect();
      return {
        id: el.dataset.id,
        text: el.textContent,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        right: box.right,
        bottom: box.bottom,
        cardRight: card.right,
        cardBottom: card.bottom,
        style: el.style.transform,
      };
    }),
  );
}
function disjoint(nodes) {
  for (const node of nodes) {
    assert([node.x, node.y, node.width, node.height].every(Number.isFinite));
    assert(node.width > 0 && node.height > 0);
    assert(
      node.cardRight <= node.right + 2 && node.cardBottom <= node.bottom + 2,
      `content exceeds reserved card: ${node.text}`,
    );
  }
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i],
        b = nodes[j];
      assert(
        a.right <= b.x + 1 || b.right <= a.x + 1 || a.bottom <= b.y + 1 || b.bottom <= a.y + 1,
        `cards overlap: ${a.text} / ${b.text}`,
      );
    }
}
const edges = () =>
  page.locator('.react-flow__edge').evaluateAll((es) =>
    es.map((e) => ({
      title: e.querySelector('title')?.textContent,
      label: e.querySelector('text')?.textContent,
      path: e.querySelector('.react-flow__edge-path')?.getAttribute('d'),
      length: e.querySelector('.react-flow__edge-path')?.getTotalLength(),
      marker: e.querySelector('.react-flow__edge-path')?.getAttribute('marker-end'),
    })),
  );
function routed(es) {
  for (const e of es)
    assert(e.path && !/NaN|Infinity/.test(e.path) && e.length > 0 && e.marker, JSON.stringify(e));
}
try {
  // the deployable app itself boots, fetches its packaged sample and can change views.
  await page.goto(url + '/app');
  await page.locator('.workflow-details').first().waitFor();
  await page.getByRole('button', { name: 'diagram', exact: true }).click();
  await page.locator('.react-flow__node').first().waitFor();
  record('built standalone app boot and view switch');

  await mount(relationshipGraph);
  await tab('All workflows');
  await fit();
  const dense = await geometry();
  disjoint(dense);
  assert.equal(dense.length, 6);
  const routes = await edges();
  routed(routes);
  assert.equal(routes.length, 11);
  assert.equal(new Set(routes.map((e) => e.path)).size, 11);
  assert.equal(routes.filter((e) => e.title?.includes('Prerequisite cycle')).length, 3);
  assert(routes.every((e) => e.label.length < 32), 'overview relationship labels stay compact');
  const positions = dense.map((n) => n.style);
  await screenshot('dense-cyclic-overview');
  const relationshipPicker = page.getByRole('combobox', { name: 'Inspect relationship' });
  await relationshipPicker.selectOption({ index: 4 });
  const relationshipDetails = page.getByRole('region', { name: 'Selected relationship' });
  assert((await relationshipDetails.innerText()).includes('parameters'));
  await screenshot('dense-selected-relationship');
  await relationshipPicker.selectOption('');
  assert.equal(await relationshipDetails.count(), 0);
  record('compact overview labels retain full relationship details through keyboard-accessible selection');
  await tab('wfA');
  await tab('All workflows');
  await fit();
  assert.deepEqual(
    (await geometry()).map((n) => n.style),
    positions,
  );
  record(
    'dense SCC overview: disjoint cards, all parallel/self-loop routes, scoped cycle warnings, deterministic positions',
    { cards: dense, edges: routes },
  );

  for (const [name, fixture] of [
    ['call-recovery', callRecoveryCycle],
    ['mixed', mixedCycle],
  ]) {
    await mount(fixture);
    await tab('All workflows');
    await fit();
    const nodes = await geometry();
    disjoint(nodes);
    const es = await edges();
    routed(es);
    assert(!nodes.some((n) => n.text.includes('Prerequisite cycle')));
    assert(!es.some((e) => e.label?.includes('Prerequisite cycle')));
    record(`${name} cycle has no prerequisite-cycle warning`, {
      nodes: nodes.length,
      edges: es.length,
    });
  }
  await mount(unlinkedGraph);
  await tab('All workflows');
  await fit();
  const grid = await geometry();
  disjoint(grid);
  assert.equal(grid.length, 7);
  assert.equal(new Set(grid.map((n) => n.style.match(/translate\(([^,]+)/)?.[1])).size, 3);
  assert.equal((await edges()).length, 0);
  await screenshot('unlinked-overview-grid');
  record('unlinked overview uses bounded three-column grid', { cards: grid });

  await mount(localPrerequisites);
  await fit();
  const prerequisites = await geometry();
  disjoint(prerequisites);
  const steps = await page
    .locator('.react-flow__node [data-step-id]')
    .evaluateAll((es) => es.map((e) => ({ id: e.dataset.stepId, y: e.getBoundingClientRect().y })));
  assert.deepEqual(
    steps.map((s) => s.id),
    ['processPayment', 'validateCard', 'checkInventory'],
  );
  assert(steps[0].y < steps[1].y && steps[1].y < steps[2].y);
  const prereqEdges = (await edges()).filter((e) => e.label?.startsWith('Prerequisite'));
  routed(prereqEdges);
  assert.equal(prereqEdges.length, 2);
  assert(prereqEdges.every((e) => /^M [\d.-]+ [\d.-]+ L -/.test(e.path)));
  await screenshot('local-prerequisites');
  record('prerequisites have real side routes without reordering authored steps', {
    steps,
    edges: prereqEdges,
  });

  await mount(scopedActions, 'split');
  await page
    .locator('.react-flow__node details')
    .evaluateAll((es) => es.forEach((e) => (e.open = true)));
  await page.waitForTimeout(250);
  disjoint(await geometry());
  record('expanded authored action/step details remain within disjoint card bounds');
  await page
    .locator('.react-flow__node details')
    .evaluateAll((es) => es.forEach((e) => (e.open = false)));
  await page.waitForTimeout(250);
  const call = page.locator('.react-flow__node [data-workflow-id="flowA"][data-step-id="call"]');
  await page.evaluate(() => window.instance.getRef().setZoom(0.3));
  await page.waitForTimeout(150);
  // use production imperative focus to bring the calling card into the diagram viewport.
  await page.evaluate(() => window.instance.getRef().selectStep('call'));
  await page.waitForTimeout(650);
  await call.click({ position: { x: 40, y: 20 } });
  await page.waitForTimeout(500);
  const owner = await page.locator('details[data-workflow-id="flowA"]').evaluate((e) => e.open);
  assert(owner);
  assert.equal(
    await page.locator('details[data-workflow-id="flowB"]').evaluate((e) => e.open),
    false,
  );
  assert.equal(await ref('getActiveWorkflowId'), 'flowA');
  await screenshot('calling-workflow-ownership');
  await call
    .getByRole('button', {
      name: 'Prerequisite: $workflows.flowB.steps.init (local-step)',
      exact: true,
    })
    .click();
  await page.waitForTimeout(800);
  assert.equal(await ref('getActiveWorkflowId'), 'flowB');
  assert.equal(await ref('getSelectedStepId'), 'init');
  const target = page.locator(
    '.react-flow__node.selected [data-workflow-id="flowB"][data-step-id="init"]',
  );
  await target.waitFor();
  const center = await target.evaluate((e) => {
    const card = e.closest('.react-flow__node').getBoundingClientRect(),
      pane = e.closest('.react-flow').getBoundingClientRect();
    return {
      dx: card.x + card.width / 2 - (pane.x + pane.width / 2),
      dy: card.y + card.height / 2 - (pane.y + pane.height / 2),
    };
  });
  assert(Math.abs(center.dx) < 3 && Math.abs(center.dy) < 3, JSON.stringify(center));
  const docFocus = await page
    .locator('details[data-workflow-id="flowB"] [data-step-id="init"]')
    .evaluate((e) => {
      const pane = e.closest('.arazzo-docs-view').getBoundingClientRect(),
        r = e.getBoundingClientRect();
      return {
        open: e.closest('details').open,
        y: r.y,
        bottom: r.bottom,
        paneTop: pane.y,
        paneBottom: pane.bottom,
      };
    });
  assert(docFocus.open && docFocus.y < docFocus.paneBottom && docFocus.bottom > docFocus.paneTop);
  await page.waitForTimeout(600);
  assert.equal(await ref('getSelectedStepId'), 'init');
  await screenshot('cross-workflow-destination-focus');
  record(
    'duplicate init navigation centers flowB.init, scrolls owning docs and survives later layout effects',
    { center, docFocus },
  );
  disjoint(await geometry());

  await page.getByRole('button', { name: 'docs', exact: true }).click();
  const callingDocs = page.locator('details[data-workflow-id="flowA"]');
  if (!(await callingDocs.evaluate((e) => e.open)))
    await callingDocs.locator(':scope > summary').click();
  await callingDocs
    .locator(
      '[data-step-id="call"] a[data-target-workflow-id="flowA"][data-target-step-id="prepare"]',
    )
    .click();
  await page.waitForTimeout(700);
  assert.equal(await ref('getActiveWorkflowId'), 'flowA');
  assert.equal(await ref('getSelectedStepId'), 'prepare');
  const docsOnlyFocus = await callingDocs.locator('[data-step-id="prepare"]').evaluate((e) => {
    const pane = e.closest('.arazzo-docs-view').getBoundingClientRect(),
      r = e.getBoundingClientRect();
    return { y: r.y, bottom: r.bottom, paneTop: pane.y, paneBottom: pane.bottom };
  });
  assert(
    docsOnlyFocus.y < docsOnlyFocus.paneBottom && docsOnlyFocus.bottom > docsOnlyFocus.paneTop,
  );
  await screenshot('docs-only-prerequisite-focus');
  record('docs-only prerequisite link focuses and scrolls the scoped destination', {
    docsOnlyFocus,
  });

  await mount(classifiedTargets);
  await fit();
  const disabled = await page.locator('.react-flow__node button:disabled').allTextContents();
  assert(disabled.some((s) => s.includes('$sourceDescriptions.remote.flowB.steps.init')));
  assert(disabled.some((s) => s.includes('missing')));
  const before = await ref('getActiveWorkflowId');
  await page.locator('.react-flow__node button:disabled').first().dispatchEvent('click');
  assert.equal(await ref('getActiveWorkflowId'), before);
  disjoint(await geometry());
  record('external/missing target chips stay inert with original reference and classification', {
    disabled,
  });

  await mount(asynchronous);
  await fit();
  disjoint(await geometry());
  const send = page.locator('.react-flow__node [data-step-id="send"]');
  const receive = page.locator('.react-flow__node [data-step-id="receive"]');
  assert((await send.innerText()).includes('Authored intent: send'));
  assert((await send.innerText()).includes('q={$inputs.q}&literal=a%26b&empty='));
  assert((await receive.innerText()).includes('Authored intent: receive'));
  assert((await receive.innerText()).includes('Timeout: 0 ms'));
  assert((await receive.innerText()).includes('$message.header#/requestId'));
  await page.evaluate(() => {
    window.instance.getRef().setZoom(0.8);
    window.instance.getRef().selectStep('receive');
  });
  await page.waitForTimeout(600);
  await screenshot('async-receive-inspection');
  await page.getByRole('button', { name: 'docs', exact: true }).click();
  const workflow = page.locator('details[data-workflow-id="messages"]');
  if (!(await workflow.evaluate((e) => e.open))) await workflow.locator('summary').click();
  const docSend = workflow.locator('[data-step-id="send"]');
  await docSend.locator('summary').filter({ hasText: 'Parameters (1)' }).click();
  const docReceive = workflow.locator('[data-step-id="receive"]');
  await docReceive.locator('summary').filter({ hasText: 'Source binding' }).click();
  const docs = await workflow.innerText();
  assert(docs.includes('q={$inputs.q}&literal=a%26b&empty=') && docs.includes('receive'));
  for (const mode of ['Flowchart', 'Sequence']) {
    await workflow.getByRole('button', { name: mode, exact: true }).click();
    await workflow.locator('.mermaid-rendered svg:visible').waitFor();
    assert((await workflow.locator('.mermaid-rendered svg:visible').textContent()).length > 0);
    if (mode === 'Flowchart') {
      const rendered = await workflow.locator('.mermaid-rendered svg:visible').textContent();
      assert(rendered.includes('querystring') && rendered.includes('q={$inputs.q}&literal=a%26b&empty='));
    }
  }
  await screenshot('async-mermaid-sequence');
  record(
    'async send/receive metadata, opaque locators and whole querystring survive cards/docs; both Mermaid views render',
  );

  await mount(newerFieldsIn10);
  await fit();
  await page.evaluate(() => {
    window.instance.getRef().setZoom(0.8);
    window.instance.getRef().selectStep('receive');
  });
  await page.waitForTimeout(600);
  assert((await page.locator('body').innerText()).includes('not understood by this profile'));
  assert.equal((await edges()).filter((e) => e.label?.startsWith('Prerequisite')).length, 0);
  await screenshot('older-profile-limits');
  record('older profile reports unsupported 1.1 intent without inferred prerequisite edges');

  await mount(unknownVersion);
  await page.locator('.arazzo-ui pre').waitFor();
  const raw = await page.locator('.arazzo-ui pre').innerText();
  assert.deepEqual(JSON.parse(raw), unknownVersion);
  assert.deepEqual(await ref('getDocument'), unknownVersion);
  assert.equal(await page.locator('.react-flow__node').count(), 0);
  await screenshot('unsupported-version-raw');
  record(
    'parseable future profile retains exact authored data in raw fallback without semantic graph',
  );

  await mount(provenance);
  await fit();
  assert.deepEqual(await ref('getDocument'), provenance);
  record(
    'browser imperative retrieval preserves unknown content, authored identity, custom dialect and opaque references',
  );
  const reviewFixture = {
    arazzo: '1.1.0',
    info: { title: 'Review fixes', version: '1', description: 'See [API docs](https://example.test) and **important** details.\n\nSecond paragraph with *emphasis*. <https://example.test/autolink>\n\nUse `<tag>`.\n\n```xml\n<entry>&value</entry>\n```\n\n<img src="x" onerror="alert(1)">' },
    sourceDescriptions: [{ name: 'remote', type: 'arazzo', url: 'https://example.test/remote' }],
    workflows: [
      { workflowId: 'owner', steps: [
        { stepId: 'failed', operationId: 'opaque', dependsOn: ['$workflows.other.steps.y'],
          onFailure: [
            { name: 'external recovery', type: 'retry', workflowId: '$sourceDescriptions.remote.recover' },
            { name: 'local recovery', type: 'retry', stepId: 'repair' },
            { name: 'cross rejected', type: 'goto', stepId: '$workflows.other.steps.y' },
          ] },
        { stepId: 'repair', operationId: 'repair' },
        { stepId: 'call', workflowId: '$sourceDescriptions.remote.recover' },
      ] },
      { workflowId: 'other', steps: [{ stepId: 'y', operationId: 'opaque' }] },
    ],
  };
  await mount(reviewFixture, 'split');
  await fit();
  const reviewEdges = await edges();
  assert.equal(reviewEdges.filter((e) => e.label === 'Retry return').length, 2);
  assert.equal(reviewEdges.filter((e) => e.label === 'Call return').length, 1);
  assert.equal(reviewEdges.filter((e) => e.label === 'cross rejected').length, 0);
  routed(reviewEdges);
  const article = page.locator('.arazzo-docs-prose');
  assert.equal(await article.getByRole('link', { name: 'API docs', exact: true }).getAttribute('href'), 'https://example.test');
  assert.equal(await article.locator('strong').filter({ hasText: /^important$/ }).count(), 1);
  assert.equal(await article.locator('em').filter({ hasText: /^emphasis$/ }).count(), 1);
  assert.equal(await article.getByRole('link', { name: 'https://example.test/autolink', exact: true }).getAttribute('href'), 'https://example.test/autolink');
  assert.equal(await article.locator('code').filter({ hasText: /^<tag>$/ }).count(), 1);
  assert.equal(await article.locator('code').filter({ hasText: /^<entry>&value<\/entry>\n$/ }).count(), 1);
  assert.equal(await article.locator('img').count(), 0);
  await screenshot('review-return-and-commonmark');
  record('review fixes: external/local-step retry and external-call returns render; cross-workflow action is inert; CommonMark links and emphasis render');
  // Exercise the public callback through the production React Flow edge click.
  for (const [name, document, activeWorkflowId, action] of [
    ['overview', relationshipGraph, null, false],
    ['overview-action', relationshipGraph, null, true],
    ['step-prerequisite', localPrerequisites, 'payment', false],
  ]) {
    await page.goto(url);
    await page.evaluate(({ document, activeWorkflowId }) => {
      window.edgeEvents = [];
      window.instance = ArazzoUIStandalone({ dom_id: '#root', document, initialView: 'diagram', activeWorkflowId,
        onEdgeSelect: (id, edge) => window.edgeEvents.push({ id, type: edge.type, data: edge.data }) });
    }, { document, activeWorkflowId });
    let edge = page.locator('.react-flow__edge-relationship');
    if (action) edge = edge.filter({ has: page.locator('title').filter({ hasText: 'failure/retry' }) });
    edge = edge.first();
    await edge.waitFor();
    await fit();
    await edge.locator('path').first().dispatchEvent('click');
    const events = await page.evaluate(() => window.edgeEvents);
    assert.equal(events.length, 1);
    const [event] = events;
    assert.equal(event.type, 'relationship');
    assert.equal(event.data.type, 'relationship');
    assert(['prerequisite', 'call', 'action'].includes(event.data.kind));
    assert.equal(typeof event.data.label, 'string');
    assert(Object.keys(event.data).every((key) => ['type', 'kind', 'label', 'warning', 'channel', 'actionType'].includes(key)));
    if (action) {
      assert.equal(event.data.channel, 'failure');
      assert.equal(event.data.actionType, 'retry');
    }
    record(`${name} production relationship callback exposes only public data`, { event });
  }
  assert.deepEqual(externalRequests, [], 'source descriptions must not be fetched');
  assert.deepEqual(failures, [], `browser errors: ${failures.join('\n')}`);
  await writeFile(
    resolve(evidence, 'observations.json'),
    JSON.stringify(
      {
        date: '2026-10-05',
        browser: await browser.version(),
        viewport: page.viewportSize(),
        buildAssets: builtHTML.match(/(?:src|href)="\.\/([^" ]+\.(?:js|css))"/g),
        observations,
        browserErrors: failures,
        externalRequests,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `All ${observations.length} browser smoke observations passed; evidence: ${evidence}`,
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
