import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: 'Invalid product IDs' }, { status: 400 });
  }

  try {
    await dbConnect();

    // Filter to valid ObjectIds only
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    const products = await Product.find({ _id: { $in: validIds } }).lean();

    return NextResponse.json({ success: true, products: JSON.parse(JSON.stringify(products)) });
  } catch (error) {
    console.error('[API /products/batch] MongoDB failed:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحميل المنتجات.' },
      { status: 503 }
    );
  }
}
