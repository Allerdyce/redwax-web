import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build, validateConfig, root } from '../scripts/build.mjs';
import { issueSession, sessionIsValid, safeReturnPath, COOKIE, SESSION_SECONDS } from '../lib/preview-gate.mjs';
import { handleRequest } from '../lib/site-server.mjs';
await build();
const env = { SITE_PASSWORD: 'test-preview-password', PREVIEW_SESSION_SECRET: 'test-only-secret-for-a-signed-cookie-12345', PREVIEW_GATE: 'on' };
const request = (route, init = {}) => new Request('https://redwaxapp.com' + route, init);
const login = (password, next = '/') => handleRequest(request('/__preview/login?next=' + encodeURIComponent(next), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password }) }), env);

test('release requires a real download and approved privacy policy', () => {
  const config = { origin: 'https://redwaxapp.com', status: 'released', publisher: 'Test', supportEmail: 'support@redwaxapp.com', privacyApproved: true };
  assert.throws(() => validateConfig(config), /download URL/);
  assert.throws(() => validateConfig({ ...config, downloadUrl: 'https://apps.apple.com/' }), /actual App Store/);
  assert.throws(() => validateConfig({ ...config, downloadUrl: 'https://apps.apple.com/us/app/example/id12345', privacyApproved: false }), /privacy/);
});
test('protected pages and assets never reveal content before login', async () => {
  for (const route of ['/', '/index.html', '/support/', '/privacy/', '/assets/site.css', '/assets/dark.css', '/assets/theme.js', '/assets/logo-black.svg', '/assets/logo-white.svg', '/assets/app-icon.svg', '/assets/photos/first-dance-hero-640.webp', '/api/site', '/not-found']) {
    const response = await handleRequest(request(route), env);
    const body = await response.text();
    assert.match(body, /Preview password/);
    assert.doesNotMatch(body, /Your best frames|test-preview-password/);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  }
});
test('missing secret stays closed rather than exposing the site', async () => {
  assert.equal((await handleRequest(request('/'), {})).status, 503);
});
test('incorrect password fails, correct password gives a secure cookie and intended page', async () => {
  const rejected = await login('incorrect');
  assert.equal(rejected.status, 401);
  assert.equal(rejected.headers.get('set-cookie'), null);
  const accepted = await login(env.SITE_PASSWORD, '/support/#taste');
  assert.equal(accepted.status, 303);
  assert.equal(accepted.headers.get('location'), '/support/#taste');
  const cookie = accepted.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=604800; Secure/);
  const page = await handleRequest(request('/', { headers: { cookie } }), env);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Your best frames/);
  const asset = await handleRequest(request('/assets/site.css', { headers: { cookie } }), env);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /text\/css/);
  const photograph = await handleRequest(request('/assets/photos/first-dance-hero-640.webp', { headers: { cookie } }), env);
  assert.equal(photograph.status, 200);
  assert.equal(photograph.headers.get('content-type'), 'image/webp');
  const bytes = new Uint8Array(await photograph.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WEBP');
  assert.equal((await handleRequest(request('/missing', { headers: { cookie } }), env)).status, 404);
});
test('session rejects tampering and expires after a week', () => {
  const now = 1800000000000;
  const token = issueSession(env.PREVIEW_SESSION_SECRET, now);
  assert.equal(sessionIsValid(token, env.PREVIEW_SESSION_SECRET, now), true);
  assert.equal(sessionIsValid(token + 'x', env.PREVIEW_SESSION_SECRET, now), false);
  assert.equal(sessionIsValid(token, 'different-secret', now), false);
  assert.equal(sessionIsValid(token, env.PREVIEW_SESSION_SECRET, now + SESSION_SECONDS * 1000), false);
});
test('return paths cannot send the visitor to another site', async () => {
  for (const input of ['https://example.com', '//example.com', '/\\example.com', '/\r\nheader', '/__preview/login']) assert.equal(safeReturnPath(input), '/');
  assert.equal((await login(env.SITE_PASSWORD, '//example.com')).headers.get('location'), '/');
});
test('preview is excluded from search and can be explicitly opened later', async () => {
  assert.match(await (await handleRequest(request('/robots.txt'), env)).text(), /Disallow: \//);
  const page = await handleRequest(request('/'), { PREVIEW_GATE: 'off' });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /RedWax is in development/);
});
test('production pages have no design-tool runtime, generic store link or missing local target', async () => {
  const routes = ['/', '/support/', '/privacy/'];
  const pages = new Map(await Promise.all(routes.map(async (route) => [route, await readFile(path.join(root, 'dist', route, 'index.html'), 'utf8')])));
  for (const [route, html] of pages) {
    assert.doesNotMatch(html, /DCLogic|<x-dc|<helmet|\.dc\.html|\{\{[A-Z_]+\}\}|href="https:\/\/apps\.apple\.com\/"/);
    assert.match(html, /noindex,nofollow/);
    assert.equal([...html.matchAll(/<h1[\s>]/g)].length, 1, route);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(ids.length, new Set(ids).size, route);
    for (const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
      const href = match[1];
      if (!href.startsWith('/') && !href.startsWith('#')) continue;
      const url = new URL(href, 'https://redwaxapp.com' + route);
      if (url.hash) {
        assert.ok(pages.get(url.pathname)?.includes(`id="${url.hash.slice(1)}"`), `Missing anchor ${href} on ${route}`);
      } else if (url.pathname.startsWith('/assets/') || url.pathname === '/favicon.svg') {
        await readFile(path.join(root, 'dist', url.pathname));
      } else assert.ok(pages.has(url.pathname), `Missing page ${href}`);
    }
  }
});
