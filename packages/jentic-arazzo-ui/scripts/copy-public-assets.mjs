import { cp, readdir } from 'node:fs/promises';

// local source samples are inspection inputs, not deployable application assets.
for (const name of await readdir('./public')) {
  if (name === 'openapi_samples') continue;
  await cp(`./public/${name}`, `./build/${name}`, { recursive: true });
}
