import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withDb } from '../../../../../lib/withDb';
import { requireAdmin } from '../../../../../lib/requireAdmin';
import { invalidateProductCache } from '../../../../../lib/cache';

import {
  getProductById,
  updateProduct,
  deleteProduct,
} from '@/product/actions';
import { updateProductSchema } from '@/product/schema';

type Ctx = { params: Promise<{ id: string }> };

// GET - Fetch a single product by ID
export const GET = withDb(async (_req: NextRequest, ctx: Ctx) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await ctx.params;
  const product = await getProductById(id);
  return NextResponse.json({ success: true, product });
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

  // No cascade needed — cityPricing no longer stores price.
  // Product.price is the single source of truth.
  const product = await updateProduct(id, parsed.data);

  revalidateTag('products');
  revalidateTag(`product-${id}`);
  invalidateProductCache(id);

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
