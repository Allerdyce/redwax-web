import { handleRequest } from '../lib/site-server.mjs';

export default async function handler(req, res) {
  // Every route, including assets and this endpoint itself, is served through the gate.
  const original = new URL(req.url, 'https://redwaxapp.com');
  const route = original.searchParams.get('path');
  if (route !== null) {
    original.pathname = '/' + route.replace(/^\//, '');
    original.searchParams.delete('path');
  }
  let body;
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (req.body && typeof req.body === 'object') body = new URLSearchParams(req.body).toString();
    else if (typeof req.body === 'string') body = req.body;
    else {
      const chunks = []; let bytes = 0;
      for await (const chunk of req) {
        bytes += Buffer.byteLength(chunk);
        if (bytes > 4096) { res.statusCode = 413; res.end('Form too large.'); return; }
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks).toString();
    }
  }
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
  const response = await handleRequest(new Request(original, { method: req.method, headers, body }));
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}
