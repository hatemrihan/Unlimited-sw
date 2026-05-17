import { NextRequest, NextResponse } from 'next/server';
import { getActiveProducts } from '../../../services/product.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit')
    ? parseInt(searchParams.get('limit')!, 10)
    : undefined;
  const page = searchParams.get('page')
    ? parseInt(searchParams.get('page')!, 10)
    : 1;

  // MongoDB ONLY — no static fallback. If DB is down, return proper error.
  try {
    const products = await getActiveProducts();

    let result = products;
    let hasMore = false;

    if (limit) {
      const startIndex = (page - 1) * limit;
      result = products.slice(startIndex, startIndex + limit);
      hasMore = page * limit < products.length;
    }

    return NextResponse.json({
      success: true,
      products: result,
      count: result.length,
      hasMore,
      total: products.length,
    });
  } catch (error) {
    console.error('[API /products] MongoDB failed:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحميل المنتجات. جرب تاني بعد شوية.' },
      { status: 503 }
    );
  }
}
