import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';
import { invalidateProductCache } from '../../../../../../lib/cache';
import { adjustStock, getAvailability, StockConflictError } from '../../../../../../services/inventory.service';

/**
 * Admin inventory adjustment — the only sanctioned way to change stock by hand.
 *
 * The generic product PUT no longer writes stock at all: it posted the whole
 * variants array the browser loaded minutes earlier, silently erasing any order
 * that landed in between. This endpoint takes one explicit change at a time.
 *
 * GET   → current stock, uncached.
 * PATCH → body is either
 *           { variantName?, delta: number }                  relative, never below zero
 *           { variantName?, expected: number, next: number } optimistic lock, 409 on drift
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await context.params;

  try {
    const availability = await getAvailability([id]);
    const product = availability[id];

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, stock: product },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[admin stock GET] failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to read stock' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await context.params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const variantName: string | undefined = body?.variantName || undefined;
  const hasDelta = typeof body?.delta === 'number';
  const hasSet = typeof body?.expected === 'number' && typeof body?.next === 'number';

  if (!hasDelta && !hasSet) {
    return NextResponse.json(
      { success: false, error: 'Provide either { delta } or { expected, next }' },
      { status: 400 }
    );
  }

  try {
    const result = await adjustStock(
      id,
      variantName,
      hasDelta ? { delta: body.delta } : { expected: body.expected, next: body.next }
    );

    invalidateProductCache(id);

    return NextResponse.json({ success: true, stock: result });
  } catch (error) {
    if (error instanceof StockConflictError) {
      // 409 so the admin UI can say "stock changed, reload" rather than
      // pretending the write succeeded.
      return NextResponse.json(
        { success: false, error: error.message, code: 'STOCK_CONFLICT' },
        { status: 409 }
      );
    }

    console.error('[admin stock PATCH] failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to adjust stock' }, { status: 500 });
  }
}
