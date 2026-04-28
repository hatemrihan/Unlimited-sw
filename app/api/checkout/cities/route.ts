import { NextRequest, NextResponse } from 'next/server';
import { STATIC_CITIES } from '../../../../data/checkout-cities';
import dbConnect from '../../../../lib/mongodb';
import CityPricing from '../../../../models/cityPricing';
import Product from '../../../../models/product';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawIds = searchParams.get('productIds')?.split(',').filter(Boolean) ?? [];

  // Filter out invalid ObjectIds before querying
  const productIds = rawIds.filter(id => mongoose.Types.ObjectId.isValid(id));

  try {
    await dbConnect();

    // Get all active governorates with default shipping/COD
    const raw = await CityPricing.find({ isActive: true })
      .select('governorate shippingCost codFee isActive')
      .sort({ governorate: 1 })
      .lean();

    // Deduplicate by governorate (lowercase key)
    const govMap: Record<string, any> = {};
    for (const doc of raw) {
      const name = (doc.governorate || '').trim();
      if (!name) continue;

      const key = name.toLowerCase();
      if (govMap[key]) continue;

      govMap[key] = {
        _id:          doc._id,
        governorate:  name,
        cityName:     name,        // backward-compatible alias
        shippingCost: doc.shippingCost,
        codFee:       doc.codFee,
        isActive:     doc.isActive,
        productPricing: {},
      };
    }

    // Overlay per-product shipping/COD (NOT price — price comes from Product.price)
    if (productIds.length > 0) {
      try {
        const products = await Product.find(
          { _id: { $in: productIds } },
          { _id: 1, cityPricing: 1 }
        ).lean();

        for (const product of products) {
          const pid = (product._id as any).toString();
          if (!product.cityPricing || !Array.isArray(product.cityPricing)) continue;

          for (const cp of product.cityPricing) {
            const govName = (cp.governorate || '').trim();
            const key = govName.toLowerCase();
            if (!govMap[key]) continue;

            // Only shipping/COD — product price is NOT stored here
            govMap[key].productPricing[pid] = {
              shippingCost: cp.shippingCost ?? 0,
              codFee:       cp.codFee ?? 0,
              isActive:     cp.isActive !== false,
            };
          }
        }
      } catch (productError) {
        // Product overlay failed but governorate data is still valid
        console.error('Product shipping overlay failed:', productError);
      }
    }

    const cities = Object.values(govMap);

    return NextResponse.json({
      success: true,
      cities,
      source: 'mongodb'
    });

  } catch (error) {
    console.error('MongoDB governorate fetch failed, using static fallback:', error);
    return NextResponse.json({
      success: true,
      cities: STATIC_CITIES,
      source: 'static_fallback'
    });
  }
}
