/**
 * Compares two secrets without leaking how far the match got.
 *
 * `a === b` on a string stops at the first differing character, so the time it
 * takes reveals how much of a guess was right. Over enough attempts that is
 * enough to reconstruct the secret one character at a time — and an endpoint a
 * scheduler calls is an endpoint anyone can call.
 *
 * Not `node:crypto`'s `timingSafeEqual`: this module is imported from route
 * handlers, and the repo has already been bitten once by a `node:crypto` import
 * that compiled cleanly and failed at runtime on the Edge runtime.
 *
 * The length check is deliberately not constant-time. A secret's length is not
 * the secret, and comparing buffers of different lengths has to branch
 * somewhere regardless.
 */
export function timingSafeCompare(provided: string | null | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;

  let difference = 0;
  for (let i = 0; i < provided.length; i++) {
    difference |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return difference === 0;
}
