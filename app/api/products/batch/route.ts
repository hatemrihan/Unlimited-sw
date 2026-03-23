import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid product IDs' }, { status: 400 });
    }

    await dbConnect();

    // Using .lean() for fast JS object responses
    const products = await Product.find({ _id: { $in: ids } }).lean();

    return NextResponse.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Batch fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products batch' }, { status: 500 });
  }
}
