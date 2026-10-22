import { NextResponse } from 'next/server';
import { withDb } from '@/lib/withDb';
import { getFreeShippingStatus } from '@/lib/freeShippingCheck';
import { sellsFromSupabase } from '@/shopdb/client';
import { shopSwitches } from '@/shopdb/settings';

/**
 * Public lightweight endpoint to check if global free shipping is active.
 * Used by client components (e.g. CounterDown banner, cart drawer).
 *
 * Cached by Vercel's CDN for 15 seconds. It used to be `no-store`, so every
 * home-page visitor ran a function and a MongoDB read just to draw the banner.
 * Now one request per 15 seconds reaches the function; a switch flipped in
 * the admin shows within that. Checkout never trusts this answer — the order
 * route prices shipping itself — so a few seconds of lag cannot misprice.
 */
const CDN_CACHE = { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' };

/** After the move: the free-shipping switch the dashboard sets (shop_settings). */
async function fromSupabase() {
  const { freeShipping } = await shopSwitches();
  return NextResponse.json({ success: true, ...freeShipping }, { headers: CDN_CACHE });
}

export const GET = sellsFromSupabase() ? fromSupabase : withDb(async () => {
  try {
    const status = await getFreeShippingStatus();
    return NextResponse.json(
      {
        success: true,
        active: status.active,
        expiresAt: status.expiresAt,
        applyToAll: status.applyToAll,
        productIds: status.productIds,
      },
      { headers: CDN_CACHE }
    );
  } catch (error) {
    console.error('[Public FreeShipping API] Error:', error);
    return NextResponse.json(
      {
        success: true,
        active: false,
        expiresAt: null,
        applyToAll: true,
        productIds: [],
      },
      { status: 200 }
    );
  }
});
