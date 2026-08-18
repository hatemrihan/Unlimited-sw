/**
 * @jest-environment node
 *
 * Proves the properties the emergency admin cookie is supposed to have.
 *
 * What it replaced: the cookie's value WAS `ADMIN_COOKIE_SECRET`. The server
 * compared the two directly, so the cookie never truly expired (only the browser
 * was asked to forget it), every admin's cookie was identical, and anyone who
 * ever saw the secret could mint one by hand.
 */
import {
  issueAdminCookie,
  verifyAdminCookie,
  passwordMatches,
  safeEqual,
  ADMIN_COOKIE_MAX_AGE_SECONDS,
} from '../login/adminCookie';

const SECRET = 'test-secret-value-do-not-use';
const HOUR = 60 * 60 * 1000;

describe('issueAdminCookie', () => {
  it('never returns the raw secret', async () => {
    const cookie = await issueAdminCookie(SECRET);

    expect(cookie).not.toBeNull();
    expect(cookie).not.toContain(SECRET);
  });

  it('issues a different value every time', async () => {
    const first = await issueAdminCookie(SECRET);
    const second = await issueAdminCookie(SECRET);

    // Same second, same secret — the nonce is what keeps them distinct, so two
    // admins can never hold the same cookie.
    expect(first).not.toBe(second);
  });

  it('returns null when the secret is not configured', async () => {
    await expect(issueAdminCookie(undefined)).resolves.toBeNull();
  });
});

describe('verifyAdminCookie', () => {
  it('accepts a cookie it just issued', async () => {
    const cookie = await issueAdminCookie(SECRET);

    await expect(verifyAdminCookie(cookie!, SECRET)).resolves.toBe(true);
  });

  it('rejects the raw secret — the old cookie format no longer works', async () => {
    await expect(verifyAdminCookie(SECRET, SECRET)).resolves.toBe(false);
  });

  it('rejects a cookie signed with a different secret', async () => {
    const cookie = await issueAdminCookie('some-other-secret');

    await expect(verifyAdminCookie(cookie!, SECRET)).resolves.toBe(false);
  });

  it('rejects a tampered timestamp', async () => {
    const issuedAt = Date.now() - 30 * HOUR; // old enough to be expired
    const cookie = await issueAdminCookie(SECRET, issuedAt);
    const [, nonce, signature] = cookie!.split('.');

    // An expired cookie rewritten to look fresh: the signature covers the
    // timestamp, so changing it invalidates the whole cookie.
    const forged = `${Date.now()}.${nonce}.${signature}`;

    await expect(verifyAdminCookie(forged, SECRET)).resolves.toBe(false);
  });

  it('rejects a tampered nonce', async () => {
    const cookie = await issueAdminCookie(SECRET);
    const [issuedAt, , signature] = cookie!.split('.');

    await expect(verifyAdminCookie(`${issuedAt}.deadbeefdeadbeef.${signature}`, SECRET)).resolves.toBe(false);
  });

  it('expires after 24 hours, checked on the server', async () => {
    const now = Date.now();
    const cookie = await issueAdminCookie(SECRET, now);

    await expect(verifyAdminCookie(cookie!, SECRET, now + 23 * HOUR)).resolves.toBe(true);
    await expect(verifyAdminCookie(cookie!, SECRET, now + 25 * HOUR)).resolves.toBe(false);
  });

  it('rejects a cookie dated in the future', async () => {
    const now = Date.now();
    const cookie = await issueAdminCookie(SECRET, now + 10 * HOUR);

    await expect(verifyAdminCookie(cookie!, SECRET, now)).resolves.toBe(false);
  });

  it('rejects malformed input without throwing', async () => {
    for (const value of ['', 'nonsense', 'a.b', 'a.b.c.d', '...']) {
      await expect(verifyAdminCookie(value, SECRET)).resolves.toBe(false);
    }
  });

  it('rejects everything when no secret is configured', async () => {
    const cookie = await issueAdminCookie(SECRET);

    await expect(verifyAdminCookie(cookie!, undefined)).resolves.toBe(false);
  });

  it('keeps the 24-hour lifetime it advertises', () => {
    expect(ADMIN_COOKIE_MAX_AGE_SECONDS).toBe(24 * 60 * 60);
  });
});

describe('passwordMatches', () => {
  it('accepts the configured password', () => {
    expect(passwordMatches('hunter2', 'hunter2')).toBe(true);
  });

  it('rejects a wrong password, and anything that is not a string', () => {
    expect(passwordMatches('wrong', 'hunter2')).toBe(false);
    expect(passwordMatches('', 'hunter2')).toBe(false);
    expect(passwordMatches(undefined, 'hunter2')).toBe(false);
    expect(passwordMatches({ toString: () => 'hunter2' }, 'hunter2')).toBe(false);
  });

  it('refuses everything when no password is configured', () => {
    expect(passwordMatches('anything', undefined)).toBe(false);
    expect(passwordMatches('', undefined)).toBe(false);
  });
});

describe('safeEqual', () => {
  it('behaves like equality', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', '')).toBe(true);
  });
});
