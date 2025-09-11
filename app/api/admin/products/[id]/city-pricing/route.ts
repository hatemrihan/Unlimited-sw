import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../../lib/mongodb';
import Product from '../../../../../../models/product';
import CityPricing from '../../../../../../models/cityPricing';
import { invalidateAdminProductsCache } from '../../route';
import { invalidateProductsCache } from '../../../../products/route';
import { productCache } from '../../../../../../lib/cache';

// GET - Get city pricing for a specific product
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('💰 Fetching product city pricing...');
    
    const { id: productId } = await params;
    
    await dbConnect();
    
    // Get product with city pricing
    const product = await Product.findById(productId).select('name price cityPricing');
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Get all available cities
    const allCities = await CityPricing.find({ isActive: true }).sort({ governorate: 1, cityName: 1 });

    // Aggregate by governorate (one row per governorate)
    const govMap: Record<string, any> = {};
    for (const city of allCities) {
      const govName = city.governorate;
      if (!govMap[govName]) {
        // find an existing product price/isActive for this governorate
        const existingGovPricing = (product.cityPricing || []).find((cp: any) => cp.governorate === govName);
        govMap[govName] = {
          governorate: govName,
          price: existingGovPricing?.price ?? product.price ?? 0,
          isActive: existingGovPricing?.isActive !== false,
          shippingCost: city.shippingCost,
          codFee: city.codFee,
        };
      }
    }
    const cityPricingData = Object.values(govMap);
    
    return NextResponse.json({
      success: true,
      productName: product.name,
      basePrice: product.price,
      cityPricing: cityPricingData
    });
    
  } catch (error) {
    console.error('❌ Error fetching product city pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch city pricing' },
      { status: 500 }
    );
  }
}

// PUT - Update city pricing for a specific product
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('💰 Updating product city pricing...');
    
    const { id: productId } = await params;
    const body = await request.json();
    const { cityPricing } = body;
    
    if (!cityPricing || !Array.isArray(cityPricing)) {
      return NextResponse.json(
        { success: false, error: 'City pricing data is required' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // FIXED: Product-specific city pricing logic
    // For each governorate:
    // 1) Set product-specific price and isActive status
    // 2) Build product.cityPricing entries for all cities in that governorate
    // 3) DO NOT modify global CityPricing collection (that's for defaults only)
    const productCityPricing: any[] = [];

    for (const gp of cityPricing) {
      const govName = gp.governorate;
      const price = Number(gp.price) || 0;
      const shippingCost = Number(gp.shippingCost) || 0;
      const codFee = Number(gp.codFee) || 0;
      const isActive = gp.isActive !== false;

      // Store product-specific pricing including shipping costs and COD fees
      console.log(`📦 Setting product-specific pricing for ${govName}: price=${price}, shipping=${shippingCost}, cod=${codFee}, active=${isActive}`);

      // Fetch all cities for this governorate to create product-specific entries
      const govCities = await CityPricing.find({ governorate: govName });
      for (const city of govCities) {
        productCityPricing.push({
          cityName: city.cityName,
          governorate: govName,
          price,
          shippingCost,
          codFee,
          isActive,
        });
      }
    }

    // Replace product cityPricing with the newly built list
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { cityPricing: productCityPricing },
      { new: true, runValidators: true }
    );
    
    console.log('✅ Product city pricing updated:', updatedProduct.name);
    
    // 🚀 CRITICAL: Invalidate ALL caches immediately for real-time updates
    const { id: productId } = await params;
    invalidateAdminProductsCache();
    invalidateProductsCache();
    productCache.delete(`product:detail:${productId}`);
    console.log('🗑️ All product caches invalidated after city pricing update');
    
    return NextResponse.json({
      success: true,
      message: 'City pricing updated successfully',
      cityPricing: updatedProduct.cityPricing
    });
    
  } catch (error) {
    console.error('❌ Error updating product city pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update city pricing' },
      { status: 500 }
    );
  }
}
