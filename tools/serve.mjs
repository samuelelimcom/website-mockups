// Minimal static file server for a built dist/ folder (no dependencies), used
// by check.mjs and record.mjs so they never depend on a dev server's state.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary', '.txt': 'text/plain', '.ico': 'image/x-icon' };

export function serve(dist, port) {
  const root = path.resolve(dist);
  const server = http.createServer(async (req, res) => {
    try {
      let p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(root)) throw new Error('outside root');
      if ((await stat(p)).isDirectory()) p = path.join(p, 'index.html');
      const body = await readFile(p);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() }));
  });
}
