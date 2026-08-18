import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPaymentMethodsUncached, updatePaymentMethods } from '@/payments/settings';
import { updatePaymentMethodsSchema } from '@/payments/schema';
import { logger } from '@/utils/logger';

/**
 * Admin read and write for payment methods.
 *
 * Address only — the reading, writing and caching live in payments/settings.ts.
 *
 * Both handlers are admin-only: middleware.ts matches '/admin/:path*', which
 * does NOT cover '/api/admin/...', so without these checks anyone could switch
 * Cash on Delivery off and stop most orders.
 */

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    // Read fresh, not cached: this is the screen someone is about to change.
    const methods = await getPaymentMethodsUncached();
    return NextResponse.json(
      { success: true, settings: methods },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('[admin payment-settings] read failed', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updatePaymentMethodsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    );
  }

  try {
    // Recorded on the document, so switching off a payment method is traceable
    // to a person rather than being anonymous.
    const session = await getServerSession(authOptions);
    const updatedBy = session?.user?.email ?? 'password-login';

    const methods = await updatePaymentMethods(parsed.data, updatedBy);

    return NextResponse.json({ success: true, settings: methods });
  } catch (error) {
    logger.error('[admin payment-settings] write failed', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update payment settings' },
      { status: 500 }
    );
  }
}
