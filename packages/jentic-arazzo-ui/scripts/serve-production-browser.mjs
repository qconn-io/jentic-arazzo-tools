import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { root, output, verifyIdentity } from './production-artifacts.mjs';

const identity = await verifyIdentity();
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  '.svg': 'image/svg+xml',
};
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/__identity') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(identity));
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405);
      response.end();
      return;
    }
    let directory = resolve(root, 'build'),
      relative = path.slice(1);
    if (path.startsWith('/consumer/')) {
      directory = resolve(root, 'test-output/package-consumer/app');
      relative = path.slice('/consumer/'.length);
    } else if (path === '/fixtures/readiness.json') {
      directory = output;
      relative = 'readiness.json';
    }
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = resolve(directory, relative);
    if (!file.startsWith(directory + sep)) throw new Error('Outside static root');
    let body = await readFile(file);
    // controlled negative acceptance probe changes only the response, preserving built bytes.
    if (process.env.ARAZZO_BROWSER_BREAK_FIXTURE === '1' && path === '/fixtures/readiness.json') {
      const fixture = JSON.parse(body.toString('utf8'));
      fixture.document.info.title = 'Intentionally broken acceptance fixture';
      body = Buffer.from(JSON.stringify(fixture));
    }
    response.writeHead(200, {
      'Content-Type': `${types[extname(file)] ?? 'application/octet-stream'}; charset=utf-8`,
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(Number(process.env.ARAZZO_BROWSER_PORT ?? 43187), '127.0.0.1');
