/**
 * An id for one checkout attempt, minted in the customer's browser.
 *
 * It exists so the server can tell a retry apart from a second purchase. The
 * browser is the only place that knows the difference: pressing the button
 * again after a lost response is the same attempt, while coming back tomorrow
 * is a new one. No server-side heuristic on name, phone or total can make that
 * distinction without also refusing customers who genuinely order twice.
 *
 * `crypto.randomUUID` is not used unconditionally. It requires a secure context
 * and is missing from older Android WebViews — which is precisely the audience
 * this protects, since the whole failure begins with a slow connection on a
 * cheap phone. The fallback uses `getRandomValues`, available far more widely,
 * and yields 32 hex characters: more than enough that two attempts colliding is
 * not a thing that happens.
 *
 * Web Crypto rather than `node:crypto`, for the same reason recorded in
 * order/model.ts — this module is imported from client components.
 */
export function newClientOrderId(): string {
  const webCrypto = globalThis.crypto;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // No Web Crypto at all. Rather than throw and block the sale, fall back to a
  // weaker id: an attempt with a weak id is still better protected than one
  // with no id, and the server treats it as opaque either way.
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}
