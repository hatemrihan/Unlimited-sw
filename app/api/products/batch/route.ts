import { NextRequest, NextResponse } from 'next/server';
import { getProductsByIds, MAX_BATCH_IDS } from '@/product';

/**
 * Fetches several products by id — used by the cart to re-check what it holds.
 *
 * Address only; the read lives in product/actions.ts, which caps the number of
 * ids. The route previously queried Mongoose directly with an UNBOUNDED list, so
 * one request could ask for a hundred thousand products.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Previously this threw outside the try and returned a 500 with a stack.
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const ids = (body as { ids?: unknown })?.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: 'Invalid product IDs' }, { status: 400 });
  }

  if (ids.length > MAX_BATCH_IDS) {
    return NextResponse.json(
      { success: false, error: `Too many ids — the maximum is ${MAX_BATCH_IDS}.` },
      { status: 400 }
    );
  }

  try {
    const products = await getProductsByIds(ids);
    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('[API /products/batch] failed:', error);
    return NextResponse.json({ success: false, error: 'Could not load products.' }, { status: 503 });
  }
}
