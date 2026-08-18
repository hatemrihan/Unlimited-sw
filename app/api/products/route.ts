import { NextRequest, NextResponse } from 'next/server';
import { getActiveProducts, getActiveProductsPage, toPositiveInt, MAX_PAGE_SIZE } from '@/product';

/**
 * Public product listing.
 *
 * Address only — the reading, paging and validation live in product/actions.ts.
 *
 * MongoDB is the single source of truth; there is no static fallback. If the
 * database is down the caller gets an error rather than invented products.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hasLimit = searchParams.has('limit');

  try {
    // Without ?limit the caller wants everything (the shop page renders all
    // products at once), which is the cached read.
    if (!hasLimit) {
      const products = await getActiveProducts();
      return NextResponse.json({
        success: true,
        products,
        count: products.length,
        hasMore: false,
        total: products.length,
      });
    }

    const page = await getActiveProductsPage(
      toPositiveInt(searchParams.get('page'), 1),
      toPositiveInt(searchParams.get('limit'), 20, MAX_PAGE_SIZE)
    );

    return NextResponse.json({
      success: true,
      products: page.products,
      count: page.products.length,
      hasMore: page.hasMore,
      total: page.total,
      page: page.page,
      limit: page.limit,
    });
  } catch (error) {
    console.error('[API /products] failed:', error);
    return NextResponse.json(
      { success: false, error: 'Could not load products. Please try again shortly.' },
      { status: 503 }
    );
  }
}
