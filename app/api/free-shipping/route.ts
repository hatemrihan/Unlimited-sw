import { NextResponse } from 'next/server';
import { withDb } from '@/lib/withDb';
import { getFreeShippingStatus } from '@/lib/freeShippingCheck';

/**
 * Public lightweight endpoint to check if global free shipping is active.
 * Used by client components (e.g. CounterDown banner, cart drawer).
 *
 * Backed by a 5-second in-memory cache to guarantee sub-millisecond
 * response times without putting load on MongoDB.
 */
export const GET = withDb(async () => {
  try {
    const status = await getFreeShippingStatus();
    return NextResponse.json(
      {
        success: true,
        active: status.active,
        expiresAt: status.expiresAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[Public FreeShipping API] Error:', error);
    return NextResponse.json(
      {
        success: true,
        active: false,
        expiresAt: null,
      },
      { status: 200 }
    );
  }
});
