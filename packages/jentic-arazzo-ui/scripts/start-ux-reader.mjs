import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { chromium } from '@playwright/test';
import { root, output, verifyIdentity } from './production-artifacts.mjs';

// Facilitator utility; never supplies optional setup or fabricates reader results.
const identity = await verifyIdentity();
const width = Number(process.argv[2] ?? 1440);
if (![1440, 480].includes(width)) throw new Error('Use an accepted viewport width: 1440 or 480');
const base = process.argv[3] ?? 'http://127.0.0.1:43187';
const url = new URL(base);
if (!['localhost', '127.0.0.1'].includes(url.hostname))
  throw new Error('Serve the identified candidate locally');
const response = await fetch(new URL('/__identity', url));
if (!response.ok || JSON.stringify(await response.json()) !== JSON.stringify(identity))
  throw new Error('Reader server does not serve the identified current candidate');
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width, height: 1000 } });
const contract = await readFile(resolve(root, 'test/fixtures/petstore-contract.json'), 'utf8');
const source = 'https://petstore3.swagger.io/api/v3/openapi.json';
await context.route('**/*', (route) => {
  const request = route.request();
  if (request.method() !== 'GET') return route.abort();
  if (request.url() === source)
    return route.fulfill({ contentType: 'application/json', body: contract });
  return new URL(request.url()).origin === url.origin ? route.continue() : route.abort();
});
await context.addInitScript(() => {
  const original = SVGGraphicsElement.prototype.getBBox;
  Object.assign(window, { readerRenderFailure: false });
  SVGGraphicsElement.prototype.getBBox = function (options) {
    if (window.readerRenderFailure)
      throw new Error('Facilitator supplied localized rendering error');
    return original.call(this, options);
  };
});
const page = await context.newPage();
await page.goto(new URL('/', url).href);
const terminal = createInterface({ input: process.stdin, output: process.stdout });
console.log(
  `Identified reader candidate: ${resolve(output, 'identity.json')} at ${width}px. Obtain consent and record actual results in the protocol. Facilitator commands: fail-render, recover, fresh, quit.`,
);
try {
  for await (const command of terminal) {
    if (command.trim() === 'quit') break;
    if (command.trim() === 'fresh') await page.goto(new URL('/', url).href);
    else if (['fail-render', 'recover'].includes(command.trim()))
      await page.evaluate((value) => {
        window.readerRenderFailure = value;
      }, command.trim() === 'fail-render');
    else console.log('Commands: fail-render, recover, fresh, quit');
  }
} finally {
  terminal.close();
  await browser.close();
}
