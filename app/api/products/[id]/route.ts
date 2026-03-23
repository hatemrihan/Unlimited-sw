import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';
import { productCache } from '../../../../lib/cache';

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
      
      // 🚀 OPTIMIZED QUERY: Select ALL fields for complete product details + lean for 3x speed
      const product = await Product.findById(productId)
        .select('name description price originalPrice discount mainImage images videos stock variants cityPricing isActive isFeatured category tags specifications shippingInfo faqs detailedDescription promoCode showOutOfStockBadge showPreorderBadge order')
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
      console.error('❌ MongoDB error fetching product detail:', mongoError instanceof Error ? mongoError.message : String(mongoError));
      return NextResponse.json(
        { success: false, error: 'Failed to fetch product details' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Error fetching product by ID:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}



