import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';
import { invalidateProductsCache } from '../../products/route';

// GET - Fetch all products for admin dashboard
export async function GET(request: NextRequest) {
  try {
    console.log('📖 Admin fetching products from MongoDB...');

    try {
      // Try MongoDB first (PRIMARY METHOD for e-commerce)
      await dbConnect();
      console.log('✅ MongoDB connected for admin products');

      const products = await Product.find({}).sort({ createdAt: -1 });
      console.log('✅ Found', products.length, 'products in MongoDB');

      return NextResponse.json({
        success: true,
        products: products,
        count: products.length,
        source: 'mongodb'
      });

    } catch (mongoError) {
      console.error('❌ MongoDB error, using JSON file fallback:', mongoError);

      // Fallback to file storage
      const { promises: fs } = require('fs');
      const path = require('path');

      try {
        const dataFilePath = path.join(process.cwd(), 'data', 'products.json');
        console.log('🔄 Fallback: Reading from products file at:', dataFilePath);

        let products = [];
        try {
          const data = await fs.readFile(dataFilePath, 'utf8');
          products = JSON.parse(data);
          console.log('📖 Successfully read products file');
        } catch (fileError) {
          console.log('❌ Error reading products file:', (fileError as Error).message);
          products = [];
        }

        console.log('✅ Found', products.length, 'products from file fallback');

        return NextResponse.json({
          success: true,
          products: products,
          count: products.length,
          source: 'json'
        });

      } catch (fallbackError) {
        console.error('❌ File fallback also failed:', fallbackError);
        return NextResponse.json({
          success: false,
          products: [],
          count: 0,
          error: 'Could not read from MongoDB or file',
          source: 'error'
        });
      }
    }

  } catch (error) {
    console.error('❌ General error fetching products for admin:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products for admin',
        products: []
      },
      { status: 500 }
    );
  }
}

// POST - Create new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    console.log('📝 Creating product...');
    
    // Parse request body
    const body = await request.json();
    console.log('📦 Product request body:', body);
    
    const { name, price, originalPrice, discount, mainImage, images, description, promoCode, variants, stock, isActive, isFeatured, order } = body;
    
    // Validate required fields
    if (!name || !mainImage || !description || !promoCode) {
      console.log('❌ Missing required product fields');
      return NextResponse.json(
        { success: false, error: 'Name, Main Image, Description, and Promo Code are required' },
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
        discount: discount || 0,
        mainImage: mainImage.trim(),
        images: images || [],
        description: description.trim(),
        promoCode: promoCode.trim(),
        variants: variants || [],
        stock: stock || 0,
        isActive: isActive !== false,
        isFeatured: isFeatured || false,
        order: order || 0
      });

      // Save to MongoDB
      const savedProduct = await newProduct.save();
      console.log('✅ Product saved to MongoDB:', savedProduct._id);

      // Invalidate frontend cache for instant updates
      invalidateProductsCache();

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


