import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '../../../../lib/withDb';
import { getAdminProducts, createProduct } from '../../../../services/product.service';
import { createProductSchema } from '../../../../lib/schemas/product.schema';

// GET - Fetch products for admin dashboard with pagination + search
export const GET = withDb(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const page   = parseInt(searchParams.get('page')  || '1');
  const limit  = parseInt(searchParams.get('limit') || '20');
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
    },
    source: 'mongodb',
  });
});

// POST - Create new product (Admin only)
export const POST = withDb(async (req: NextRequest) => {
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

  return NextResponse.json({
    success: true,
    product,
    message: 'Product created successfully',
  });
});
