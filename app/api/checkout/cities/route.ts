import { NextRequest, NextResponse } from 'next/server';
import { STATIC_CITIES } from '../../../../data/checkout-cities';
import dbConnect from '../../../../lib/mongodb';
import CityPricing from '../../../../models/cityPricing';
import Product from '../../../../models/product';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawIds = searchParams.get('productIds')?.split(',').filter(Boolean) ?? [];

  // ✅ FIX: Filter out invalid ObjectIds BEFORE querying — prevents CastError crash
  const productIds = rawIds.filter(id => mongoose.Types.ObjectId.isValid(id));
  if (productIds.length !== rawIds.length) {
    console.warn(
      `⚠️ Filtered out ${rawIds.length - productIds.length} invalid product IDs:`,
      rawIds.filter(id => !mongoose.Types.ObjectId.isValid(id))
    );
  }

  try {
    console.log('🏪 Fetching live governorates for checkout...');
    await dbConnect();

    // Get global default governorates
    const raw = await CityPricing.find({ isActive: true })
      .select('governorate cityName shippingCost codFee isActive')
      .sort({ governorate: 1 })
      .lean();

    // Deduplicate by governorate (lowercase key) and initialize productPricing map
    const govMap: Record<string, any> = {};
    for (const city of raw) {
      const govName = (city.governorate || '').trim();
      if (!govName) continue;

      const key = govName.toLowerCase();
      if (govMap[key]) continue;

      govMap[key] = {
        _id:          city._id,
        governorate:  govName,
        cityName:     govName,
        shippingCost: city.shippingCost,
        codFee:       city.codFee,
        isActive:     city.isActive,
        productPricing: {},
      };
    }

    // ✅ FIX: Wrap product overlay in its OWN try-catch
    // A failure here should NOT kill the governorate data we already have
    if (productIds.length > 0) {
      try {
        console.log(`📦 Overlaying pricing for ${productIds.length} valid product IDs`);
        const products = await Product.find(
          { _id: { $in: productIds } },
          { _id: 1, cityPricing: 1 }
        ).lean();

        console.log(`📦 Found ${products.length} products with cityPricing in MongoDB`);

        for (const product of products) {
          const pid = (product._id as any).toString();
          if (!product.cityPricing || !Array.isArray(product.cityPricing)) continue;

          for (const cp of product.cityPricing) {
            const govName = (cp.governorate || '').trim();
            const key = govName.toLowerCase();

            if (!govMap[key]) continue;

            govMap[key].productPricing[pid] = {
              price:        cp.price,
              shippingCost: cp.shippingCost,
              codFee:       cp.codFee,
              isActive:     cp.isActive,
            };
          }
        }
      } catch (productError) {
        // ✅ Product overlay failed but governorate data is still valid — continue
        console.error('⚠️ Product pricing overlay failed (governorates still valid):', productError);
      }
    }

    const cities = Object.values(govMap);
    console.log(`✅ Returning ${cities.length} live governorates (source: mongodb)`);

    return NextResponse.json({
      success: true,
      cities,
      source: 'mongodb'
    });

  } catch (error) {
    console.error('❌ MongoDB checkout cities fetch failed, falling back to static:', error);
    return NextResponse.json({
      success: true,
      cities: STATIC_CITIES,
      source: 'static_fallback'
    });
  }
}
