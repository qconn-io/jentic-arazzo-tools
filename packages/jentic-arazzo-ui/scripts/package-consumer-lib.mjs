import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

export const uiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
export const repoRoot = resolve(uiRoot, '../..');
export const outputRoot = join(uiRoot, 'test-output/package-consumer');
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function run(command, args, cwd = repoRoot, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stderr ?? ''}`);
  return result.stdout?.trim();
}
export async function pack(packageRoot, destination) {
  await mkdir(destination, { recursive: true });
  const result = JSON.parse(
    run('npm', ['pack', '--json', '--pack-destination', destination], packageRoot, true),
  );
  const path = join(destination, result[0].filename);
  return { path, sha256: sha256(await readFile(path)) };
}
export async function installedConsumer(directory, uiPackageRoot = uiRoot) {
  await mkdir(directory, { recursive: true });
  const packs = [];
  for (const name of ['parser', 'resolver'])
    packs.push(
      await pack(join(repoRoot, `packages/jentic-arazzo-${name}`), join(directory, 'packs')),
    );
  packs.push(await pack(uiPackageRoot, join(directory, 'packs')));
  const versions = {};
  for (const name of [
    'react',
    'react-dom',
    '@types/react',
    '@types/react-dom',
    'vite',
    'typescript',
  ])
    versions[name] = JSON.parse(
      await readFile(join(repoRoot, 'node_modules', name, 'package.json'), 'utf8'),
    ).version;
  const rootManifest = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));
  const rootLock = JSON.parse(await readFile(join(repoRoot, 'package-lock.json'), 'utf8'));
  const dependencyPins = Object.fromEntries(
    Object.entries(rootLock.packages)
      .filter(([name]) => /^node_modules\/@speclynx\/[^/]+$/.test(name))
      .map(([name, value]) => [name.slice('node_modules/'.length), value.version]),
  );
  const manifest = {
    private: true,
    type: 'module',
    dependencies: { ...versions },
    // keep native model/parser classes aligned with the approved repository toolchain.
    overrides: { ...rootManifest.overrides, ...dependencyPins },
  };
  await writeFile(join(directory, 'package.json'), JSON.stringify(manifest, null, 2));
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', ...packs.map((p) => p.path)],
    directory,
  );
  // the installed package is a physical unpacked tarball, never a workspace link.
  const installed = join(directory, 'node_modules/@jentic/arazzo-ui');
  const installedManifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  return { packs, versions, dependencyPins, installed, installedManifest };
}
const retainedSymbols = [
  'ArazzoCatalog',
  'ArazzoWorkflowReview',
  'compareWorkflowRevisions',
  'buildCatalogIndex',
  'loadCatalog',
  'projectAsyncAPI',
  'projectOpenAPI',
];
// emitted source-map positions, unlike original sourcesContent or minified names,
// identify which parts of the packed library survived downstream tree shaking.
function mappedOriginalLines(map) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lines = new Map();
  let source = 0,
    line = 0,
    column = 0,
    name = 0;
  for (const generatedLine of map.mappings.split(';')) {
    let generatedColumn = 0;
    for (const encoded of generatedLine.split(',')) {
      if (!encoded) continue;
      const values = [];
      let value = 0,
        shift = 0;
      for (const char of encoded) {
        const digit = chars.indexOf(char);
        value += (digit & 31) * 2 ** shift;
        if (digit & 32) shift += 5;
        else {
          values.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      generatedColumn += values[0];
      if (values.length < 4) continue;
      source += values[1];
      line += values[2];
      column += values[3];
      if (values.length > 4) name += values[4];
      if (!lines.has(source)) lines.set(source, new Set());
      lines.get(source).add(line);
    }
  }
  return lines;
}
function retainedRegions(map) {
  const lines = mappedOriginalLines(map);
  const retained = new Set();
  const regions = {
    'src/ArazzoCatalog.tsx': 'ArazzoCatalog',
    'src/ArazzoWorkflowReview.tsx': 'ArazzoWorkflowReview',
    'src/utils/review/compare.ts': 'compareWorkflowRevisions',
    'src/utils/review/index.ts': 'compareWorkflowRevisions',
    'src/utils/catalog/index.ts': 'buildCatalogIndex',
    'src/utils/catalog/load.ts': 'loadCatalog',
    'src/utils/contract/AsyncAPIAdapter.ts': 'projectAsyncAPI',
    'src/utils/contract/OpenAPIAdapter.ts': 'projectOpenAPI',
  };
  for (const [index, content] of (map.sourcesContent ?? []).entries()) {
    if (!map.sources[index]?.includes('@jentic/arazzo-ui/')) continue;
    const sourceLines = (content ?? '').split('\n');
    let region;
    sourceLines.forEach((text, line) => {
      if (text.startsWith('//#region ')) region = text.slice(10).trim();
      else if (text.startsWith('//#endregion')) region = undefined;
      else if (region && regions[region] && lines.get(index)?.has(line))
        retained.add(regions[region]);
    });
  }
  return [...retained];
}
export async function consumerBuild(directory, name, source, { assertMinimal = false } = {}) {
  const inputDirectory = join(directory, name === 'app' ? 'browser-input' : `${name}-input`);
  await mkdir(inputDirectory, { recursive: true });
  await writeFile(
    join(inputDirectory, 'index.html'),
    '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>',
  );
  await writeFile(join(inputDirectory, 'main.tsx'), source);
  const beforeMinify = new Map();
  let report;
  await build({
    configFile: false,
    base: './',
    root: inputDirectory,
    logLevel: 'warn',
    resolve: {
      alias: {
        'fs/promises': join(uiRoot, 'config/vite/shims/empty.ts'),
        module: join(uiRoot, 'config/vite/shims/empty.ts'),
        'vscode-jsonrpc/lib/common/cancellation.js': join(
          directory,
          'node_modules/vscode-jsonrpc/lib/common/cancellation.js',
        ),
        'vscode-jsonrpc/lib/common/events.js': join(
          directory,
          'node_modules/vscode-jsonrpc/lib/common/events.js',
        ),
      },
    },
    plugins: [
      {
        name: 'consumer-retention-report',
        renderChunk: {
          order: 'pre',
          handler(code, chunk) {
            beforeMinify.set(chunk.fileName, code);
            return null;
          },
        },
        generateBundle(_, bundle) {
          const initial = new Set();
          const visit = (name) => {
            if (initial.has(name)) return;
            initial.add(name);
            const chunk = bundle[name];
            if (chunk?.type === 'chunk') chunk.imports.forEach(visit);
          };
          Object.values(bundle)
            .filter((item) => item.type === 'chunk' && item.isEntry)
            .forEach((item) => visit(item.fileName));
          const chunks = Object.values(bundle)
            .filter((item) => item.type === 'chunk')
            .map((item) => ({
              file: item.fileName,
              initial: initial.has(item.fileName),
              bytes: Buffer.byteLength(item.code),
              gzipBytes: gzipSync(item.code).length,
              modules: Object.entries(item.modules)
                .filter(([, value]) => value.renderedLength > 0)
                .map(([id, value]) => ({
                  id: id.replace(directory, '<consumer>'),
                  renderedLength: value.renderedLength,
                })),
              retained: retainedSymbols.filter(
                (symbol) =>
                  item.map?.names?.includes(symbol) ||
                  new RegExp(`(?:function|var|const|let)\\s+${symbol}\\b`).test(
                    beforeMinify.get(item.fileName) ?? item.code,
                  ),
              ),
            }));
          report = {
            name,
            initialGzipBytes: chunks.filter((c) => c.initial).reduce((n, c) => n + c.gzipBytes, 0),
            deferredGzipBytes: chunks
              .filter((c) => !c.initial)
              .reduce((n, c) => n + c.gzipBytes, 0),
            chunks,
            css: Object.values(bundle)
              .filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'))
              .map((item) => ({
                file: item.fileName,
                bytes: Buffer.byteLength(item.source),
                gzipBytes: gzipSync(item.source).length,
              })),
          };
        },
      },
    ],
    build: {
      outDir: join(directory, name),
      emptyOutDir: true,
      minify: true,
      target: 'es2022',
      manifest: true,
      sourcemap: true,
      rollupOptions: {
        onwarn(warning, warn) {
          if (!warning.id?.includes('web-tree-sitter')) warn(warning);
        },
      },
    },
  });
  for (const chunk of report.chunks) {
    try {
      const map = JSON.parse(await readFile(join(directory, name, `${chunk.file}.map`), 'utf8'));
      chunk.retained = retainedRegions(map);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (chunk.modules.some((module) => module.id.includes('@jentic/arazzo-ui/')))
        throw new Error(`UI chunk lacks retention source map: ${chunk.file}`);
    }
  }
  await writeFile(join(directory, `${name}-report.json`), JSON.stringify(report, null, 2));
  if (
    assertMinimal &&
    report.chunks.some((c) =>
      c.retained.some((s) =>
        [
          'ArazzoCatalog',
          'ArazzoWorkflowReview',
          'compareWorkflowRevisions',
          'buildCatalogIndex',
          'loadCatalog',
        ].includes(s),
      ),
    )
  )
    throw new Error(
      'Minimal viewer retains unused catalog/review implementation; inspect module report',
    );
  return report;
}
export const minimalSource = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArazzoUI } from '@jentic/arazzo-ui';
import '@jentic/arazzo-ui/styles.css';
createRoot(document.getElementById('root')!).render(React.createElement(ArazzoUI, { document: {arazzo:'1.0.1', info:{title:'Package consumer',version:'1'}, sourceDescriptions:[], workflows:[{workflowId:'flow', steps:[{stepId:'read',operationId:'read'}]}]}, view:'docs'}));`;
export const optionalSource = `import React from 'react';
import { createRoot } from 'react-dom/client';
import '@jentic/arazzo-ui/styles.css';
async function optional() { const {ArazzoCatalog, ArazzoWorkflowReview, compareWorkflowRevisions} = await import('@jentic/arazzo-ui/catalog'); window.optional = {ArazzoCatalog,ArazzoWorkflowReview,compareWorkflowRevisions}; return ArazzoCatalog; }
document.getElementById('root')!.onclick = () => optional().then(component => createRoot(document.getElementById('root')!).render(React.createElement(component,{manifest:{version:1,id:'consumer',revision:'r1',documents:[]}})));`;
