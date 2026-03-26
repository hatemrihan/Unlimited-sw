import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withDb } from '../../../../../../lib/withDb';
import Product from '../../../../../../models/product';
import CityPricing from '../../../../../../models/cityPricing';
import { invalidateProductCache, productCache } from '../../../../../../lib/cache';

// Schema for the bulk governorate pricing update sent by the admin client
const bulkCityPricingSchema = z.array(z.object({
  governorate:  z.string().min(1),
  price:        z.number().nonnegative(),
  shippingCost: z.number().nonnegative().optional().default(0),
  codFee:       z.number().nonnegative().optional().default(0),
  isActive:     z.boolean().default(true),
}));

// GET - Get city pricing for a specific product
export const GET = withDb(async (request: NextRequest, ctx?: any) => {
  if (process.env.NODE_ENV === 'development') console.log('💰 Fetching product city pricing...');
  
  const { id: productId } = await ctx.params;
  
  // Get product with city pricing
    const product = await Product.findById(productId).select('name price cityPricing');
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Get all available cities
    const allCities = await CityPricing.find({ isActive: true }).sort({ governorate: 1, cityName: 1 });

    // Aggregate by governorate (one row per governorate)
    const govMap: Record<string, any> = {};
    for (const city of allCities) {
      const govName = city.governorate;
      if (!govMap[govName]) {
        // find an existing product price/isActive for this governorate
        const existingGovPricing = (product.cityPricing || []).find((cp: any) => cp.governorate === govName);
        govMap[govName] = {
          governorate: govName,
          price: existingGovPricing?.price ?? product.price ?? 0,
          isActive: existingGovPricing?.isActive !== false,
          // Use product-specific shipping costs if available, otherwise fall back to global defaults
          shippingCost: existingGovPricing?.shippingCost ?? city.shippingCost,
          codFee: existingGovPricing?.codFee ?? city.codFee,
        };
      }
    }
  const cityPricingData = Object.values(govMap);
  
  return NextResponse.json({
    success: true,
    productName: product.name,
    basePrice: product.price,
    cityPricing: cityPricingData
  });
});

// PUT - Update city pricing for a specific product
export const PUT = withDb(async (request: NextRequest, ctx?: any) => {
  if (process.env.NODE_ENV === 'development') console.log('💰 Updating product city pricing...');
  
  const { id: productId } = await ctx.params;
  const body = await request.json();
  
  // Validate request body
  const parsed = bulkCityPricingSchema.safeParse(body.cityPricing);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  
  const cityPricing = parsed.data;
    
    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // FIXED: Product-specific city pricing logic
    // For each governorate:
    // 1) Set product-specific price and isActive status
    // 2) Build product.cityPricing entries for all cities in that governorate
    // 3) DO NOT modify global CityPricing collection (that's for defaults only)
    const productCityPricing: any[] = [];

    // Pre-fetch all needed cities to avoid N+1 queries in the loop
    const allGovNames = cityPricing.map((gp: any) => gp.governorate);
    const allGovCities = await CityPricing.find({ governorate: { $in: allGovNames } });

    for (const gp of cityPricing) {
      const govName = gp.governorate;
      const price = Number(gp.price) || 0;
      const shippingCost = Number(gp.shippingCost) || 0;
      const codFee = Number(gp.codFee) || 0;
      const isActive = gp.isActive !== false;

      // Store product-specific pricing including shipping costs and COD fees
      if (process.env.NODE_ENV === 'development') {
        console.log(`📦 Setting product-specific pricing for ${govName}: price=${price}, shipping=${shippingCost}, cod=${codFee}, active=${isActive}`);
      }

      // Filter from pre-fetched cities (O(n) in memory is way faster than DB query)
      const govCities = allGovCities.filter(c => c.governorate === govName);
      for (const city of govCities) {
        productCityPricing.push({
          cityName: city.cityName,
          governorate: govName,
          price,
          shippingCost,
          codFee,
          isActive,
        });
      }
    }

    // Replace product cityPricing with the newly built list
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { cityPricing: productCityPricing },
      { new: true, runValidators: true }
    );
    
  if (process.env.NODE_ENV === 'development') console.log('✅ Product city pricing updated:', updatedProduct.name);
  
  // 🚀 CRITICAL: Invalidate ALL caches immediately for real-time updates
  invalidateProductCache(productId.toString());
  if (process.env.NODE_ENV === 'development') console.log('🗑️ All product caches invalidated after city pricing update');
  
  return NextResponse.json({
    success: true,
    message: 'City pricing updated successfully',
    cityPricing: updatedProduct.cityPricing
  });
});
