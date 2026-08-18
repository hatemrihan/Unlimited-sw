import { NextRequest, NextResponse } from 'next/server';
import { getAvailability } from '@/product/inventory';
import { resolveVariantName } from '../../../../services/orderCreationService';

/**
 * Per-line availability check for the cart and the checkout form.
 *
 * UX only: it tells the customer an item is gone before they fill in the whole
 * form, instead of after they submit. The transaction in createOrderTransaction
 * remains the sole authority — this endpoint can go stale the moment it returns.
 *
 * POST { items: [{ productId, variantName? | size? | variant?, quantity }] }
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ success: true, allAvailable: true, lines: [] });
  }

  try {
    const availability = await getAvailability(items.map((i: any) => i.productId));

    const lines = items.map((item: any) => {
      const product = availability[String(item.productId)];
      const variantName = item.variantName ?? resolveVariantName(item);
      const requested = Math.max(1, Number(item.quantity) || 1);

      // Not in the database, or hidden from the storefront.
      if (!product || !product.isActive) {
        return { productId: item.productId, variantName, requested, available: 0, ok: false };
      }

      const available = variantName
        ? product.variants.find(v => v.name === variantName)?.stock ?? 0
        : product.stock;

      return { productId: item.productId, variantName, requested, available, ok: available >= requested };
    });

    return NextResponse.json(
      { success: true, allAvailable: lines.every((l: any) => l.ok), lines },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[api/cart/validate] failed:', error);
    return NextResponse.json(
      { success: false, error: 'Could not check availability. Please try again.' },
      { status: 503 }
    );
  }
}
