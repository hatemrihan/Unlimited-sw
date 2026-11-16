import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logger } from '@/utils/logger';
import { timingSafeCompare } from '@/lib/timingSafeCompare';
import { PRODUCTS_TAG } from '@/product/tags';
import { PAYMENT_SETTINGS_TAG } from '@/payments/settings';
import { STORE_CONTACT_TAG } from '@/payments/contact';
import { FEEDBACK_TAG } from '@/app/sections/feedback/reviews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Rebuild the shop's pages, now, because something they show just changed
 * somewhere the store cannot see.
 *
 * WHY THIS EXISTS (17 Nov 2026)
 *
 * The home page, the shop and the product pages are cached for an hour
 * (DATA_CACHE_SECONDS in lib/cache-ttl.ts). They used to be cached for 30
 * to 60 seconds, which at the store's traffic meant nearly every visit
 * rebuilt the page on the server; that alone used up the Vercel account's
 * function time.
 *
 * The store purges these caches itself on its own writes: an order, a
 * stock move, an edit on /admin. What it cannot see is a write made by the
 * admin dashboard (another app): the featured product, free shipping,
 * paused orders, the contact details, an order status that puts stock
 * back. The dashboard calls this endpoint after each of those.
 *
 * It purges by tag, not by path. A page is rebuilt when any data it read
 * is purged, so one call covers every page in both languages without this
 * file having to know the list of pages.
 *
 * Guarded exactly like /api/revalidate/coach, with the same secret, for
 * the same reason: the caller is another server with no session.
 *
 * WHAT AN ATTACKER WITH THE SECRET COULD DO: make the store rebuild its
 * pages more often than it meant to. Nothing is written.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.STORE_REVALIDATE_SECRET;

  // Refuse rather than run unprotected, the same as the coach endpoint.
  if (!expected) {
    logger.error('🔒 STORE_REVALIDATE_SECRET is not set — refusing to revalidate.');
    return NextResponse.json({ success: false, error: 'Not configured' }, { status: 503 });
  }

  if (!timingSafeCompare(request.headers.get('x-revalidate-secret'), expected)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Every cache a store page is built from. __tests__/revalidate-shop.test.ts
  // holds this list; a new hour-long cache must be added to both.
  revalidateTag(PRODUCTS_TAG);
  revalidateTag(STORE_CONTACT_TAG);
  revalidateTag(PAYMENT_SETTINGS_TAG);
  revalidateTag(FEEDBACK_TAG);

  return new NextResponse(null, { status: 204 });
}
