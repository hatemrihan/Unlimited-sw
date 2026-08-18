import { NextRequest, NextResponse } from 'next/server';
import { getProductById } from '@/product/actions';

// MongoDB ONLY — no static fallback
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const product = await getProductById(id);

    return NextResponse.json({
      success: true,
      product,
      cached: false,
    });
  } catch (error: any) {
    const status = error.name === 'NotFoundError' ? 404 : 503;
    return NextResponse.json(
      { success: false, error: error.message || 'Product not found' },
      { status }
    );
  }
}
