import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withDb } from '../../../../../lib/withDb';
import { requireAdmin } from '../../../../../lib/requireAdmin';
import { invalidateProductCache } from '../../../../../lib/cache';

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
