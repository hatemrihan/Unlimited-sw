import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withDb } from '../../../../../lib/withDb';
import { requireAdmin } from '../../../../../lib/requireAdmin';
import { invalidateProductCache, invalidateCitiesCache } from '../../../../../lib/cache';
import Product from '../../../../../models/product';

import {
  getProductById,
  updateProduct,
  deleteProduct,
  toggleProductFeatured,
} from '../../../../../services/product.service';
import { updateProductSchema } from '../../../../../lib/schemas/product.schema';

type Ctx = { params: Promise<{ id: string }> };

// GET - Fetch a single product by ID
export const GET = withDb(async (_req: NextRequest, ctx: Ctx) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await ctx.params;
  const product = await getProductById(id);
  return NextResponse.json({ success: true, product });
});

// PATCH - Toggle featured status
export const PATCH = withDb(async (req: NextRequest, ctx: Ctx) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await ctx.params;
  const { isFeatured } = await req.json();

  if (typeof isFeatured !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'isFeatured must be a boolean' },
      { status: 400 }
    );
  }

  const product = await toggleProductFeatured(id, isFeatured);

  revalidateTag('products');
  revalidateTag(`product-${id}`);
  invalidateProductCache(id);

  return NextResponse.json({
    success: true,
    product,
    message: `Product ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
  });
});

// PUT - Update an existing product
export const PUT = withDb(async (req: NextRequest, ctx: Ctx) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await ctx.params;
  const body = await req.json();

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // ✅ FIX: Cascade base price changes to cityPricing
  // When admin changes the base price (e.g., 1599 → 1399),
  // also update all cityPricing entries that still had the old base price
  let priceChanged = false;
  if (parsed.data.price !== undefined) {
    const current = await Product.findById(id).select('price').lean();
    if (current && (current as any).price !== parsed.data.price) {
      priceChanged = true;
      const oldPrice = (current as any).price;
      const newPrice = parsed.data.price;
      console.log(`💰 Base price changed ${oldPrice} → ${newPrice}, cascading to cityPricing`);

      // Update all cityPricing entries whose price matched the old base price
      await Product.updateOne(
        { _id: id },
        { $set: { 'cityPricing.$[elem].price': newPrice } },
        { arrayFilters: [{ 'elem.price': oldPrice }] }
      );
    }
  }

  const product = await updateProduct(id, parsed.data);

  revalidateTag('products');
  revalidateTag(`product-${id}`);
  invalidateProductCache(id);

  // Always invalidate cities cache when price changed
  if (priceChanged) {
    invalidateCitiesCache();
  }

  return NextResponse.json({ success: true, product, message: 'Product updated successfully' });
});

// DELETE - Delete a product
export const DELETE = withDb(async (_req: NextRequest, ctx: Ctx) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await ctx.params;
  await deleteProduct(id);

  revalidateTag('products');
  revalidateTag(`product-${id}`);
  invalidateProductCache(id);
  return NextResponse.json({ success: true, message: 'Product deleted successfully' });
});
