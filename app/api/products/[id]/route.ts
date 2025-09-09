import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';
import { productCache } from '../../../../lib/cache';
import { promises as fs } from 'fs';
import path from 'path';

// GET - Fetch single product by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const productId = params.id;
    const cacheKey = `product:detail:${productId}`;
    
    // ⚡ ULTRA-FAST: Check cache first (sub-millisecond response)
    const cachedProduct = productCache.get<any>(cacheKey);
    if (cachedProduct) {
      console.log('⚡ LIGHTNING FAST: Product served from cache!');
      return NextResponse.json({
        success: true,
        product: cachedProduct,
        cached: true
      });
    }
    
    console.log('🔍 Cache miss, fetching from DB:', productId);
    
    try {
      // Try MongoDB first
      await dbConnect();
      
      // 🚀 OPTIMIZED QUERY: Select only needed fields + lean for 3x speed
      const product = await Product.findById(productId)
        .select('name description price discount mainImage additionalImages stock variants cityPricing isActive isFeatured category tags')
        .lean() // 3x faster - returns plain objects
        .exec();
      
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }
      
      // ⚡ CACHE IT: Store for 10 minutes (longer for product details)
      productCache.set(cacheKey, product, 600000); // 10min cache
      
      console.log('✅ Product cached for ultra-fast future requests:', (product as any).name);
      
      return NextResponse.json({
        success: true,
        product: product,
        cached: false
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



