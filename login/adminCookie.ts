/**
 * The emergency password door's cookie.
 *
 * WHAT WAS WRONG BEFORE
 *
 * The cookie's value WAS `ADMIN_COOKIE_SECRET` — the server's own secret, handed
 * to the browser. That meant:
 *
 *   - identical for every admin, so nobody could tell who did what;
 *   - permanent, because the server only compared it to a value that never
 *     changes, so the 24-hour `maxAge` was merely a request that the browser
 *     forget it — a copied cookie worked forever;
 *   - unrevocable for one person: the only remedy was rotating the secret,
 *     which signs everyone out.
 *
 * WHAT THIS DOES INSTEAD
 *
 * The cookie carries `issuedAt.nonce.signature`, where the signature is an HMAC
 * of the first two parts using the secret. The secret never leaves the server,
 * the age is checked server-side (so a copied cookie really does expire), and
 * the nonce makes each issued cookie distinct.
 *
 * WHY WEB CRYPTO AND NOT node:crypto
 *
 * `middleware.ts` runs on the Edge runtime, which has no Node built-ins. Web
 * Crypto exists in both Edge and Node, so the same verification can guard both
 * pages (middleware) and API routes. That is the whole point: one rule, checked
 * identically everywhere. It is async, which is why these functions return
 * promises.
 */

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours, matching the previous cookie
export const ADMIN_COOKIE_NAME = 'adminAuthenticated';
export const ADMIN_COOKIE_MAX_AGE_SECONDS = MAX_AGE_MS / 1000;

const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compares two strings without leaking, through timing, how much of them matched.
 *
 * Always walks the full length rather than returning at the first difference.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Mints a fresh cookie value. Returns null when the secret is not configured. */
export async function issueAdminCookie(
  secret: string | undefined,
  now = Date.now()
): Promise<string | null> {
  if (!secret) return null;

  const nonceBytes = crypto.getRandomValues(new Uint8Array(12));
  const nonce = Array.from(nonceBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  const payload = `${now}.${nonce}`;
  return `${payload}.${await sign(payload, secret)}`;
}

/**
 * Verifies a cookie value: correct signature, and not older than 24 hours.
 *
 * Anything malformed is simply invalid — never an exception, because this runs
 * on every guarded request.
 */
export async function verifyAdminCookie(
  value: string | undefined,
  secret: string | undefined,
  now = Date.now()
): Promise<boolean> {
  if (!value || !secret) return false;

  const parts = value.split('.');
  if (parts.length !== 3) return false;

  const [issuedAt, nonce, signature] = parts;
  const expected = await sign(`${issuedAt}.${nonce}`, secret);

  if (!safeEqual(signature, expected)) return false;

  const issued = Number(issuedAt);
  if (!Number.isFinite(issued)) return false;

  const age = now - issued;
  // A future timestamp means a tampered or clock-skewed cookie; reject it.
  return age >= 0 && age < MAX_AGE_MS;
}

/** Compares a submitted password to the configured one, in constant time. */
export function passwordMatches(submitted: unknown, expected: string | undefined): boolean {
  if (typeof submitted !== 'string' || !expected) return false;
  return safeEqual(submitted, expected);
}
