import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  readInventory,
  type AcceptanceDocument,
  type AcceptanceWorkflow,
} from '../fixtures/workflowUxInventory';
import {
  installProductionChecks,
  inspector,
  explicitSources,
  manualStandalone,
} from './productionSupport';

installProductionChecks();
const inventory = readInventory();
const petstoreContract = JSON.parse(readFileSync('test/fixtures/petstore-contract.json', 'utf8'));
const petstoreSource = 'https://petstore3.swagger.io/api/v3/openapi.json';
const layoutNames = {
  diagram: 'Workflow diagram',
  docs: 'Step descriptions',
  split: 'Side by side',
};
const representationNames = {
  docs: 'Step descriptions',
  sequence: 'Sequence diagram',
  flowchart: 'Flowchart',
};
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
async function choose(page: Page, name: string) {
  if (['Workflow diagram', 'Flowchart', 'Side by side', 'Systems view'].includes(name)) {
    const disclosure = page.locator('details.arazzo-more-views');
    if (!(await disclosure.evaluate((element) => (element as HTMLDetailsElement).open)))
      await disclosure.locator(':scope > summary').click();
    await disclosure.getByRole('button', { name, exact: true }).click();
  } else await page.getByRole('button', { name, exact: true }).click();
}
async function openDocument(page: Page, entry: AcceptanceDocument, baseURL: string) {
  await page.goto(
    entry.path.includes('petstore-order')
      ? '/'
      : `/?document=${encodeURIComponent(`${baseURL}/${entry.path.slice('public/'.length)}`)}`,
  );
  await expect(page.getByRole('combobox', { name: 'Select workflow' })).toBeVisible();
}
async function assertReadableDetails(page: Page, workflowId: string, stepId: string) {
  const control = page
    .getByRole('button', {
      name: new RegExp(`^Inspect ${escaped(workflowId)}\\.${escaped(stepId)}(?: ·|$)`),
    })
    .first();
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeVisible();
  let bounds = await control.boundingBox();
  if (await control.evaluate((node) => Boolean(node.closest('.react-flow')))) {
    for (let attempt = 0; attempt < 5 && (bounds?.height ?? 0) < 32; attempt++) {
      const previous = bounds?.height ?? 0;
      await page.locator('.react-flow__controls-zoomin').click();
      await expect
        .poll(async () => (await control.boundingBox())?.height ?? 0)
        .toBeGreaterThan(previous);
      bounds = await control.boundingBox();
    }
  }
  expect(bounds?.height, 'Detail action must have a readable target').toBeGreaterThanOrEqual(32);
  await control.focus();
  await page.keyboard.press('Enter');
  await expect(inspector(page)).toContainText(`${workflowId}.${stepId}`);
  await page.keyboard.press('Escape');
  await expect(control).toBeFocused();
}

