import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '../../../lib/withDb';
import { getActiveProducts } from '../../../services/product.service';

// GET - Fetch all active products for frontend
export const GET = withDb(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const featured = searchParams.get('featured') === 'true';

  const products = await getActiveProducts(featured);

  return NextResponse.json({
    success: true,
    products,
    count: products.length,
  });
});
