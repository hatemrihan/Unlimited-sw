import { NextRequest, NextResponse } from 'next/server';
import { getStaticProductById } from '../../../../data/products';

// STATIC FALLBACK MODE — serving instantly without MongoDB
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const product = getStaticProductById(id);

  if (!product) {
    return NextResponse.json(
      { success: false, error: 'Product not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    product,
    cached: false,
  });
}
