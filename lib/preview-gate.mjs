import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
export const COOKIE = 'redwax_preview';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

const equal = (left, right) => {
  const a = createHash('sha256').update(String(left)).digest();
  const b = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(a, b);
};
export const passwordMatches = (input, password) => Boolean(password) && equal(input, password);
export const gateIsOpen = (env) => env.PREVIEW_GATE === 'off';
export const gateIsConfigured = (env) => Boolean(env.SITE_PASSWORD) && (env.PREVIEW_SESSION_SECRET?.length ?? 0) >= 32;
const signature = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url');

export function issueSession(secret, now = Date.now()) {
  const payload = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return payload + '.' + signature(payload, secret);
}
export function sessionIsValid(cookie, secret, now = Date.now()) {
  if (!secret || typeof cookie !== 'string') return false;
  const [payload, signed, extra] = cookie.split('.');
  if (extra || !/^\d+$/.test(payload) || !signed) return false;
  const seconds = Math.floor(now / 1000);
  const expiry = Number(payload);
  return expiry > seconds && expiry <= seconds + SESSION_SECONDS && equal(signed, signature(payload, secret));
}
export function cookieFrom(request) {
  return (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim()).find((part) => part.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
}
export function safeReturnPath(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value) || value.startsWith('/__preview/')) return '/';
  return value;
}
