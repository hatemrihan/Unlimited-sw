import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Product from '../../../models/product';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST: Starting product creation test...');
    
    const body = await request.json();
    console.log('🧪 TEST: Request body:', JSON.stringify(body, null, 2));
    
    // Test MongoDB connection
    console.log('🧪 TEST: Connecting to MongoDB...');
    await dbConnect();
    console.log('🧪 TEST: ✅ MongoDB connected');
    
    // Create test product
    console.log('🧪 TEST: Creating product object...');
    const testProduct = new Product({
      name: body.name || 'Test Product',
      price: body.price || 100,
      mainImage: body.mainImage || 'https://example.com/test.jpg',
      description: body.description || 'Test description',
      images: [],
      videos: body.video ? [body.video] : [],
      promoCode: '',
      variants: [],
      stock: 10,
      isActive: true,
      isFeatured: false,
      order: 0,
      detailedDescription: '',
      specifications: '',
      shippingInfo: '',
      faqs: [],
      showOutOfStockBadge: false,
      showPreorderBadge: false,
      cityPricing: [{
        cityName: 'Cairo',
        governorate: 'Cairo',
        price: body.price || 100,
        shippingCost: 50,
        codFee: 25,
        isActive: true
      }]
    });
    
    console.log('🧪 TEST: Product object created, attempting save...');
    const savedProduct = await testProduct.save();
    console.log('🧪 TEST: ✅ Product saved successfully!', savedProduct._id);
    
    return NextResponse.json({
      success: true,
      message: 'Test product created successfully',
      productId: savedProduct._id,
      product: savedProduct
    });
    
  } catch (error) {
    console.error('🧪 TEST: ❌ Error:', error);
    console.error('🧪 TEST: ❌ Error message:', (error as any).message);
    console.error('🧪 TEST: ❌ Error stack:', (error as any).stack);
    
    return NextResponse.json({
      success: false,
      error: (error as any).message,
      stack: process.env.NODE_ENV === 'development' ? (error as any).stack : undefined
    }, { status: 500 });
  }
}
