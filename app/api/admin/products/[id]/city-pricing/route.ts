import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withDb } from '../../../../../../lib/withDb';
import { requireAdmin } from '@/lib/requireAdmin';
import Product from '@/product/model';
import CityPricing from '../../../../../../models/cityPricing';
import { invalidateProductCache, invalidateCitiesCache } from '../../../../../../lib/cache';
import { revalidateProducts } from '@/product/tags';
import { sellsFromSupabase } from '@/shopdb/client';
import { listCitiesForAdmin } from '@/shopdb/cities';
import { saveCityPricing, SupabaseProductQueries } from '@/shopdb/products';

// Schema for per-governorate shipping/COD overrides
// NOTE: price is NOT here — the product price comes from Product.price
const bulkCityPricingSchema = z.array(z.object({
  governorate:  z.string().min(1),
  shippingCost: z.number().nonnegative().optional().default(0),
  codFee:       z.number().nonnegative().optional().default(0),
  isActive:     z.boolean().default(true),
}));

// GET - Get governorate shipping/COD config for a specific product
/** GET after the move: the product's own rates over the governorate list, as before. */
async function cityPricingFromSupabase(productId: string) {
  const product = await new SupabaseProductQueries().findById(productId);
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }
  const governorates = (await listCitiesForAdmin()).filter((g: any) => g.isActive);
  return NextResponse.json({
    success: true,
    productName: product.name,
    basePrice: product.price,
    cityPricing: governorates.map((gov: any) => {
      const existing = (product.cityPricing || []).find((cp: any) => cp.governorate === gov.governorate);
      return {
        governorate: gov.governorate,
        shippingCost: existing?.shippingCost ?? gov.shippingCost,
        codFee: existing?.codFee ?? gov.codFee,
        isActive: existing?.isActive !== false,
      };
    }),
  });
}

export const GET = withDb(async (request: NextRequest, ctx?: any) => {
  // middleware.ts matches '/admin/:path*', which does NOT cover '/api/admin/...'.
  // Without this line the endpoint is open to the internet.
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id: productId } = await ctx.params;

  // After the move (SHOP_DB=supabase): the same table, from Supabase.
  if (sellsFromSupabase()) return cityPricingFromSupabase(productId);

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
  // This endpoint writes what customers are charged for shipping and COD.
  // It was reachable by anyone; the check below is what closes that.
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id: productId } = await ctx.params;
  const body = await request.json();
  
  const parsed = bulkCityPricingSchema.safeParse(body.cityPricing);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  
  // Map to clean schema — no price, no cityName
  const productCityPricing = parsed.data.map(gp => ({
    governorate:  gp.governorate,
    shippingCost: Number(gp.shippingCost) || 0,
    codFee:       Number(gp.codFee) || 0,
    isActive:     gp.isActive !== false,
  }));

  // After the move (SHOP_DB=supabase): written to the product row in
  // Supabase — the tariff an order is priced from, logged by the database.
  if (sellsFromSupabase()) {
    try {
      await saveCityPricing(productId, productCityPricing);
    } catch {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    invalidateProductCache(productId.toString());
    invalidateCitiesCache();
    await revalidateProducts(productId.toString());
    return NextResponse.json({
      success: true,
      message: 'Governorate shipping updated successfully',
      cityPricing: productCityPricing,
    });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return NextResponse.json(
      { success: false, error: 'Product not found' },
      { status: 404 }
    );
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    { cityPricing: productCityPricing },
    { new: true, runValidators: true }
  );
  
  // Invalidate caches for real-time updates. invalidateProductCache only clears
  // THIS serverless instance's Map; revalidateProducts purges the shared Data
  // Cache so every other instance stops serving the old shipping cost too.
  invalidateProductCache(productId.toString());
  invalidateCitiesCache();
  await revalidateProducts(productId.toString());
  
  return NextResponse.json({
    success: true,
    message: 'Governorate shipping updated successfully',
    cityPricing: updatedProduct.cityPricing
  });
});
