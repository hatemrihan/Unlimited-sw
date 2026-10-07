import { NextResponse } from 'next/server';
import { getPaymentMethods, DEFAULT_METHODS } from '@/payments/settings';
import { getStoreContact, FALLBACK_CONTACT } from '@/payments/contact';

/**
 * Which payment methods checkout may offer, and where InstaPay money goes.
 * Public by design.
 *
 * The admin endpoint reads AND writes the method switches and is admin-only.
 * Checkout needs the same two booleans but must never be able to change them,
 * so it reads them here — and only these fields are ever exposed.
 *
 * Since 7 Oct 2026 this also carries the InstaPay address and link, read from
 * the coaching platform's /settings (payments/contact.ts), so checkout gets
 * them in the request it already makes instead of having them typed into the
 * page.
 *
 * No longer `force-dynamic`. Both reads are cached across all instances.
 */
export async function GET() {
  const [methods, contact] = await Promise.all([
    getPaymentMethods().catch(() => DEFAULT_METHODS),
    // getStoreContact never throws; the catch is the last resort so checkout
    // can never be blocked by this endpoint.
    getStoreContact().catch(() => FALLBACK_CONTACT),
  ]);

  return NextResponse.json({
    success: true,
    methods,
    instapay: { address: contact.instapayAddress, link: contact.instapayLink },
  });
}
