import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { logger } from '../../../../utils/logger';
import { timingSafeCompare } from '../../../../lib/timingSafeCompare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Rebuild one coach's public page, now, because he just changed it.
 *
 * `/coaches/<handle>` is cached for an hour (`revalidate = 3600` on the
 * page). That is right for a page the world reads and almost nobody edits
 * — but it means a coach who uploads a new photo in the admin, then opens
 * his own page to admire it, sees the old one. He concludes it did not
 * work and uploads it again.
 *
 * So the admin dashboard pokes this endpoint after a successful save. It
 * is the whole of the "why did my new photo not work" fix.
 *
 * Guarded by a shared secret rather than a session, for the same reason as
 * the email drain: the caller is another server, with no session to
 * present. Compared with `timingSafeEqual` — a plain `===` on a secret
 * leaks its length and prefix to anyone patient enough to measure, and
 * this endpoint is reachable from the internet.
 *
 * WHAT AN ATTACKER WITH THE SECRET COULD DO: make us rebuild a coach page
 * more often than we meant to. That is the ceiling, which is why one
 * shared secret is a proportionate lock here and would not be on anything
 * that writes.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.STORE_REVALIDATE_SECRET;

  // Refuse rather than run unprotected. An unset secret is a
  // misconfiguration, and the safe reading of one is "do nothing".
  if (!expected) {
    logger.error('🔒 STORE_REVALIDATE_SECRET is not set — refusing to revalidate.');
    return NextResponse.json({ success: false, error: 'Not configured' }, { status: 503 });
  }

  if (!timingSafeCompare(request.headers.get('x-revalidate-secret'), expected)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let username: unknown;
  try {
    ({ username } = await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
  }

  // The handle goes straight into a path, so it is checked against the
  // shape a handle actually has rather than trusted. Anything else and we
  // would be revalidating arbitrary routes on request.
  if (typeof username !== 'string' || !/^[A-Za-z0-9_.-]{1,64}$/.test(username)) {
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
  }

  // Both language twins. A coach who fixes his Arabic headline and then
  // checks the Arabic page is exactly the person this endpoint is for.
  revalidatePath(`/coaches/${username}`);
  revalidatePath(`/ar/coaches/${username}`);

  return new NextResponse(null, { status: 204 });
}
