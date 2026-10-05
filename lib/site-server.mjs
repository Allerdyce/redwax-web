import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COOKIE, SESSION_SECONDS, gateIsOpen, gateIsConfigured, passwordMatches, issueSession, sessionIsValid, cookieFrom, safeReturnPath } from './preview-gate.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function passwordPage(next, error = false) {
  const wordmark = await readFile(path.join(root, 'src/partials/wordmark.svg'), 'utf8');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Private preview — RedWax</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:#F5F5F7;color:#1D1D1F;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif}main{width:100%;max-width:440px;padding:40px;background:#FFF;border:1px solid #E5E5E8;border-radius:24px}.wordmark{color:#FA6440;display:block;width:160px;height:48px;margin-bottom:32px}.wordmark svg{width:100%;height:100%}h1{font-size:30px;line-height:1.15;letter-spacing:-.03em;margin:0 0 12px}p{color:#6E6E73;margin:0 0 28px}label{display:block;font-size:14px;font-weight:600;margin-bottom:8px}input{font:inherit;width:100%;height:48px;padding:0 14px;border:1px solid #B8B8BD;border-radius:10px;background:#FFF;color:#1D1D1F}button{font:600 16px -apple-system,BlinkMacSystemFont,sans-serif;border:0;width:100%;height:48px;margin-top:16px;border-radius:99px;background:#D44022;color:#FFF;cursor:pointer}button:hover{background:#BF391D}input:focus-visible,button:focus-visible{outline:2px solid #B83C22;outline-offset:4px}.error{margin:12px 0 0;color:#B83C22;font-size:14px}@media(prefers-color-scheme:dark){body{background:#111;color:#F5F5F7}main{background:#1C1C1E;border-color:#333}p{color:#A1A1A6}input{background:#28282A;color:#FFF;border-color:#626266}.error{color:#FA6440}}
  </style></head><body><main><span class="wordmark" role="img" aria-label="RedWax">${wordmark}</span><h1>A little more time<br>in the darkroom.</h1><p>RedWax is taking shape. This is a private preview while we finish the site.</p><form method="post" action="/__preview/login?next=${encodeURIComponent(safeReturnPath(next))}"><label for="password">Preview password</label><input id="password" name="password" type="password" autocomplete="current-password" required${error ? ' aria-invalid="true" aria-describedby="password-error"' : ''}>${error ? '<p id="password-error" class="error" role="alert">That password didn’t match. Try again.</p>' : ''}<button type="submit">Enter preview</button></form></main></body></html>`;
}

export async function handleRequest(request, env = process.env) {
  const url = new URL(request.url);
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
  const gated = !gateIsOpen(env);
  if (gated) headers['X-Robots-Tag'] = 'noindex, nofollow';
  const respond = (body, status = 200, extras = {}) => new Response(request.method === 'HEAD' ? null : body, { status, headers: { ...headers, ...extras } });
  if (gated && url.pathname === '/robots.txt') return respond('User-agent: *\nDisallow: /\n', 200, { 'Content-Type': mime['.txt'] });
  if (gated && !gateIsConfigured(env)) return respond('RedWax preview is being prepared. Please check back shortly.', 503, { 'Content-Type': mime['.txt'] });
  if (gated && url.pathname === '/__preview/login') {
    if (request.method !== 'POST') return respond(null, 303, { Location: '/' });
    if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return respond('Use the preview password form.', 415);
    const body = await request.text();
    if (body.length > 4096) return respond('Form too large.', 413);
    const next = safeReturnPath(url.searchParams.get('next'));
    const input = new URLSearchParams(body).get('password') ?? '';
    if (!passwordMatches(input, env.SITE_PASSWORD)) return respond(await passwordPage(next, true), 401, { 'Content-Type': mime['.html'] });
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    return respond(null, 303, { Location: next, 'Set-Cookie': `${COOKIE}=${issueSession(env.PREVIEW_SESSION_SECRET)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}` });
  }
  if (gated && !sessionIsValid(cookieFrom(request), env.PREVIEW_SESSION_SECRET)) return respond(await passwordPage(url.pathname + url.search), 200, { 'Content-Type': mime['.html'] });
  if (!['GET', 'HEAD'].includes(request.method)) return respond('Method not allowed.', 405, { Allow: 'GET, HEAD' });
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return respond('Invalid path.', 400); }
  const dist = path.join(root, 'dist');
  let file = path.resolve(dist, '.' + pathname);
  if (file !== dist && !file.startsWith(dist + path.sep)) return respond('Not found.', 404);
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    return respond(await readFile(file), 200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
  } catch {
    return respond(await readFile(path.join(dist, '404.html')), 404, { 'Content-Type': mime['.html'] });
  }
}
