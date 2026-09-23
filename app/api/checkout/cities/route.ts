import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import { productQueries } from '@/product/queries';
import mongoose from 'mongoose';
import { isFreeShippingActive } from '../../../../lib/freeShippingCheck';

/**
 * Checkout Cities API — Product-Level City Pricing ONLY
 * 
 * This endpoint builds the governorate list entirely from each product's
 * own `cityPricing` array. The global CityPricing collection is NOT used.
 * 
 * Each product defines its own shipping cost and COD fee per governorate.
 * If a product has no city pricing for a governorate, that governorate
 * still appears (from other products) but with $0 shipping for that item.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawIds = searchParams.get('productIds')?.split(',').filter(Boolean) ?? [];

  // Filter out invalid ObjectIds before querying
  const productIds = rawIds.filter(id => mongoose.Types.ObjectId.isValid(id));

  if (productIds.length === 0) {
    return NextResponse.json({
      success: true,
      cities: [],
      source: 'no_products'
    });
  }

  try {
    await dbConnect();

    // The products in the cart, read through the seam. Only `cityPricing` is
    // used below; the shared read carries a few more fields, which is the price
    // of having one query function instead of a second nearly-identical one.
    const products = await productQueries.findByIds(productIds);

    // Build governorate map entirely from product-level city pricing
    const govMap: Record<string, any> = {};

    for (const product of products) {
      const pid = (product._id as any).toString();
      if (!product.cityPricing || !Array.isArray(product.cityPricing)) continue;

      for (const cp of product.cityPricing) {
        if (cp.isActive === false) continue; // Skip disabled governorates

        const govName = (cp.governorate || '').trim();
        if (!govName) continue;

        const key = govName.toLowerCase();

        // Initialize governorate entry if not seen yet
        if (!govMap[key]) {
          govMap[key] = {
            governorate: govName,
            cityName: govName,     // backward-compatible alias
            shippingCost: 0,       // No global default — product-level only
            codFee: 0,             // No global default — product-level only
            isActive: true,
            productPricing: {},
          };
        }

        // Store per-product shipping/COD for this governorate
        govMap[key].productPricing[pid] = {
          shippingCost: cp.shippingCost ?? 0,
          codFee: cp.codFee ?? 0,
          // Always true: the loop skipped the inactive entries above. This read
          // `cp.isActive !== false`, which looked like a check and was not —
          // the query result was untyped, so nothing pointed out that the
          // answer could only ever be true.
          isActive: true,
        };
      }
    }

    const cities = Object.values(govMap);

    // ── Global free-shipping override ────────────────────────────────────
    // Zero out shipping AND COD at the display layer so the checkout UI
    // matches what orderPricingService will compute at submit time.
    let freeShippingActive = false;
    try {
      freeShippingActive = await isFreeShippingActive();
    } catch {
      // Fail safe: if the check fails, show normal prices.
    }

    if (freeShippingActive) {
      for (const gov of cities) {
        for (const pid of Object.keys(gov.productPricing || {})) {
          gov.productPricing[pid].shippingCost = 0;
          gov.productPricing[pid].codFee = 0;
        }
      }
    }

    return NextResponse.json({
      success: true,
      cities,
      freeShippingActive,
      source: 'product_city_pricing'
    });

  } catch (error) {
    console.error('[Checkout Cities] MongoDB failed:', error);
    return NextResponse.json(
      { success: false, cities: [], error: 'Could not load shipping options. Please try again.' },
      { status: 503 }
    );
  }
}
