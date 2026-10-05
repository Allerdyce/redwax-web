import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { build, root } from './build.mjs';
import { handleRequest } from '../lib/site-server.mjs';

try { process.loadEnvFile(path.join(root, '.env.local')); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const dist = await build();
const port = Number(process.env.PORT ?? 4173);
createServer(async (req, res) => {
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 4096) { res.writeHead(413); res.end(); return; } chunks.push(chunk); }
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
    const response = await handleRequest(new Request(`http://127.0.0.1:${port}${req.url}`, { method: req.method, headers: req.headers, body }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error.message); res.writeHead(500); res.end('Unable to load the preview.');
  }
}).listen(port, '127.0.0.1', () => console.log(`RedWax preview: http://127.0.0.1:${port}`));
let queue = Promise.resolve();
let timer;
for (const directory of ['src', 'public']) watch(path.join(root, directory), { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => { queue = queue.then(build).catch(console.error); }, 100);
});
watch(path.join(root, 'site.config.json'), () => { queue = queue.then(build).catch(console.error); });
