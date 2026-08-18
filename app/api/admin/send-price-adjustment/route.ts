import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/requireAdmin';
import { sendPriceAdjustmentForOrder } from '@/email/actions/priceAdjustmentForOrder';
import { logger } from '@/utils/logger';

/**
 * Address only. The work lives in email/actions/priceAdjustmentForOrder.ts —
 * this file exists because a URL in Next.js is defined by where its file sits,
 * so the endpoint cannot itself move into email/.
 *
 * All it does: prove the caller is an admin, check the request is well-formed,
 * hand over, and turn the outcome into an HTTP response.
 *
 * The auth line is the one that matters. middleware.ts matches '/admin/:path*',
 * which does NOT cover '/api/admin/...', so an API route under app/api/admin is
 * unprotected unless it calls requireAdmin() itself.
 */

const requestSchema = z.object({
  orderId: z.string().trim().min(1, 'orderId is required'),
  correctedTotal: z.number().positive('correctedTotal must be a number greater than zero'),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  try {
    const outcome = await sendPriceAdjustmentForOrder(parsed.data);

    if (!outcome.ok) {
      return NextResponse.json({ success: false, error: outcome.error }, { status: outcome.status });
    }

    return NextResponse.json({
      success: true,
      orderId: outcome.orderId,
      previousTotal: outcome.previousTotal,
      correctedTotal: outcome.correctedTotal,
    });
  } catch (error) {
    // The detail goes to the log, not to the caller — internal errors should
    // never describe the database or the mail provider to whoever is asking.
    logger.error('Price adjustment request failed', {
      orderId: parsed.data.orderId,
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { success: false, error: 'Failed to send the correction email.' },
      { status: 500 }
    );
  }
}
