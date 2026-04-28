import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withDb } from '../../../../../../lib/withDb';
import Product from '../../../../../../models/product';
import CityPricing from '../../../../../../models/cityPricing';
import { invalidateProductCache, invalidateCitiesCache } from '../../../../../../lib/cache';

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
  
  // Get all available governorates (which are saved in CityPricing collection)
  const allGovernorates = await CityPricing.find({ isActive: true }).sort({ governorate: 1 });

  // For each global governorate, map it to the product's specific override, or fall back to default
  const cityPricingData = allGovernorates.map(gov => {
    const govName = gov.governorate;
    const existingGovPricing = (product.cityPricing || []).find((cp: any) => cp.governorate === govName);
    
    return {
      governorate: govName,
      price: existingGovPricing?.price ?? product.price ?? 0,
      isActive: existingGovPricing?.isActive !== false,
      shippingCost: existingGovPricing?.shippingCost ?? gov.shippingCost,
      codFee: existingGovPricing?.codFee ?? gov.codFee,
    };
  });
  
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
    // We map every incoming governorate to exactly 1 saved pricing object.
    const productCityPricing = cityPricing.map((gp: any) => ({
      cityName: gp.governorate, // For simpler standardizing, cityName = governorate
      governorate: gp.governorate,
      price: Number(gp.price) || 0,
      shippingCost: Number(gp.shippingCost) || 0,
      codFee: Number(gp.codFee) || 0,
      isActive: gp.isActive !== false,
    }));

    // Replace product cityPricing with the newly built list
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { cityPricing: productCityPricing },
      { new: true, runValidators: true }
    );
    
  if (process.env.NODE_ENV === 'development') console.log('✅ Product city pricing updated:', updatedProduct.name);
  
  // 🚀 CRITICAL: Invalidate ALL caches immediately for real-time updates
  invalidateProductCache(productId.toString());
  invalidateCitiesCache();
  if (process.env.NODE_ENV === 'development') console.log('🗑️ All product and city caches invalidated after city pricing update');
  
  return NextResponse.json({
    success: true,
    message: 'City pricing updated successfully',
    cityPricing: updatedProduct.cityPricing
  });
});
