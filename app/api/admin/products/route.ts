import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';
import { invalidateProductsCache } from '../../products/route';

// In-memory cache for admin products - SUPER FAST RESPONSES
let adminProductsCache: any = null;
let adminCacheTime = 0;
const ADMIN_CACHE_DURATION = 1 * 1000; // 1 second cache - ULTRA FAST like Amazon/Shopify

// GET - Fetch products for admin dashboard with OPTIMIZED PERFORMANCE
export async function GET(request: NextRequest) {
  try {
    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20'); // Only load 20 at a time
    const search = searchParams.get('search') || '';
    const forceRefresh = searchParams.get('refresh') === 'true'; // Force refresh bypass
    const skip = (page - 1) * limit;
    
    const cacheKey = `${page}-${limit}-${search}`;
    
    // ⚡ SUPER FAST: Check cache first for instant responses (unless force refresh)
    const now = Date.now();
    if (!forceRefresh && adminProductsCache && adminProductsCache[cacheKey] && (now - adminCacheTime) < ADMIN_CACHE_DURATION) {
      console.log('⚡ Admin serving from cache - INSTANT response!');
      return NextResponse.json({
        ...adminProductsCache[cacheKey],
        source: 'cache'
      });
    }

    console.log(`📖 Admin fetching page ${page} from MongoDB...`);

    try {
      // Try MongoDB first (PRIMARY METHOD for e-commerce)
      await dbConnect();
      console.log('✅ MongoDB connected for admin products');

      // Build search query
      const searchQuery = search ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      } : {};

      // 🚀 OPTIMIZED: Get total count efficiently
      const totalCount = await Product.countDocuments(searchQuery);
      
      // 🚀 OPTIMIZED: Fetch ALL fields for complete admin functionality + pagination + lean queries
      const products = await Product.find(searchQuery)
        .select('name price originalPrice discount mainImage images videos description stock variants cityPricing isActive isFeatured order category tags specifications shippingInfo faqs detailedDescription promoCode showOutOfStockBadge showPreorderBadge createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(); // 🚀 Use lean() for 3x faster queries
        
      console.log(`⚡ Found ${products.length}/${totalCount} products (page ${page}) - LIGHTNING FAST!`);

      const result = {
        success: true,
        products: products,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        },
        source: 'mongodb'
      };
      
      // 🚀 Cache for ultra-fast subsequent requests
      if (!adminProductsCache) adminProductsCache = {};
      adminProductsCache[cacheKey] = result;
      adminCacheTime = now;

      return NextResponse.json(result);

    } catch (mongoError) {
      console.error('❌ MongoDB error for admin products:', mongoError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products for admin' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error fetching admin products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products for admin' },
      { status: 500 }
    );
  }
}

// Helper to invalidate admin cache
export function invalidateAdminProductsCache() {
  adminProductsCache = null;
  adminCacheTime = 0;
  console.log('🗑️ Admin products cache invalidated for fresh data');
}

// POST - Create new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    console.log('📝 Creating product...');
    
    // Parse request body
    const body = await request.json();
    console.log('📦 Product request body:', body);
    
    const { 
      name, price, originalPrice, discount, mainImage, images, videos, description, promoCode, 
      variants, stock, isActive, isFeatured, order,
      detailedDescription, specifications, shippingInfo, faqs,
      showOutOfStockBadge, showPreorderBadge
    } = body;
    
    // DEBUG: Check videos specifically
    console.log('🎥 DEBUG Videos:', {
      videos: videos,
      videosType: typeof videos,
      videosLength: videos ? videos.length : 'N/A',
      videosArray: Array.isArray(videos),
      videosContent: videos
    });
    
    // Validate required fields
    if (!name || !mainImage || !description) {
      console.log('❌ Missing required product fields');
      return NextResponse.json(
        { success: false, error: 'Name, Main Image, and Description are required' },
        { status: 400 }
      );
    }
    
    console.log('✅ Product fields validated');
    
    // PRIMARY: Always try MongoDB first for e-commerce data integrity
    try {
      await dbConnect();
      console.log('✅ MongoDB connected for product creation');

      // Create new product in MongoDB
      const newProduct = new Product({
        name: name.trim(),
        price: price || 0,
        originalPrice: originalPrice || 0,
        discount: discount && discount > 0 ? discount : undefined,
        mainImage: mainImage.trim(),
        images: images || [],
        videos: videos || [], // Use videos array from frontend
        description: description.trim(),
        promoCode: promoCode?.trim() || '',
        variants: variants || [],
        stock: stock || 0,
        isActive: isActive !== false,
        isFeatured: isFeatured || false,
        order: order || 0,
        // Detailed product information
        detailedDescription: detailedDescription?.trim() || '',
        specifications: specifications?.trim() || '',
        shippingInfo: shippingInfo?.trim() || '',
        faqs: faqs || [],
        // Admin badges
        showOutOfStockBadge: !!showOutOfStockBadge,
        showPreorderBadge: !!showPreorderBadge,
        // Initialize with default Cairo pricing instead of empty array
        cityPricing: [{
          cityName: 'Cairo',
          governorate: 'Cairo',
          price: price || 0,
          shippingCost: 50,
          codFee: 25,
          isActive: true
        }]
      });

      // Save to MongoDB
      const savedProduct = await newProduct.save();
      console.log('✅ Product saved to MongoDB:', savedProduct._id);

      // Invalidate both frontend and admin caches for instant updates
      invalidateProductsCache();
      invalidateAdminProductsCache();

      // Also save to JSON file as backup (dual storage for reliability)
      try {
        const { promises: fs } = require('fs');
        const path = require('path');
        const dataFilePath = path.join(process.cwd(), 'data', 'products.json');

        let products = [];
        try {
          const data = await fs.readFile(dataFilePath, 'utf8');
          products = JSON.parse(data);
        } catch (e) {
          products = [];
        }

        // Add MongoDB product to file backup
        products.push({
          ...savedProduct.toObject(),
          _id: savedProduct._id.toString()
        });

        await fs.writeFile(dataFilePath, JSON.stringify(products, null, 2));
        console.log('📝 Product also backed up to JSON file');
      } catch (backupError) {
        console.warn('⚠️ JSON backup failed, but MongoDB save succeeded:', backupError);
      }

      return NextResponse.json({
        success: true,
        product: savedProduct,
        message: 'Product created successfully in MongoDB',
        source: 'mongodb'
      });

    } catch (mongoError) {
      console.error('❌ MongoDB error:', mongoError);
      console.error('❌ Error details:', (mongoError as any).message);
      console.error('❌ Error name:', (mongoError as any).name);
      console.error('❌ Full error:', JSON.stringify(mongoError, Object.getOwnPropertyNames(mongoError)));

      // Check if it's a validation error and provide helpful message
      const errorMessage = (mongoError as any).name === 'ValidationError'
        ? 'Product validation failed. Please check all required fields.'
        : 'Database error occurred. Please try again.';

      // CRITICAL: For e-commerce, we should NOT fallback to file storage
      // This ensures data integrity - if MongoDB fails, we fail gracefully
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: (mongoError as any).message || 'MongoDB is required for e-commerce data integrity',
          errorName: (mongoError as any).name,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ General error creating product:', error);
    return NextResponse.json(
      { success: false, error: `Failed to create product: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}


