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
const stylesheet = assets.find((name) => /^arazzo-ui.*\.css$/.test(name));
const output = fileURLToPath(new URL('../captures/', import.meta.url));
await mkdir(output, { recursive: true });
const longDocument = {
  arazzo: '1.0.1',
  info: { title: 'Long label reading check', version: '1' },
  sourceDescriptions: [{ name: 'petstoreAPI', type: 'openapi', url: './api.yaml' }],
  workflows: [
    {
      workflowId: 'long-workflow',
      summary: 'Find available pets, select an order and inspect its declared details '.repeat(8),
      steps: [
        {
          stepId: 'findAvailablePetsWithAnExtremelyLongAuthoredIdentifierThatMustStayReadable',
          operationId: '$sourceDescriptions.petstoreAPI.findPetsByStatus',
        },
      ],
    },
  ],
};
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://local').pathname;
    if (path === '/long.html') {
      response.setHeader('Content-Type', 'text/html');
      response.end(
        `<!doctype html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="/${stylesheet}"><style>*{box-sizing:border-box;margin:0}html,body,#root{width:100%;height:100%}</style></head><body><div id="root"></div><script src="/${script}"></script><script>window.viewer=ArazzoUIStandalone({dom_id:'#root',document:${JSON.stringify(longDocument)}})</script></body></html>`,
      );
    } else {
      const name = path === '/' ? '/index.html' : path;
      const data = await readFile(resolve(build, '.' + name));
      response.setHeader(
        'Content-Type',
        {
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.html': 'text/html',
          '.yaml': 'text/yaml',
          '.svg': 'image/svg+xml',
        }[extname(name)] ?? 'application/octet-stream',
      );
      response.end(data);
    }
  } catch {
    response.statusCode = 404;
    response.end('Missing');
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const observations = [];
const errors = [];
const failures = [];
try {
  for (const width of [1440, 480]) {
    for (const fixture of ['petstore', 'long']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.goto(base + (fixture === 'long' ? '/long.html' : '/'));
      await expect(page.getByRole('group', { name: 'Reading view' })).toBeVisible();
      const workflow = await page.getByRole('combobox', { name: 'Select workflow' }).inputValue();
      const step =
        fixture === 'long' ? longDocument.workflows[0].steps[0].stepId : 'findAvailablePets';
      const check = async (view) => {
        const metrics = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));
        expect(metrics.page).toBeLessThanOrEqual(metrics.viewport + 1);
        expect(metrics.body).toBeLessThanOrEqual(metrics.viewport + 1);
        observations.push({ fixture, width, view, ...metrics });
        await page.screenshot({ path: resolve(output, `${fixture}-${width}-${view}.png`) });
      };
      await check('descriptions');
      const descriptionDetails = page.getByRole('button', {
        name: `View details for ${workflow}.${step}`,
        exact: true,
      });
      await descriptionDetails.scrollIntoViewIfNeeded();
      await expect(descriptionDetails).toBeVisible();
      await descriptionDetails.focus();
      await check('description-controls');
      await page.keyboard.press('Enter');
      await expect(
        page.getByRole(width === 480 ? 'dialog' : 'region', { name: 'Selection details' }),
      ).toContainText(`${workflow}.${step}`);
      await page.getByRole('button', { name: 'Close details' }).press('Escape');
      await expect(descriptionDetails).toBeFocused();
      await page.getByRole('button', { name: 'Workflow diagram', exact: true }).click();
      await expect(page.locator('.react-flow__node-step').first()).toBeVisible();
      const transform = await page.locator('.react-flow__viewport').getAttribute('style');
      await page.locator('.react-flow__controls-zoomin').click();
      await expect(page.locator('.react-flow__viewport')).not.toHaveAttribute('style', transform);
      await page.locator('.react-flow__controls-zoomout').click();
      const card = page.locator('.react-flow__node-step').first();
      const cardDetails = card.getByRole('button', { name: /^View details for/ });
      const header = card.locator('.arazzo-step-card-header');
      const textBox = await header.locator('strong').boundingBox();
      const actionBox = await cardDetails.boundingBox();
      expect(textBox.x + textBox.width).toBeLessThanOrEqual(actionBox.x);
      await cardDetails.focus();
      await check('cards');
      await page.keyboard.press('Enter');
      await expect(
        page.getByRole(width === 480 ? 'dialog' : 'region', { name: 'Selection details' }),
      ).toContainText(fixture === 'long' ? step : 'loginUser');
      await page.getByRole('button', { name: 'Close details' }).press('Escape');
      await expect(cardDetails).toBeFocused();
      const direct = page.getByRole('button', {
        name: `Sequence diagram for ${workflow}`,
        exact: true,
      });
      await direct.focus();
      await page.keyboard.press('Enter');
      await expect(
        page.getByRole('button', { name: 'Sequence diagram', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      const participants = page.locator('[aria-label="Sequence participants"]');
      expect(await participants.innerText()).not.toMatch(/\bP\d+\b/);
      await page.getByRole('group', { name: 'Reading view' }).scrollIntoViewIfNeeded();
      await expect(participants).toBeVisible();
      if (width === 480) {
        const canvas = page.locator('.arazzo-sequence-canvas');
        const scrolled = await canvas.evaluate((element) => {
          element.scrollLeft = 100;
          const offset = element.scrollLeft;
          element.scrollLeft = 0;
          return offset;
        });
        expect(scrolled).toBeGreaterThan(0);
      }
      await check('sequence-canvas');
      const ordered = page.getByRole('list', { name: 'Ordered interactions' });
      expect(await ordered.innerText()).toContain('findPetsByStatus');
      const details = ordered.getByRole('button', {
        name: new RegExp(`^View details for ${workflow}\\.${step} · operation`),
      });
      await details.scrollIntoViewIfNeeded();
      await expect(details).toBeVisible();
      await details.focus();
      await check('sequence');
      await page.keyboard.press('Enter');
      const panel = page.getByRole(width === 480 ? 'dialog' : 'region', {
        name: 'Selection details',
      });
      await expect(panel).toContainText(`${workflow}.${step}`);
      if (width === 480) {
        await expect(panel).toHaveAttribute('aria-modal', 'true');
        await expect(page.locator('.arazzo-workflow-navigation')).toHaveAttribute('inert', '');
      }
      await page.getByRole('button', { name: 'Close details' }).press('Escape');
      await expect(details).toBeFocused();
      await page.getByRole('button', { name: 'Flowchart', exact: true }).click();
      await expect(page.locator('.mermaid-rendered svg')).toBeVisible();
      await check('flowchart');
      const minimumTextPixels = await page.locator('.mermaid-rendered svg').evaluate((svg) => {
        const scale = Math.abs(svg.getScreenCTM()?.a ?? 1);
        const sizes = [...svg.querySelectorAll('text, .nodeLabel p, .edgeLabel p')]
          .map((label) => parseFloat(getComputedStyle(label).fontSize) * scale)
          .filter(Number.isFinite);
        return sizes.length ? Math.min(...sizes) : null;
      });
      if (minimumTextPixels !== null && minimumTextPixels < 12)
        failures.push({
          id: 'F1-flowchart-readability',
          fixture,
          width,
          minimumTextPixels,
          state: 'FAIL',
          owner: 'gate-workflow-ux-regressions',
          explanation:
            'Fit-to-width Mermaid labels fall below the 12px reading size used by existing cards. Rendering recovery does not repair this.',
        });
      await page.close();
    }
  }
  expect(errors).toEqual([]);
  const hashes = {};
  for (const name of ['index.html', script, stylesheet, 'petstore-order-workflow.arazzo.yaml']) {
    hashes[name] = createHash('sha256')
      .update(await readFile(resolve(build, name)))
      .digest('hex');
  }
  await writeFile(
    resolve(output, 'observations.json'),
    JSON.stringify(
      { capturedAt: new Date().toISOString(), artifacts: hashes, observations, errors, failures },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Captured ${observations.length} views; no page overflow or browser errors; exact detail ownership and keyboard focus passed; ${failures.length} flowchart readability failures recorded for the final UX gate.`,
  );
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
