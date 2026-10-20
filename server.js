const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.webm': 'video/webm', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/capture') {
    let chunks = [], size = 0;
    req.on('data', c => { size += c.length; if (size > 2e6) req.destroy(); else chunks.push(c); });
    req.on('end', () => {
      const frame = Number(url.searchParams.get('frame'));
      if (!Number.isInteger(frame) || frame < 0 || frame > 200) { res.writeHead(400).end(); return; }
      fs.mkdirSync(path.join(root, 'docs', 'frames'), { recursive: true });
      fs.writeFileSync(path.join(root, 'docs', 'frames', String(frame).padStart(4, '0') + '.png'), Buffer.concat(chunks));
      res.writeHead(200).end('ok');
    });
    return;
  }
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data);
  });
}).listen(4187, '127.0.0.1', () => console.log('THE LAST CUE — http://127.0.0.1:4187'));
