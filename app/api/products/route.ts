import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import dbConnect from '../../../lib/mongodb';
import Product from '../../../models/product';

// File path for storing products (fallback only)
const dataFilePath = path.join(process.cwd(), 'data', 'products.json');

// In-memory cache for faster responses
let productsCache: any = null;
let lastCacheTime = 0;
const CACHE_DURATION = 300 * 1000; // 5 minutes cache for better performance

// GET - Fetch all active products for frontend
export async function GET(request: NextRequest) {
  try {
    // Check for featured parameter
    const { searchParams } = new URL(request.url);
    const featuredOnly = searchParams.get('featured') === 'true';
    const cacheKey = featuredOnly ? 'featured' : 'regular';

    // Check cache first for instant responses
    const now = Date.now();
    if (productsCache && productsCache[cacheKey] && (now - lastCacheTime) < CACHE_DURATION) {
      console.log('⚡ Serving from cache - instant response!');
      return NextResponse.json({
        success: true,
        products: productsCache[cacheKey],
        count: productsCache[cacheKey].length,
        source: 'cache'
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

      const activeProducts = await Product.find(query).sort({ order: 1 });
      console.log('✅ Found', activeProducts.length, featuredOnly ? 'featured' : 'active', 'products in MongoDB');

      // Cache the results for instant future responses
      if (!productsCache) {
        productsCache = {};
      }
      productsCache[cacheKey] = activeProducts;
      lastCacheTime = now;

      return NextResponse.json({
        success: true,
        products: activeProducts,
        count: activeProducts.length,
        source: 'mongodb'
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

        // Cache JSON fallback results too
        if (!productsCache) {
          productsCache = {};
        }
        productsCache[cacheKey] = activeProducts;
        lastCacheTime = now;

        return NextResponse.json({
          success: true,
          products: activeProducts,
          count: activeProducts.length,
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
  productsCache = null;
  lastCacheTime = 0;
  console.log('🗑️ Products cache invalidated');
}


