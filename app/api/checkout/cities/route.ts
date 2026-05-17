import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';
import mongoose from 'mongoose';

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

    // Fetch ONLY the cityPricing from the products in the cart
    const products = await Product.find(
      { _id: { $in: productIds } },
      { _id: 1, cityPricing: 1 }
    ).lean();

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
          isActive: cp.isActive !== false,
        };
      }
    }

    const cities = Object.values(govMap);

    return NextResponse.json({
      success: true,
      cities,
      source: 'product_city_pricing'
    });

  } catch (error) {
    console.error('[Checkout Cities] MongoDB failed:', error);
    return NextResponse.json(
      { success: false, cities: [], error: 'فشل تحميل بيانات الشحن. جرب تاني.' },
      { status: 503 }
    );
  }
}
