import { NextRequest, NextResponse } from 'next/server';
import { STATIC_PRODUCTS } from '../../../../data/products';

export async function POST(request: NextRequest) {
  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: 'Invalid product IDs' }, { status: 400 });
  }

  // Serve from static data instantly
  const products = STATIC_PRODUCTS.filter(p => ids.includes(p._id));

  return NextResponse.json({ success: true, products });
}
