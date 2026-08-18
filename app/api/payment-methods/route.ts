import { NextResponse } from 'next/server';
import { getPaymentMethods, DEFAULT_METHODS } from '@/payments/settings';

/**
 * Which payment methods checkout may offer. Public by design.
 *
 * The admin endpoint reads AND writes this configuration and is admin-only.
 * Checkout needs the same two booleans but must never be able to change them,
 * so it reads them here — and only these two fields are ever exposed.
 *
 * No longer `force-dynamic`. Every checkout page load used to make its own
 * MongoDB round trip for a document that changes about twice a year; the read is
 * now cached across all instances and purged the moment an admin saves.
 */
export async function GET() {
  try {
    const methods = await getPaymentMethods();
    return NextResponse.json({ success: true, methods });
  } catch {
    // getPaymentMethods already falls back internally; this is the last resort
    // so that checkout can never be blocked by this endpoint.
    return NextResponse.json({ success: true, methods: DEFAULT_METHODS });
  }
}
