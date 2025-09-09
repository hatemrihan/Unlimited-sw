import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';
import { invalidateProductsCache } from '../../products/route';

// In-memory cache for admin products - SUPER FAST RESPONSES
let adminProductsCache: any = null;
let adminCacheTime = 0;
const ADMIN_CACHE_DURATION = 120 * 1000; // 2 minutes cache for admin

// GET - Fetch products for admin dashboard with OPTIMIZED PERFORMANCE
export async function GET(request: NextRequest) {
  try {
    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20'); // Only load 20 at a time
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;
    
    const cacheKey = `${page}-${limit}-${search}`;
    
    // ⚡ SUPER FAST: Check cache first for instant responses
    const now = Date.now();
    if (adminProductsCache && adminProductsCache[cacheKey] && (now - adminCacheTime) < ADMIN_CACHE_DURATION) {
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
      
      // 🚀 OPTIMIZED: Fetch only essential fields + pagination + lean queries
      const products = await Product.find(searchQuery)
        .select('name price originalPrice discount mainImage stock isActive isFeatured order createdAt updatedAt')
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
      name, price, originalPrice, discount, mainImage, images, video, description, promoCode, 
      variants, stock, isActive, isFeatured, order,
      detailedDescription, specifications, shippingInfo, faqs,
      showOutOfStockBadge, showPreorderBadge
    } = body;
    
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
        video: video || '',
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
        // Initialize empty city pricing array
        cityPricing: []
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

      // CRITICAL: For e-commerce, we should NOT fallback to file storage
      // This ensures data integrity - if MongoDB fails, we fail gracefully
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed. Please try again.',
          details: 'MongoDB is required for e-commerce data integrity'
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


