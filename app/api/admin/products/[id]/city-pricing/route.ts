import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withDb } from '../../../../../../lib/withDb';
import Product from '../../../../../../models/product';
import CityPricing from '../../../../../../models/cityPricing';
import { invalidateProductCache, invalidateCitiesCache } from '../../../../../../lib/cache';

// Schema for per-governorate shipping/COD overrides
// NOTE: price is NOT here — the product price comes from Product.price
const bulkCityPricingSchema = z.array(z.object({
  governorate:  z.string().min(1),
  shippingCost: z.number().nonnegative().optional().default(0),
  codFee:       z.number().nonnegative().optional().default(0),
  isActive:     z.boolean().default(true),
}));

// GET - Get governorate shipping/COD config for a specific product
export const GET = withDb(async (request: NextRequest, ctx?: any) => {
  const { id: productId } = await ctx.params;
  
  const product = await Product.findById(productId).select('name price cityPricing');
  if (!product) {
    return NextResponse.json(
      { success: false, error: 'Product not found' },
      { status: 404 }
    );
  }
  
  // Get all available governorates from global config
  const allGovernorates = await CityPricing.find({ isActive: true }).sort({ governorate: 1 });

  // For each governorate, show existing product-specific override or global default
  const cityPricingData = allGovernorates.map(gov => {
    const govName = gov.governorate;
    const existing = (product.cityPricing || []).find((cp: any) => cp.governorate === govName);
    
    return {
      governorate:  govName,
      shippingCost: existing?.shippingCost ?? gov.shippingCost,
      codFee:       existing?.codFee ?? gov.codFee,
      isActive:     existing?.isActive !== false,
    };
  });
  
  return NextResponse.json({
    success: true,
    productName: product.name,
    basePrice: product.price,
    cityPricing: cityPricingData
  });
});

// PUT - Update governorate shipping/COD for a specific product
export const PUT = withDb(async (request: NextRequest, ctx?: any) => {
  const { id: productId } = await ctx.params;
  const body = await request.json();
  
  const parsed = bulkCityPricingSchema.safeParse(body.cityPricing);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  
  const product = await Product.findById(productId);
  if (!product) {
    return NextResponse.json(
      { success: false, error: 'Product not found' },
      { status: 404 }
    );
  }
  
  // Map to clean schema — no price, no cityName
  const productCityPricing = parsed.data.map(gp => ({
    governorate:  gp.governorate,
    shippingCost: Number(gp.shippingCost) || 0,
    codFee:       Number(gp.codFee) || 0,
    isActive:     gp.isActive !== false,
  }));

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    { cityPricing: productCityPricing },
    { new: true, runValidators: true }
  );
  
  // Invalidate caches for real-time updates
  invalidateProductCache(productId.toString());
  invalidateCitiesCache();
  
  return NextResponse.json({
    success: true,
    message: 'Governorate shipping updated successfully',
    cityPricing: updatedProduct.cityPricing
  });
});
