import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

// verify browser-bundler resolution of the optional subpath and named runtime exports.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const entry = manifest.exports['./catalog'];
if (!entry?.types || !entry?.import || entry.require)
  throw new Error('Catalog must declare its typed ESM-only browser entry');
const directory = await mkdtemp(join(root, '.catalog-export-'));
try {
  const consumer = join(directory, 'consumer.js');
  await writeFile(
    consumer,
    "export { ArazzoCatalog, normalizeCatalogManifest } from '@jentic/arazzo-ui/catalog';\n",
  );
  await build({
    root,
    configFile: join(root, 'config/vite/vite.config.ts'),
    logLevel: 'silent',
    build: {
      write: false,
      lib: { entry: consumer, formats: ['es'], fileName: 'catalog-consumer' },
    },
  });
  console.log('PASS optional typed ESM catalog browser-bundler export');
} finally {
  await rm(directory, { recursive: true, force: true });
}
