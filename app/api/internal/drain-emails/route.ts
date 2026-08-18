import { NextRequest, NextResponse } from 'next/server';
import { drainPendingEmails } from '../../../../services/pendingEmailService';
import { sendQueuedOrderEmail } from '../../../../services/emailQueueService';
import { logger } from '../../../../utils/logger';
import { timingSafeCompare } from '../../../../lib/timingSafeCompare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sends the order emails that did not go out with their order.
 *
 * Called on a schedule, not by a person — see netlify/functions/drain-emails.mts.
 *
 * It exists because the send cannot be trusted to the request that created the
 * order: Netlify kills the function the moment it responds, the provider is
 * sometimes slow, and a customer who has paid must not be kept waiting behind
 * either. The order writes a row saying an email is owed, inside its own
 * transaction; this endpoint is what eventually pays that debt.
 *
 * Guarded by a shared secret rather than an admin session, because the caller
 * is a scheduler with no session to present. Compared with `timingSafeEqual`,
 * which matters here more than it looks: a plain `===` on a secret leaks its
 * length and prefix to anyone patient enough to measure, and this endpoint is
 * reachable from the internet.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.DRAIN_SECRET;

  // Refuse rather than run unprotected. An unset secret is a misconfiguration,
  // and the safe reading of a misconfiguration is "do nothing".
  if (!expected) {
    logger.error('🔒 DRAIN_SECRET is not set — refusing to drain the email queue.');
    return NextResponse.json(
      { success: false, error: 'Not configured' },
      { status: 503 }
    );
  }

  if (!timingSafeCompare(request.headers.get('x-drain-secret'), expected)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await drainPendingEmails(sendQueuedOrderEmail);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('❌ Email drain failed', error);
    return NextResponse.json(
      { success: false, error: 'Drain failed' },
      { status: 500 }
    );
  }
}
