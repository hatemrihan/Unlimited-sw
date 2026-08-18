import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withDb } from '../../../../lib/withDb';
import { requireAdmin } from '../../../../lib/requireAdmin';
import { invalidateProductCache } from '../../../../lib/cache';

import { getAdminProducts, createProduct, toPositiveInt, MAX_PAGE_SIZE } from '@/product';
import { createProductSchema } from '@/product/schema';

// GET - Fetch products for admin dashboard with pagination + search
export const GET = withDb(async (req: NextRequest) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = toPositiveInt(searchParams.get('page'), 1);
  const limit = toPositiveInt(searchParams.get('limit'), 20, MAX_PAGE_SIZE);
  const search = searchParams.get('search') || '';

  const result = await getAdminProducts(search, page, limit);

  return NextResponse.json({
    success: true,
    products: result.products,
    pagination: {
      page,
      limit,
      total:   result.total,
      pages:   result.pages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
    }
  });
});

// POST - Create new product (Admin only)
export const POST = withDb(async (req: NextRequest) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();

  // Zod validation — descriptive errors, zero leakage
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const product = await createProduct(parsed.data);
  invalidateProductCache(); // Clear frontend list cache

  revalidateTag('products');
  return NextResponse.json({
    success: true,
    product,
    message: 'Product created successfully',
  }, { status: 201 });
});
