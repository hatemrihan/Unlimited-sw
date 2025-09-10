import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Product from '../../../models/product';

export async function GET() {
  try {
    await dbConnect();
    
    // Update all products with 0 stock to have 10 stock
    const result = await Product.updateMany(
      { stock: 0 },
      { $set: { stock: 10 } }
    );
    
    // Also update variant stocks
    const products = await Product.find({ 'variants.stock': 0 });
    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.stock === 0) {
          variant.stock = 10;
        }
      }
      await product.save();
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} products with stock`,
      updatedVariants: products.length
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as any).message
    }, { status: 500 });
  }
}
