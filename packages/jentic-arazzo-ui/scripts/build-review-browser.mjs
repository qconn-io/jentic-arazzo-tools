import { build } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, readdir } from 'node:fs/promises';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Bundle the installed ESM entry as a downstream browser consumer for acceptance.
await build({
  root,
  configFile: resolve(root, 'config/vite/vite.config.ts'),
  build: {
    lib: {
      entry: resolve(root, 'test/e2e/review-app.tsx'),
      formats: ['iife'],
      name: 'ReviewExample',
      fileName: () => 'review-example.js',
    },
    outDir: resolve(root, 'build/review'),
    emptyOutDir: true,
  },
});
const css = (await readdir(resolve(root, 'build/review')))
  .filter((f) => f.endsWith('.css'))
  .map((f) => `<link rel="stylesheet" href="./${f}">`)
  .join('');
await writeFile(
  resolve(root, 'build/review/index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${css}<title>Workflow review acceptance</title></head><body><div id="root"></div><script src="./review-example.js"></script></body></html>`,
);
