import { NextRequest, NextResponse } from 'next/server';
import { getAvailability } from '../../../../services/inventory.service';

/**
 * Live stock, never cached.
 *
 * Product listings are cached for speed, but stock is not a cacheable quantity —
 * a cached listing keeps advertising a sold-out item for as long as its TTL, and
 * on serverless each lambda instance holds its own copy of that cache. Splitting
 * availability into this tiny uncached endpoint gives fast cached content and
 * always-live numbers at the same time.
 *
 * GET /api/products/stock?ids=<id>,<id>
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const ids = new URL(request.url).searchParams.get('ids')?.split(',').filter(Boolean) ?? [];

  if (ids.length === 0) {
    return NextResponse.json({ success: true, stock: {} }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const stock = await getAvailability(ids);
    return NextResponse.json(
      { success: true, stock },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('[api/products/stock] failed:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحميل حالة المخزون. جرب تاني.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
