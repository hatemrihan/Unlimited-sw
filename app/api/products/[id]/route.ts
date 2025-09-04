import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';
import { promises as fs } from 'fs';
import path from 'path';

// GET - Fetch single product by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    console.log('🔍 Fetching product by ID:', params.id);
    
    try {
      // Try MongoDB first
      await dbConnect();
      console.log('✅ MongoDB connected for product detail');
      
      // Find product by ID
      const product = await Product.findById(params.id).lean();
      
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }
      
      console.log('✅ Found product in MongoDB:', (product as any).name);
      
      return NextResponse.json({
        success: true,
        product: product
      });
      
    } catch (mongoError) {
      console.error('❌ MongoDB error, using file fallback for product detail:', mongoError);
      
      // Fallback to file storage
      
      try {
        const dataFilePath = path.join(process.cwd(), 'data', 'products.json');
        
        // Read products from file
        let products = [];
        try {
          const data = await fs.readFile(dataFilePath, 'utf8');
          products = JSON.parse(data);
        } catch (e) {
          products = [];
        }
        
        // Find product by ID
        const product = products.find((p: unknown) =>
          p && typeof p === 'object' && '_id' in p && p._id === params.id
        );
        
        if (!product) {
          return NextResponse.json(
            { success: false, error: 'Product not found' },
            { status: 404 }
          );
        }
        
        console.log('✅ Found product in file:', product.name);
        
        return NextResponse.json({
          success: true,
          product: product
        });
        
      } catch (fileError) {
        console.error('❌ File fallback also failed for product detail:', fileError);
        throw fileError;
      }
    }
    
  } catch (error) {
    console.error('❌ Error fetching product by ID:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}



