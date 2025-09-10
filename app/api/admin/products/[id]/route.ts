import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import Product from '../../../../../models/product';
import { invalidateAdminProductsCache } from '../route';

// GET - Fetch a single product by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('📖 Fetching product...');

    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await dbConnect();
    console.log('✅ MongoDB connected for product fetch');

    // Find the product
    const product = await Product.findById(productId);

    if (!product) {
      console.log('❌ Product not found');
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('✅ Product fetched successfully:', product._id);

    return NextResponse.json({
      success: true,
      product: product
    });

  } catch (error) {
    console.error('❌ Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch product: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// PATCH - Toggle featured status of a product
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('🔄 Toggling featured status...');

    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { isFeatured } = body;

    console.log(`🔄 Toggling product ${productId} featured status to:`, isFeatured);

    // Connect to MongoDB
    await dbConnect();
    console.log('✅ MongoDB connected for featured toggle');

    // Find and update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { isFeatured: isFeatured },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      console.log('❌ Product not found');
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('✅ Product featured status updated:', updatedProduct._id);

    // 🚀 CRITICAL: Invalidate cache immediately for real-time updates
    invalidateAdminProductsCache();
    console.log('🗑️ Admin products cache invalidated after featured toggle');

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: `Product ${isFeatured ? 'featured' : 'unfeatured'} successfully`
    });

  } catch (error) {
    console.error('❌ Error toggling featured status:', error);
    return NextResponse.json(
      { success: false, error: `Failed to toggle featured status: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// DELETE - Delete a product
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('🗑️ Deleting product...');

    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await dbConnect();
    console.log('✅ MongoDB connected for product deletion');

    // Find and delete the product
    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      console.log('❌ Product not found');
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('✅ Product deleted successfully:', deletedProduct._id);

    // 🚀 CRITICAL: Invalidate cache immediately for real-time updates
    invalidateAdminProductsCache();
    console.log('🗑️ Admin products cache invalidated after deletion');

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: `Failed to delete product: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// PUT - Update an existing product
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('📝 Updating product...');

    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('📦 Update product request body:', body);

    const { name, price, originalPrice, discount, mainImage, images, description, promoCode, variants, stock, isActive, isFeatured, order, detailedDescription, specifications, shippingInfo, faqs, showOutOfStockBadge, showPreorderBadge } = body;

    // Validate required fields
    if (!name || !mainImage || !description) {
      console.log('❌ Missing required product fields');
      return NextResponse.json(
        { success: false, error: 'Name, Main Image, and Description are required' },
        { status: 400 }
      );
    }

    console.log('✅ Product update fields validated');

    // Connect to MongoDB
    await dbConnect();
    console.log('✅ MongoDB connected for product update');

    // Find and update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name: name.trim(),
        price: price || 0,
        originalPrice: originalPrice || 0,
        discount: discount || 0,
        mainImage: mainImage.trim(),
        images: images || [],
        description: description.trim(),
        promoCode: promoCode ? promoCode.trim() : '',
        variants: variants || [],
        stock: stock || 0,
        isActive: isActive !== false,
        isFeatured: isFeatured || false,
        order: order || 0,
        detailedDescription: detailedDescription || '',
        specifications: specifications || '',
        shippingInfo: shippingInfo || '',
        faqs: faqs || [],
        showOutOfStockBadge: !!showOutOfStockBadge,
        showPreorderBadge: !!showPreorderBadge
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      console.log('❌ Product not found');
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('✅ Product updated successfully:', updatedProduct._id);

    // 🚀 CRITICAL: Invalidate cache immediately for real-time updates
    invalidateAdminProductsCache();
    console.log('🗑️ Admin products cache invalidated after update');

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating product:', error);
    return NextResponse.json(
      { success: false, error: `Failed to update product: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
