import { createReadStream, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { createServer } from 'node:http';

const port = Number(process.env.PORT || 5173);
const root = resolve('dist');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://localhost:${port}`);
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  let filePath = resolve(join(root, requestedPath));

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    filePath = join(root, 'index.html');
  }

  response.setHeader('Content-Type', mimeTypes[extname(filePath)] || 'application/octet-stream');
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`React app running at http://localhost:${port}`);
});
