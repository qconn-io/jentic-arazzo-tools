import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
export const identity = JSON.parse(readFileSync('test-output/browser/identity.json', 'utf8'));

export const staticPaths = new Set(
  Object.keys(identity.artifacts)
    .filter((path) => /\.(?:m?js|css|svg|png|jpe?g|ico|woff2?|wasm)$/.test(path))
    .map((path) =>
      path.startsWith('build/')
        ? `/${path.slice(6)}`
        : `/consumer/${path.slice('test-output/package-consumer/app/'.length)}`,
    ),
);
export function installProductionChecks() {
  test.beforeEach(async ({ page, baseURL }) => {
    const response = await page.request.get('/__identity');
    expect(response.headers()['content-type']).toContain('charset=utf-8');
    expect(await response.json()).toEqual(identity);
    const errors: string[] = [],
      forbidden: string[] = [],
      dependencies: string[] = [],
      requests: string[] = [];
    const explicitSources = new Set<string>();

    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      requests.push(`${request.method()} ${request.url()}`);
      const current = new URL(page.url());
      const allowed = [
        current.searchParams.get('document') ??
          new URLSearchParams(current.hash.slice(1)).get('document') ??
          `${baseURL}/petstore-order-workflow.arazzo.yaml`,
        current.searchParams.get('scenarios'),
        current.searchParams.get('systemsProfile'),
      ];
      const requested = new URL(request.url());
      const dataRequest = !request.isNavigationRequest() && !staticPaths.has(requested.pathname);
      const selected = allowed.includes(request.url());
      const fixture = requested.pathname === '/fixtures/readiness.json';
      if (dataRequest && !selected && !fixture && !explicitSources.has(request.url()))
        dependencies.push(request.url());
      if (
        request.method() !== 'GET' ||
        (requested.origin !== new URL(baseURL!).origin && !explicitSources.has(request.url())) ||
        (dataRequest && !selected && !fixture && !explicitSources.has(request.url()))
      )
        forbidden.push(`${request.method()} ${request.url()}`);
    });
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(baseURL!).origin
        ? route.continue()
        : route.abort(),
    );
    await page.addInitScript(() => {
      const originalPush = history.pushState.bind(history),
        originalReplace = history.replaceState.bind(history);
      Object.assign(window, { acceptanceHistory: [] as string[] });
      history.pushState = (...args) => {
        (window as unknown as { acceptanceHistory: string[] }).acceptanceHistory.push('push');
        originalPush(...args);
      };
      history.replaceState = (...args) => {
        (window as unknown as { acceptanceHistory: string[] }).acceptanceHistory.push('replace');
        originalReplace(...args);
      };
    });
    Object.assign(page, {
      acceptanceErrors: errors,
      acceptanceForbidden: forbidden,
      acceptanceDependencies: dependencies,
      acceptanceExplicitSources: explicitSources,
      acceptanceRequests: requests,
    });
  });

  test.afterEach(async ({ page }, info) => {
    const state = page as Page & {
      acceptanceErrors: string[];
      acceptanceForbidden: string[];
      acceptanceDependencies: string[];
      acceptanceRequests: string[];
    };
    await info.attach('browser-checks', {
      body: JSON.stringify({
        errors: state.acceptanceErrors,
        forbidden: state.acceptanceForbidden,
        dependencies: state.acceptanceDependencies,
        requests: state.acceptanceRequests,
      }),
      contentType: 'application/json',
    });
    expect(state.acceptanceErrors).toEqual([]);
    expect(state.acceptanceForbidden).toEqual([]);
    expect(state.acceptanceDependencies).toEqual([]);
    if (page.url().includes('/consumer/'))
      expect(
        await page.evaluate(
          () => (window as unknown as { acceptanceHistory: string[] }).acceptanceHistory,
        ),
      ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await info.attach('current-production-artifacts', {
      body: JSON.stringify(identity),
      contentType: 'application/json',
    });
    if (info.status === 'passed')
      await info.attach('production-view', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
  });
}

export const inspector = (page: Page) => page.getByLabel('Selection details', { exact: true });
export function explicitSources(page: Page): Set<string> {
  return (page as Page & { acceptanceExplicitSources: Set<string> }).acceptanceExplicitSources;
}