async function assertSequenceSemantics(page: Page, workflow: AcceptanceWorkflow) {
  const actual = await page.locator('.arazzo-sequence svg').evaluate((svg) => {
    const lanes = new Map<string, string>();
    for (const lane of svg.querySelectorAll(':scope > g:not([data-sequence-id])')) {
      const line = lane.querySelector('line');
      if (line)
        lanes.set(
          line.getAttribute('x1')!,
          (lane.querySelector('title')?.textContent ?? '')
            .trim()
            .replace(/ \((?:workflow|source|unknown|external)\)$/, ''),
        );
    }
    const labels = new Map(
      [
        ...document.querySelectorAll(
          'ol[aria-label="Ordered interactions"] [data-sequence-list-id]',
        ),
      ].map((item) => [item.getAttribute('data-sequence-list-id'), item]),
    );
    return [...svg.querySelectorAll('[data-sequence-id]')].map((row) => {
      const identity = JSON.parse(row.getAttribute('data-sequence-id')!);
      const line = row.querySelector(':scope > line');
      const loopX = row
        .querySelector(':scope > path')
        ?.getAttribute('d')
        ?.match(/^M([\d.-]+)/)?.[1];
      const arrow = (element: Element | null) => {
        const id = element?.getAttribute('marker-end')?.match(/^url\(#(.+)\)$/)?.[1];
        return Boolean(
          id &&
          [...svg.querySelectorAll('marker')].some(
            (marker) => marker.id === id && marker.querySelector('path'),
          ),
        );
      };
      return {
        root: identity[1],
        path: identity[2],
        local: identity[3],
        title: row.querySelector('title')?.textContent ?? '',
        fullLabel:
          labels
            .get(row.getAttribute('data-sequence-id'))
            ?.querySelector('[title]')
            ?.getAttribute('title') ?? '',
        from: lanes.get(line?.getAttribute('x1') ?? loopX ?? ''),
        to: lanes.get(line?.getAttribute('x2') ?? loopX ?? ''),
        arrow: arrow(line ?? row.querySelector(':scope > path')),
        returns: [...row.querySelectorAll(':scope > line')].slice(1).map((leg) => ({
          from: lanes.get(leg.getAttribute('x1')!),
          to: lanes.get(leg.getAttribute('x2')!),
          arrow: arrow(leg),
        })),
      };
    });
  });
  const rootRows = actual.filter(
    (row) => row.root === workflow.workflowId && row.path.length === 0,
  );
  const interactions = rootRows.filter((row) => row.local[1] === 'interaction');
  const visible = workflow.limits.includes('rows') ? workflow.steps.slice(0, 199) : workflow.steps;
  expect(
    interactions.map((row) => row.local[0]),
    'Visible interactions must retain independent authored owners',
  ).toEqual(visible.map((step) => step.stepId));
  for (const [index, step] of visible.entries()) {
    const row = interactions[index];
    expect(row.title).toContain(step.stepId);
    expect(row.fullLabel, `${workflow.workflowId}.${step.stepId}: full authored locator`).toContain(
      step.locator,
    );
    if (step.action) expect(row.title).toContain(step.action);
    const destination = step.action === 'receive' ? row.from : row.to;
    expect(step.action === 'receive' ? row.to : row.from).toBe(workflow.workflowId);
    if (step.kind === 'operation') {
      const source = step.locatedSource ?? step.source;
      if (source)
        expect(destination, `${workflow.workflowId}.${step.stepId}: source endpoint`).toBe(source);
      else expect(destination).toContain(`destination · ${step.stepId}`);
    } else if (step.targetKind === 'local-workflow') expect(destination).toBe(step.locator);
    else {
      expect(destination).toContain(step.locator);
      expect(destination).toContain(step.targetKind!);
    }
  }
  const actions = visible.flatMap((step) =>
    step.actions
      .filter((action) => ['goto', 'retry'].includes(action.type))
      .map((action) => ({ ...action, stepId: step.stepId, stepKind: step.kind })),
  );
  const list = page.locator('ol[aria-label="Ordered interactions"]');
  for (const action of actions) {
    const step = list
      .getByRole('button', {
        name: new RegExp(
          `^Inspect ${escaped(workflow.workflowId)}\\.${escaped(action.stepId)} · ${action.stepKind}`,
        ),
      })
      .first()
      .locator('..');
    const disclosure = step.locator('details.arazzo-step-actions');
    await expect(
      disclosure,
      `${workflow.workflowId}.${action.stepId}: action disclosure`,
    ).toBeVisible();
    await disclosure.locator(':scope > summary').click();
    await expect(disclosure).toContainText(action.name);
    await expect(disclosure).toContainText(action.type);
    if (action.target) await expect(disclosure).toContainText(action.target);
    if (action.returnToSource) await expect(disclosure).toContainText('returns to retry');
  }
  const prerequisites = [
    ...workflow.prerequisites.map((reference) => ({ owner: workflow.workflowId, reference })),
    ...visible.flatMap((step) =>
      step.prerequisites.map((reference) => ({ owner: step.stepId, reference })),
    ),
  ];
  const annotations = rootRows.filter((row) => row.local[1] === 'prerequisite');
  expect(annotations).toHaveLength(prerequisites.length);
  for (const prerequisite of prerequisites)
    expect(
      annotations.some(
        (row) => row.local[0] === prerequisite.owner && row.title.includes(prerequisite.reference),
      ),
    ).toBe(true);
}

test('UX default bare entry preserves five known Petstore interactions and readable details', async ({
  page,
}, info) => {
  await page.goto('/');
  expect(new URL(page.url()).search).toBe('');
  const action = page.getByRole('button', {
    name: 'Sequence diagram',
    exact: true,
  });
  await expect(action).toHaveAttribute('aria-pressed', 'true');
  const participants = page.getByLabel('Sequence participants');
  if (process.env.ARAZZO_UX_FAULT === 'petstore-lanes')
    await participants.evaluate((node) => {
      node.textContent = 'Unknown destination · loginUser';
    });
  await expect(
    participants,
    'UX Petstore lanes must identify the known petstoreAPI destination',
  ).toContainText('petstoreAPI');
  await expect(participants.locator(':scope > div')).toHaveCount(2);
  await expect(participants).not.toContainText('Destination not established');
  const initialRows = page.locator('.arazzo-sequence svg [data-sequence-id]');
  await expect(initialRows).toHaveCount(5);
  await info.attach('untouched-first-screen', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  if (info.project.name === 'mobile') {
    const geometry = await initialRows.evaluateAll((nodes) => {
      const canvas = nodes[0].closest('.arazzo-sequence-canvas')!;
      const bounds = canvas.getBoundingClientRect();
      const text = nodes[0].querySelector('text')!;
      return {
        first: nodes[0].getBoundingClientRect().toJSON(),
        next: nodes[1].getBoundingClientRect().toJSON(),
        clip: bounds.toJSON(),
        scroll: canvas.scrollTop,
        textSize: parseFloat(getComputedStyle(text).fontSize) * (text.getScreenCTM()?.a ?? 1),
      };
    });
    expect(geometry.scroll).toBe(0);
    expect(geometry.first.top).toBeGreaterThanOrEqual(geometry.clip.top);
    expect(geometry.first.bottom).toBeLessThanOrEqual(Math.min(900, geometry.clip.bottom));
    expect(geometry.next.top).toBeLessThan(Math.min(900, geometry.clip.bottom));
    expect(geometry.textSize).toBeGreaterThanOrEqual(12);
  }
  const ordered = page.locator('ol[aria-label="Ordered interactions"]');
  await expect(ordered.locator(':scope > li > button.arazzo-reading-identity')).toHaveCount(5);
  const firstIdentity = ordered.getByRole('button', {
    name: /^Inspect authenticateAndOrderPet\.loginUser ·/,
  });
  if (process.env.ARAZZO_UX_FAULT === 'lost-identity')
    await firstIdentity.evaluate((node) =>
      node.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true,
      ),
    );
  await firstIdentity.click();
  await expect(
    inspector(page),
    'UX direct identity activation must inspect the authored step',
  ).toContainText('authenticateAndOrderPet.loginUser');
  await page.keyboard.press('Escape');
  for (const [step, operation] of [
    ['loginUser', 'loginUser'],
    ['findAvailablePets', 'findPetsByStatus'],
    ['placeOrder', 'placeOrder'],
    ['retrieveOrderedPetDetails', 'getPetById'],
    ['verifyOrderConfirmation', 'getOrderById'],
  ]) {
    await expect(ordered).toContainText(step);
    await expect(ordered).toContainText(operation);
    await assertReadableDetails(page, 'authenticateAndOrderPet', step);
  }
  await info.attach('bare-entry-sequence', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('UX Petstore descriptions keep detail entry with its step and overview has no bulk workflow control', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Guided walkthroughs' })).toHaveCount(0);
  await expect(page.locator('.arazzo-guide-setup > details')).not.toHaveAttribute('open', '');
  await choose(page, 'Step descriptions');
  await expect(page.locator('.timeline-dot')).toHaveText(['1', '2', '3', '4', '5']);
  await expect(page.locator('.timeline-line')).toHaveCount(4);
  await expect(page.locator('.timeline-item-last .timeline-line')).toHaveCount(0);
  const identity = page
    .locator('.workflow-details-content')
    .getByRole('button', { name: /^Inspect authenticateAndOrderPet\.loginUser/ });
  await identity.scrollIntoViewIfNeeded();
  await expect(
    identity.locator('xpath=ancestor::*[self::h1 or self::h2 or self::h3 or self::h4]'),
  ).toHaveCount(1);
  await expect(page.locator('.workflow-details-content')).not.toContainText(
    'View details · loginUser',
  );
  await info.attach('descriptions-step', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await identity.click();
  await expect(inspector(page)).toContainText('authenticateAndOrderPet.loginUser');
  await page.keyboard.press('Escape');
  await expect(identity).toBeFocused();
  await page.getByRole('button', { name: 'All workflows' }).click();
  await expect(page.locator('.workflow-details')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(Expand|Collapse) All$/ })).toHaveCount(0);
  await info.attach('overview-no-bulk-control', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('UX following a local call retains sequence and exact caller return', async ({
  page,
  baseURL,
}) => {
  await page.goto(
    `/?document=${encodeURIComponent(`${baseURL}/examples/digital-product/arazzo.yaml`)}`,
  );
  await page.getByRole('combobox', { name: 'Select workflow' }).selectOption('fulfil-purchase');
  await expect(page.getByRole('region', { name: 'Sequence fulfil-purchase' })).toBeVisible();
  const follow = page.locator('.arazzo-sequence-list').getByRole('button', {
    name: /Open workflow reserve-and-capture from fulfil-purchase.reserve-and-pay/,
  });
  if (process.env.ARAZZO_UX_FAULT === 'lost-sequence-follow')
    await follow.evaluate((node) =>
      node.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true,
      ),
    );
  await follow.click();
  await expect(
    page.getByRole('region', { name: 'Sequence reserve-and-capture' }),
    'UX sequence follow must open the accepted callee in sequence',
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Back to caller fulfil-purchase.reserve-and-pay' })
    .click();
  await expect(page.getByRole('region', { name: 'Sequence fulfil-purchase' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Select workflow' })).toHaveValue(
    'fulfil-purchase',
  );
});

for (const entry of inventory.documents) {
  test(`UX root reading matrix ${entry.path}`, async ({ page, baseURL }, info) => {
    test.setTimeout(120_000);
    await openDocument(page, entry, baseURL!);
    const root = entry.workflows[0];
    await page.getByRole('combobox', { name: 'Select workflow' }).selectOption(root.workflowId);
    for (const layout of entry.layouts) {
      const name = layoutNames[layout as keyof typeof layoutNames];
      await choose(page, name);
      const button = page.getByRole('button', {
        name,
        exact: true,
      });
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      if (layout === 'diagram') {
        await expect(page.locator('.react-flow')).toBeVisible();
        await info.attach('diagram-overview-root', {
          body: await page.screenshot(),
          contentType: 'image/png',
        });
        await assertReadableDetails(page, root.workflowId, root.steps[0].stepId);
        await info.attach(`${layout}-root`, {
          body: await page.screenshot(),
          contentType: 'image/png',
        });
        continue;
      }
      for (const representation of entry.representations) {
        const name = representationNames[representation as keyof typeof representationNames];
        await choose(page, name);
        const control = page.getByRole('button', {
          name,
          exact: true,
        });
        await expect(control).toHaveAttribute('aria-pressed', 'true');
        if (representation === 'flowchart') {
          const chart = page.getByRole('region', { name: 'Flowchart', exact: true });
          await expect(chart.locator('svg')).toBeVisible();
          const sizes = await chart.locator('svg').evaluate((node) => {
            if (!(node instanceof SVGSVGElement)) throw new Error('Expected a current SVG');
            return [...node.querySelectorAll('text, .nodeLabel p, .edgeLabel p')].map(
              (label) =>
                parseFloat(getComputedStyle(label).fontSize) *
                Math.abs(node.getScreenCTM()?.a ?? 1),
            );
          });
          expect(sizes.length).toBeGreaterThan(0);
          expect(
            Math.min(...sizes),
            `${entry.path} ${layout}: flowchart labels must remain readable`,
          ).toBeGreaterThanOrEqual(12);
        } else {
          await expect(page.locator('.arazzo-ui')).toContainText(root.steps[0].stepId);
          await assertReadableDetails(page, root.workflowId, root.steps[0].stepId);
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
        await info.attach(`${layout}-${representation}-root`, {
          body: await page.screenshot(),
          contentType: 'image/png',
        });
      }
    }
  });
  for (const workflow of entry.workflows) {
    test(`UX workflow sequence ${entry.path} ${workflow.workflowId}`, async ({
      page,
      baseURL,
    }, info) => {
      await openDocument(page, entry, baseURL!);
      const select = page.getByRole('combobox', { name: 'Select workflow' });
      await expect(select.locator(`option[value="${workflow.workflowId}"]`)).toContainText(
        workflow.workflowId,
      );
      await select.selectOption(workflow.workflowId);
      await page.getByRole('button', { name: `Sequence diagram`, exact: true }).click();
      if (workflow.steps.some((step) => step.locatedSource))
        await expect(page.locator('.arazzo-inspection-status > summary')).toContainText(
          '2 of 2 loaded',
        );
      const participants = page.getByLabel('Sequence participants');
      const sources = await participants.evaluate((node) =>
        [...node.children]
          .filter((child) => child.querySelector('small')?.textContent === 'API description')
          .map((child) => child.querySelector('span')?.textContent)
          .sort(),
      );
      expect(sources, `${workflow.workflowId}: independently expected API lanes`).toEqual(
        [
          ...new Set([
            ...workflow.sources,
            ...workflow.steps.flatMap((step) => (step.locatedSource ? [step.locatedSource] : [])),
          ]),
        ].sort(),
      );
      expect(await participants.innerText()).not.toMatch(/\bP\d+\b/);
      const ordered = page.locator('ol[aria-label="Ordered interactions"]');
      await assertSequenceSemantics(page, workflow);
      if (workflow.relationships.includes('continuation'))
        await expect(ordered).toContainText('Structural continuation');
      if (workflow.relationships.includes('transfer'))
        expect(await ordered.locator('details.arazzo-step-actions').count()).toBeGreaterThan(0);
      if (workflow.relationships.includes('marker'))
        await expect(ordered).toContainText(
          /Collapsed call|limit|boundary|Recursion|external document has not been fetched|workflow is not present/i,
        );
      if (
        workflow.steps.some(
          (step) => step.kind === 'operation' && step.source === null && !step.locatedSource,
        )
      )
        await expect(ordered).toContainText('The API destination is not established');
      if (workflow.limits.includes('rows')) {
        await expect(ordered.locator(':scope > li')).toHaveCount(199);
        await expect(ordered).toContainText('200 rows');
        await expect(
          ordered.getByRole('button', { name: /^View complete documentation/ }),
        ).toBeVisible();
      }
      await assertReadableDetails(page, workflow.workflowId, workflow.steps[0].stepId);
      const second = workflow.steps.find((step) => step.parameters?.amountMinor === 2499);
      if (second) {
        await ordered
          .getByRole('button', {
            name: new RegExp(
              `^Inspect ${escaped(workflow.workflowId)}\\.${escaped(second.stepId)} · call`,
            ),
          })
          .click();
        await expect(inspector(page)).toContainText('2499');
        await expect(inspector(page)).toContainText('second-item');
        for (const value of Object.values(second.parameters!))
          await expect(inspector(page)).toContainText(String(value));
        await page.keyboard.press('Escape');
      }
      await info.attach('workflow-sequence', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    });
  }
}

test('UX Petstore explicit lookup, duplicate, failure and reload keep inspector and sequence current', async ({
  page,
}) => {
  await manualStandalone(page);
  const requests: string[] = [];
  let mode = 'complete';
  let release: (() => void) | undefined;
  await page.route(petstoreSource, async (route) => {
    requests.push(route.request().url());
    if (mode === 'pending')
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    const contract = structuredClone(petstoreContract);
    if (mode === 'missing') contract.paths = {};
    if (mode === 'duplicate') contract.paths['/duplicate'] = contract.paths['/user/login'];
    await route.fulfill({
      status: mode === 'failed' ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(contract),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sequence diagram', exact: true }).click();
  const ordered = page.locator('ol[aria-label="Ordered interactions"]');
  const details = ordered.getByRole('button', {
    name: /^Inspect authenticateAndOrderPet\.loginUser/,
  });
  await details.click();
  await expect(inspector(page)).toContainText('Destination source: petstoreAPI');
  await expect(inspector(page)).toContainText('This operation has not been checked');
  expect(requests).toEqual([]);
  explicitSources(page).add(petstoreSource);
  await inspector(page)
    .getByRole('button', { name: 'Load API description petstoreAPI', exact: true })
    .click();
  await expect(inspector(page)).toContainText('Operation found');
  await expect(inspector(page)).toContainText('Log in with authored credentials');
  await expect(ordered).toContainText('Operation found');
  await expect(page.getByLabel('Sequence participants')).toContainText('petstoreAPI');
  const reload = () =>
    inspector(page)
      .getByRole('button', { name: /^(Reload|Retry) API description petstoreAPI$/ })
      .click();
  mode = 'pending';
  await reload();
  await expect(inspector(page)).toContainText('Checking API description');
  await expect(inspector(page)).not.toContainText('Log in with authored credentials');
  await expect.poll(() => Boolean(release)).toBe(true);
  mode = 'missing';
  release!();
  await expect(inspector(page)).toContainText('Operation not found');
  if (process.env.ARAZZO_UX_FAULT === 'stale-destination')
    await ordered.evaluate((node) => {
      node.textContent += ' Log in with authored credentials';
    });
  await expect(
    ordered,
    'UX stale destination evidence must disappear after reload',
  ).not.toContainText('Log in with authored credentials');
  for (const [next, expected] of [
    ['duplicate', 'Multiple matching operations'],
    ['failed', 'API description unavailable'],
    ['complete', 'Operation found'],
  ]) {
    mode = next;
    await reload();
    await expect(inspector(page)).toContainText(expected);
    await expect(ordered).toContainText(expected);
    await expect(page.getByLabel('Sequence participants')).toContainText('petstoreAPI');
  }
  expect(requests).toEqual(Array(5).fill(petstoreSource));
  await page.keyboard.press('Escape');
  await expect(ordered).toBeVisible();
  await expect(ordered).toContainText('Operation found');
  await expect(details).toBeFocused();
});

test('UX partial and duplicate candidate coverage never promotes an unchecked unique destination', async ({
  page,
  baseURL,
}) => {
  await manualStandalone(page);
  const documentURL = `${baseURL}/acceptance-multi.yaml`;
  const a = `${baseURL}/acceptance-a.json`,
    b = `${baseURL}/acceptance-b.json`;
  const document = {
    arazzo: '1.1.0',
    info: { title: 'Partial candidate acceptance', version: '1' },
    sourceDescriptions: [
      { name: 'a', type: 'openapi', url: a },
      { name: 'b', type: 'openapi', url: b },
    ],
    workflows: [{ workflowId: 'root', steps: [{ stepId: 'login', operationId: 'loginUser' }] }],
  };
  await page.route(documentURL, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(document) }),
  );
  let duplicate = false;
  await page.route(a, (route) => route.fulfill({ json: petstoreContract }));
  await page.route(b, (route) =>
    route.fulfill({ json: duplicate ? petstoreContract : { ...petstoreContract, paths: {} } }),
  );
  await page.goto(`/?document=${encodeURIComponent(documentURL)}`);
  await page.getByRole('button', { name: 'Sequence diagram', exact: true }).click();
  const participants = page.getByLabel('Sequence participants');
  await page
    .locator('.arazzo-sequence-list')
    .getByRole('button', { name: /^Inspect root\.login/ })
    .first()
    .click();
  explicitSources(page).add(a);
  explicitSources(page).add(b);
  await inspector(page)
    .getByRole('button', { name: 'Load API description a', exact: true })
    .click();
  await expect(inspector(page)).toContainText('Some possible API descriptions remain unchecked');
  await expect(participants).toContainText('Ambiguous destination');
  await inspector(page)
    .getByRole('button', { name: 'Load API description b', exact: true })
    .click();
  await expect(inspector(page)).toContainText('Operation found');
  await expect(participants).toContainText('a');
  await expect(participants).not.toContainText('Ambiguous destination');
  duplicate = true;
  await inspector(page)
    .getByRole('button', { name: 'Reload API description b', exact: true })
    .click();
  await expect(inspector(page)).toContainText('Multiple matching operations');
  await expect(participants).toContainText('Ambiguous destination');
});

test('UX first-use guide discovery starts at plain entry and help performs no guide acquisition', async ({
  page,
  baseURL,
}, info) => {
  const acquisitions: string[] = [];
  page.on('request', (request) => {
    if (/scenarios\.json/.test(request.url())) acquisitions.push(request.url());
  });
  await page.goto('/');
  expect(new URL(page.url()).search).toBe('');
  await info.attach('plain-no-guide-panel', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.getByText('Help and guides', { exact: true }).click();
  if (process.env.ARAZZO_UX_FAULT === 'missing-discovery')
    await page.locator('.arazzo-guide-setup').evaluate((node) => node.remove());
  await expect(
    page.locator('.arazzo-guide-setup'),
    'UX first-use discovery must reveal guide purpose without injected setup',
  ).toContainText('Follow an author-provided walkthrough');
  await page.getByText('Load guides from a URL', { exact: true }).click();
  await page.getByText('Guide file format', { exact: true }).click();
  await expect(page.locator('.arazzo-guide-setup')).toContainText('JSON');
  await expect(page.getByRole('textbox', { name: 'Guide file URL' })).toBeVisible();
  expect(acquisitions).toEqual([]);
  await page.getByText('Help and optional views', { exact: true }).click();
  await expect(page.locator('.arazzo-ui')).toContainText('participant');
  expect(acquisitions).toEqual([]);
  await page.getByRole('button', { name: 'Open guided example', exact: true }).click();
  await page
    .getByRole('region', { name: 'Guided walkthroughs' })
    .locator(':scope > details > summary')
    .click();
  await expect(
    page.getByRole('region', { name: 'Guided walkthroughs' }).getByRole('button').first(),
  ).toBeVisible();
  const url = new URL(page.url());
  expect(url.searchParams.get('document')).toBe(`${baseURL}/examples/digital-product/arazzo.yaml`);
  expect(url.searchParams.get('scenarios')).toBe(
    `${baseURL}/examples/digital-product/scenarios.json`,
  );
  expect(acquisitions).toEqual([`${baseURL}/examples/digital-product/scenarios.json`]);
  await info.attach('supplied-guide-entry', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

for (const [state, content, expected] of [
  ['empty', '[]', 'This guide file contains no walkthroughs'],
  ['malformed', '{broken', 'Malformed guide file'],
  ['unavailable', '', 'Guide file unavailable'],
  [
    'mismatched',
    JSON.stringify([
      {
        id: 'wrong-document',
        document: 'other.yaml',
        workflow: 'missing',
        expected: 'Authored only',
        evidence: 'Not executed',
      },
    ]),
    'another document',
  ],
] as const) {
  test(`UX guide ${state} remains local and normal workflow reading recovers`, async ({
    page,
    baseURL,
  }) => {
    if (state === 'mismatched') {
      await page.goto('/consumer/?surface=mismatched-guide');
      await page
        .getByRole('region', { name: 'Guided walkthroughs' })
        .locator(':scope > details > summary')
        .click();
      await page.getByRole('button', { name: 'wrong-document', exact: true }).click();
      await expect(page.locator('.arazzo-ui')).toContainText(expected);
      await page.getByRole('button', { name: 'Return to workflow', exact: true }).click();
      await page.getByRole('button', { name: 'Sequence diagram', exact: true }).click();
      await expect(page.getByLabel('Sequence participants')).toContainText('pay');
      return;
    }
    const guide = `${baseURL}/acceptance-guide.json`;
    let release: (() => void) | undefined;
    await page.route(guide, async (route) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({
        status: state === 'unavailable' ? 404 : 200,
        contentType: 'application/json',
        body: content,
      });
    });
    await page.goto(`/?scenarios=${encodeURIComponent(guide)}`);
    await expect(page.locator('.arazzo-guide-setup')).toContainText('Loading guided walkthroughs');
    await expect.poll(() => Boolean(release)).toBe(true);
    release!();
    await expect(page.locator('.arazzo-guide-setup')).toContainText(expected);
    await page.getByRole('button', { name: 'Sequence diagram', exact: true }).click();
    await expect(page.getByLabel('Sequence participants')).toContainText('petstoreAPI');
    await expect(page.locator('.arazzo-ui')).not.toContainText('Scenario passed');
  });
}

test('UX legacy document query/hash and shared occurrence history preserve exact second-item 2499', async ({
  page,
  baseURL,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL! });
  await page.goto(
    `/#document=${encodeURIComponent(`${baseURL}/examples/digital-product-stress/arazzo.yaml`)}`,
  );
  await expect(page.getByRole('combobox', { name: 'Select workflow' })).toBeVisible();
  if (process.env.ARAZZO_UX_FAULT === 'legacy-consumer')
    await page.getByRole('combobox', { name: 'Select workflow' }).evaluate((node) => {
      node.remove();
    });
  await expect(
    page.getByRole('combobox', { name: 'Select workflow' }),
    'UX legacy hash must restore the authored stress document',
  ).toContainText('batch-fulfilment');
  await page.getByRole('combobox', { name: 'Select workflow' }).selectOption('batch-fulfilment');
  await page.getByRole('button', { name: 'Sequence diagram', exact: true }).click();
  const second = page.locator('.arazzo-sequence-list').getByRole('button', {
    name: /^Inspect batch-fulfilment\.second-item · call/,
  });
  await second.click();
  await expect(inspector(page)).toContainText('2499');
  await page.evaluate(() => navigator.clipboard.writeText('arazzo-acceptance-no-link'));
  await inspector(page).getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .not.toBe('arazzo-acceptance-no-link');
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(shared).origin).toBe(new URL(baseURL!).origin);
  expect(new URL(shared).searchParams.has('location')).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Select workflow' }).selectOption('initialize-session');
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Select workflow' })).toHaveValue(
    'batch-fulfilment',
  );
  await page.goBack();
  await expect(inspector(page)).toContainText('2499');
  await page.goForward();
  await expect(inspector(page)).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole('combobox', { name: 'Select workflow' })).toHaveValue(
    'initialize-session',
  );
  await page.goto(shared);
  await expect(inspector(page)).toContainText('second-item');
  await expect(inspector(page)).toContainText('2499');
  if (page.viewportSize()!.width === 480) {
    await expect(inspector(page)).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('.arazzo-workflow-navigation')).toHaveAttribute('inert', '');
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox', { name: 'Select workflow' })).toBeFocused();
});

test('UX rejected flowchart exposes retry and descriptions without blank success', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = SVGGraphicsElement.prototype.getBBox;
    Object.assign(window, { acceptanceRenderReject: true });
    SVGGraphicsElement.prototype.getBBox = function (options) {
      if ((window as unknown as { acceptanceRenderReject: boolean }).acceptanceRenderReject)
        throw new Error('Controlled Mermaid render rejection');
      return original.call(this, options);
    };
  });
  await page.goto('/');
  await choose(page, 'Flowchart');
  const region = page.getByRole('region', { name: 'Flowchart', exact: true });
  await expect(region).toContainText('Unable to draw this flowchart');
  if (process.env.ARAZZO_UX_FAULT === 'silent-render')
    await region.getByRole('alert').evaluate((node) => node.remove());
  await expect(
    region.getByRole('alert'),
    'UX render rejection must expose localized recovery rather than blank success',
  ).toBeVisible();
  await region.getByRole('button', { name: 'Read step descriptions', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Step descriptions', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await choose(page, 'Flowchart');
  await expect(region).toContainText('Unable to draw this flowchart');
  await page.evaluate(() => Object.assign(window, { acceptanceRenderReject: false }));
  const retry = region.getByRole('button', { name: 'Retry diagram', exact: true });
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(region.locator('svg')).toBeVisible();
  await expect(region.getByRole('alert')).toHaveCount(0);
  await expect(region).toBeFocused();
});

test('UX installed ESM controlled requests, repeated scopes and obsolete provider/document results', async ({
  page,
}) => {
  await page.goto('/consumer/?surface=controlled');
  const direct = page.getByRole('button', { name: 'Sequence diagram', exact: true });
  await direct.click();
  await direct.click();
  expect(await page.evaluate(() => window.acceptanceState.views)).toEqual(['docs']);
  await expect(page.getByRole('region', { name: 'Sequence entry', exact: true })).toHaveCount(0);
  await page.evaluate(() => window.acceptanceControl!.acceptView());
  await expect(page.getByRole('region', { name: 'Sequence entry', exact: true })).toBeVisible();
  const occurrences = page.locator('.arazzo-sequence-list').getByRole('button', {
    name: /^Inspect helper\.capture/,
  });
  await expect(occurrences).toHaveCount(2);
  const names = await occurrences.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label')),
  );
  expect(names[0]).toContain('entry.first-item');
  expect(names[1]).toContain('entry.second-item');
  await page.getByRole('combobox', { name: 'Select workflow' }).selectOption('helper');
  expect(await page.evaluate(() => window.acceptanceState.workflows)).toEqual(['helper']);
  await expect(page.getByRole('combobox', { name: 'Select workflow' })).toHaveValue('entry');
  await page.evaluate(() => window.acceptanceControl!.acceptWorkflow());
  await page.getByRole('button', { name: 'Sequence diagram', exact: true }).click();
  await page
    .locator('.arazzo-sequence-list')
    .getByRole('button', { name: /^Inspect helper\.capture/ })
    .click();
  await inspector(page)
    .getByRole('button', { name: 'Load API description pay', exact: true })
    .click();
  await inspector(page)
    .getByRole('button', { name: 'Load API description other', exact: true })
    .click();
  await expect(inspector(page)).toContainText('Operation found');
  await expect(page.getByLabel('Sequence participants')).toContainText('pay');
  await page.evaluate(() => window.acceptanceControl!.pending());
  await inspector(page)
    .getByRole('button', { name: 'Reload API description pay', exact: true })
    .click();
  await expect(inspector(page)).toContainText('Checking API description');
  await page.evaluate(() => window.acceptanceControl!.replaceProvider());
  await expect(page.getByLabel('Sequence participants')).toContainText('Ambiguous destination');
  await page.evaluate(() => window.acceptanceControl!.release());
  await expect(inspector(page)).not.toContainText('Current provider 0');
  await page.evaluate(() => window.acceptanceControl!.denied());
  await inspector(page)
    .getByRole('button', { name: /^(Load|Reload) API description pay$/ })
    .click();
  await expect(inspector(page)).toContainText('Controlled provider denied acquisition');
  await page.evaluate(() => {
    window.acceptanceControl!.pending();
  });
  await inspector(page)
    .getByRole('button', { name: 'Retry API description pay', exact: true })
    .click();
  await expect(inspector(page)).toContainText('Checking API description');
  await page.evaluate(() => window.acceptanceControl!.replaceDocument());
  await page.evaluate(() => window.acceptanceControl!.release());
  await expect(page.locator('.arazzo-ui')).toContainText('Replacement candidate');
  await expect(page.locator('.arazzo-ui')).not.toContainText('Current provider 0');
  await expect(page.locator('.arazzo-ui')).not.toContainText('Current provider 1');
  expect(await page.evaluate(() => window.acceptanceState.aborted)).toBeGreaterThan(0);
});

for (const outcome of ['svg', 'error'] as const) {
  test(`UX obsolete Mermaid ${outcome} after replacement cannot overwrite current reading`, async ({
    page,
  }) => {
    await page.goto('/consumer/?surface=controlled');
    await page.getByRole('combobox', { name: 'Select workflow' }).selectOption('helper');
    await page.evaluate(() => window.acceptanceControl!.acceptWorkflow());
    await page.getByRole('button', { name: 'Sequence diagram', exact: true }).click();
    await page.evaluate(() => window.acceptanceControl!.acceptView());
    await page.evaluate((outcome) => {
      const original = SVGGraphicsElement.prototype.getBBox;
      Object.assign(window, { acceptanceObsoleteRender: false });
      SVGGraphicsElement.prototype.getBBox = function (options) {
        if (
          !(window as unknown as { acceptanceObsoleteRender: boolean }).acceptanceObsoleteRender
        ) {
          Object.assign(window, { acceptanceObsoleteRender: true });
          window.acceptanceControl!.replaceDocument();
          if (outcome === 'error') throw new Error('Obsolete Mermaid rejection');
        }
        return original.call(this, options);
      };
    }, outcome);
    await choose(page, 'Flowchart');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { acceptanceObsoleteRender: boolean }).acceptanceObsoleteRender,
        ),
      )
      .toBe(true);
    await expect(page.locator('.arazzo-ui')).toContainText('Replacement candidate');
    await choose(page, 'Flowchart');
    await expect(
      page.getByRole('region', { name: 'Flowchart', exact: true }).locator('svg'),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Flowchart', exact: true })).toContainText(
      'replacement',
    );
    await expect(page.locator('.arazzo-ui')).not.toContainText('Obsolete Mermaid rejection');
  });
}

test('UX configured and stale Systems context keeps exact return and explanatory limitations', async ({
  page,
}) => {
  await page.goto('/consumer/?surface=systems');
  await choose(page, 'Systems view');
  await page.getByRole('combobox', { name: 'Select workflow' }).selectOption('fulfil-purchase');
  await page
    .getByRole('button', {
      name: 'Expand standard call fulfil-purchase.reserve-and-pay',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', {
      name: 'Inspect system reserve-and-capture.capture-payment',
      exact: true,
    })
    .click();
  await expect(inspector(page)).toContainText('capture-payment');
  await inspector(page)
    .getByRole('button', { name: 'Open exact workflow occurrence', exact: true })
    .click();
  await expect(inspector(page)).toContainText('fulfil-purchase.reserve-and-pay');
  await inspector(page)
    .getByRole('button', { name: 'Return to Systems context', exact: true })
    .click();
  await expect(inspector(page)).toContainText(
    'Selected system: reserve-and-capture.capture-payment',
  );
  await page.keyboard.press('Escape');
  await page.goto('/consumer/?surface=stale-profile');
  await page.getByText('Supplied system information has limitations.', { exact: true }).click();
  await expect(page.locator('.arazzo-ui')).toContainText('Profile version/document/revision');
  await page.getByRole('button', { name: 'Sequence diagram', exact: true }).click();
  await expect(page.getByLabel('Sequence participants')).toContainText('pay');
  await expect(page.getByLabel('Sequence participants')).not.toContainText('Client');
});

test('UX recursive, depth and row boundaries explain limits and expose complete authored content', async ({
  page,
  baseURL,
}) => {
  const show = async (path: string, workflow: string) => {
    await page.goto(
      `/?document=${encodeURIComponent(`${baseURL}/examples/digital-product-stress/boundaries/${path}.arazzo.yaml`)}`,
    );
    await page.getByRole('combobox', { name: 'Select workflow' }).selectOption(workflow);
    await page.getByRole('button', { name: `Sequence diagram`, exact: true }).click();
  };
  await show('recursion', 'recursive-A');
  await page.getByRole('button', { name: /^Expand recursive-B\.return-A → recursive-A/ }).click();
  await expect(page.getByRole('list', { name: 'Ordered interactions' })).toContainText(
    'Recursion on the current call path',
  );
  await show('depth-limit', 'layer-0');
  for (let layer = 1; layer <= 8; layer++)
    await page
      .getByRole('button', {
        name: new RegExp(`^Expand layer-${layer}\\.next → layer-${layer + 1}`),
      })
      .click();
  await expect(page.getByRole('list', { name: 'Ordered interactions' })).toContainText(
    'eight nested call levels',
  );
  await expect(page.getByRole('button', { name: /^Open workflow layer-9 · marker/ })).toBeVisible();
  await show('row-limit', 'row-limit');
  await page.getByRole('button', { name: /^View complete documentation for row-limit/ }).click();
  await assertReadableDetails(page, 'row-limit', 'observation-250');
});

test('UX restored unavailable guide preserves its exact current workflow occurrence', async ({
  page,
  baseURL,
}, info) => {
  const document = `${baseURL}/examples/digital-product-stress/arazzo.yaml`;
  const guide = `${baseURL}/examples/digital-product-stress/scenarios.json`;
  await page.goto(
    `/?document=${encodeURIComponent(document)}&scenarios=${encodeURIComponent(guide)}`,
  );
  await page
    .getByRole('region', { name: 'Guided walkthroughs' })
    .locator(':scope > details > summary')
    .click();
  await page.getByRole('button', { name: 'two-successful-items', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Next waypoint', exact: true }).click();
  await expect(inspector(page)).toContainText('2499');
  const shared = page.url();
  await page.route(guide, (route) =>
    route.fulfill({ status: 404, body: 'Missing consented guide fixture' }),
  );
  await page.goto(shared);
  await expect(page.locator('.arazzo-guide-setup')).toContainText('Guide file unavailable');
  await expect(inspector(page)).toContainText('second-item');
  await expect(inspector(page)).toContainText('2499');
  await info.attach('restored-guide-unavailable', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await expect(page.locator('details.arazzo-advanced-tools')).not.toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox', { name: 'Select workflow' })).toHaveValue(
    'batch-fulfilment',
  );
});
