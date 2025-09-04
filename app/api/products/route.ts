import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import dbConnect from '../../../lib/mongodb';
import Product from '../../../models/product';

// File path for storing products (fallback only)
const dataFilePath = path.join(process.cwd(), 'data', 'products.json');

// GET - Fetch all active products for frontend
export async function GET(request: NextRequest) {
  try {
    console.log('🛍️ Frontend fetching products from MongoDB...');

    // Check for featured parameter
    const { searchParams } = new URL(request.url);
    const featuredOnly = searchParams.get('featured') === 'true';

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

      // Log details of found products
      if (activeProducts.length > 0) {
        console.log('📋 Products found:');
        activeProducts.forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name} - Featured: ${product.isFeatured} - Active: ${product.isActive}`);
        });
      }

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


