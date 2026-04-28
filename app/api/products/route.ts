import { NextRequest, NextResponse } from 'next/server';
import { getStaticActiveProducts } from '../../../data/products';
import { getActiveProducts } from '../../../services/product.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const featured = searchParams.get('featured') === 'true';
  const limit = searchParams.get('limit')
    ? parseInt(searchParams.get('limit')!, 10)
    : undefined;
  const page = searchParams.get('page')
    ? parseInt(searchParams.get('page')!, 10)
    : 1;

  // Try MongoDB first — service already has static fallback built in
  let products;
  try {
    products = await getActiveProducts(featured);
  } catch {
    products = getStaticActiveProducts(featured);
  }

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
}

