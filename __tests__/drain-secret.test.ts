/**
 * @jest-environment node
 *
 * The guard on the email drain endpoint.
 *
 * `/api/internal/drain-emails` is called by a scheduler, which has no session
 * to present, so it is protected by a shared secret instead. That makes the
 * comparison itself the security boundary — and it is reachable from the
 * internet by anyone who guesses the path.
 */
import { timingSafeCompare } from '../lib/timingSafeCompare';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('timingSafeCompare', () => {
  it('accepts the right secret', () => {
    expect(timingSafeCompare('s3cret-value', 's3cret-value')).toBe(true);
  });

  it('rejects a wrong secret of the same length', () => {
    expect(timingSafeCompare('s3cret-valuX', 's3cret-value')).toBe(false);
  });

  it('rejects a secret of a different length', () => {
    expect(timingSafeCompare('s3cret', 's3cret-value')).toBe(false);
    expect(timingSafeCompare('s3cret-value-longer', 's3cret-value')).toBe(false);
  });

  it('rejects nothing at all', () => {
    expect(timingSafeCompare(null, 's3cret-value')).toBe(false);
    expect(timingSafeCompare(undefined, 's3cret-value')).toBe(false);
    expect(timingSafeCompare('', 's3cret-value')).toBe(false);
  });

  it('rejects everything when no secret is configured', () => {
    // An unset secret must not become a lock that opens to any key, least of
    // all to an empty one.
    expect(timingSafeCompare('anything', '')).toBe(false);
    expect(timingSafeCompare('', '')).toBe(false);
  });

  it('examines the whole string, not just up to the first difference', () => {
    // The property that makes it timing-safe. A `===` would return at index 0
    // here and at index 11 for the near-miss above, and the difference is
    // measurable over enough attempts.
    const start = 'X' + 'a'.repeat(63);
    const end = 'a'.repeat(63) + 'X';
    const expected = 'a'.repeat(64);

    expect(timingSafeCompare(start, expected)).toBe(false);
    expect(timingSafeCompare(end, expected)).toBe(false);
  });
});

describe('the drain endpoint', () => {
  const source = readFileSync(
    join(process.cwd(), 'app', 'api', 'internal', 'drain-emails', 'route.ts'),
    'utf8'
  );

  it('compares the secret in constant time rather than with ===', () => {
    expect(source).toContain('timingSafeCompare');
    expect(source).not.toMatch(/===\s*expected|expected\s*===/);
  });

  it('refuses to run at all when no secret is configured', () => {
    // The safe reading of a misconfiguration is "do nothing" — not "run
    // unprotected", which is what an endpoint that skips its own guard when
    // the guard is missing would do.
    expect(source).toMatch(/if\s*\(!expected\)/);
    expect(source).toContain('503');
  });
});
