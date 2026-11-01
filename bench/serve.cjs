// Optional local static server; Bun only, no package install.
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const server = Bun.serve({hostname:'127.0.0.1',port:8080,async fetch(request) {
  const url = new URL(request.url);
  let name;
  try { name = decodeURIComponent(url.pathname); } catch { return new Response('Bad path',{status:400}); }
  const filePath = path.resolve(root, '.' + (name === '/' ? '/bench/index.html' : name));
  if (!filePath.startsWith(root + path.sep)) return new Response('Forbidden',{status:403});
  const file = Bun.file(filePath);
  return await file.exists() ? new Response(file) : new Response('Not found',{status:404});
}});
console.log(`Open http://127.0.0.1:${server.port}/bench/index.html in Chrome. Ctrl+C stops the server.`);
