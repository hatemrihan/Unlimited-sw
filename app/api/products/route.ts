import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import dbConnect from '../../../lib/mongodb';
import Product from '../../../models/product';
import { apiCache } from '../../../lib/cache';

// File path for storing products (fallback only)
const dataFilePath = path.join(process.cwd(), 'data', 'products.json');

// GET - Fetch all active products for frontend
export async function GET(request: NextRequest) {
  try {
    // Check for parameters
    const { searchParams } = new URL(request.url);
    const featuredOnly = searchParams.get('featured') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const cacheKey = featuredOnly ? `products:featured:\${page}:\${limit}` : `products:all:\${page}:\${limit}`;

    // ⚡ ULTRA-FAST: Check cache first
    const cachedData = apiCache.get<any>(cacheKey);
    if (cachedData) {
      console.log('⚡ LIGHTNING FAST: Products served from cache!');
      return NextResponse.json({
        success: true,
        ...cachedData,
        cached: true
      });
    }

    console.log('🛍️ Cache miss - fetching from MongoDB...');

    try {
      // PRIMARY: Try MongoDB first for e-commerce data
      await dbConnect();
      console.log('✅ MongoDB connected for frontend products');

      // Build query based on featured parameter
      const query = featuredOnly
        ? { isFeatured: true }  // Only need to be featured, not necessarily active
        : { isActive: true };

      console.log('🔍 Query:', query);
      console.log('🎯 Featured only:', featuredOnly);

      // 🚀 OPTIMIZED: Fetch paginated products
      const activeProducts = await Product.find(query)
        .select('name price originalPrice discount mainImage images videos description promoCode variants stock isActive isFeatured order showOutOfStockBadge showPreorderBadge category tags specifications shippingInfo faqs detailedDescription cityPricing')
        .sort({ order: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await Product.countDocuments(query);
      const hasMore = totalCount > skip + activeProducts.length;

      const responseData = {
        products: activeProducts,
        count: activeProducts.length,
        totalCount,
        hasMore,
        page,
        limit
      };

      // ⚡ CACHE IT: Store for 5 minutes
      apiCache.set(cacheKey, responseData, 300000);

      return NextResponse.json({
        success: true,
        ...responseData,
        cached: false
      });

    } catch (mongoError) {
      console.error('❌ MongoDB error, using JSON fallback:', mongoError);

      // FALLBACK: Use JSON file if MongoDB fails
      try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        const allProducts = JSON.parse(data);

        // Filter products based on featured parameter and active status
        let activeProducts;
        if (featuredOnly) {
          // For featured products, only filter by isFeatured (not isActive)
          activeProducts = allProducts.filter((product: unknown) =>
            product && typeof product === 'object' && 'isFeatured' in product && product.isFeatured === true
          );
        } else {
          // For regular products, filter by isActive
          activeProducts = allProducts.filter((product: unknown) =>
            product && typeof product === 'object' && 'isActive' in product && product.isActive === true
          );
        }

        console.log('✅ Found', activeProducts.length, featuredOnly ? 'featured' : 'active', 'products from JSON fallback');

        // ⚡ CACHE IT: Store fallback results for ultra-fast future requests
        apiCache.set(cacheKey, activeProducts, 300000); // 5min cache

        return NextResponse.json({
          success: true,
          products: activeProducts,
          count: activeProducts.length,
          cached: false,
          source: 'json'
        });

      } catch (fileError: unknown) {
        console.error('❌ JSON fallback also failed:', fileError instanceof Error ? fileError.message : String(fileError));
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch products from any source',
            products: [],
            source: 'error'
          },
          { status: 500 }
        );
      }
    }

  } catch (error: unknown) {
    console.error('❌ General error fetching products for frontend:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        products: []
      },
      { status: 500 }
    );
  }
}

// Cache invalidation function
export function invalidateProductsCache() {
  apiCache.delete('products:all');
  apiCache.delete('products:featured');
  console.log('🗑️ Products cache invalidated');
}


