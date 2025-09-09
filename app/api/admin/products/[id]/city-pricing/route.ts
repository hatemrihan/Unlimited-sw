import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../../lib/mongodb';
import Product from '../../../../../../models/product';
import CityPricing from '../../../../../../models/cityPricing';

// GET - Get city pricing for a specific product
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('💰 Fetching product city pricing...');
    
    const { id: productId } = await params;
    
    await dbConnect();
    
    // Get product with city pricing
    const product = await Product.findById(productId).select('name cityPricing');
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Get all available cities
    const allCities = await CityPricing.find({ isActive: true }).sort({ governorate: 1, cityName: 1 });
    
    // Merge product city pricing with available cities
    const cityPricingData = allCities.map(city => {
      const existingPricing = product.cityPricing?.find(
        (cp: any) => cp.cityName === city.cityName && cp.governorate === city.governorate
      );
      
      return {
        cityName: city.cityName,
        governorate: city.governorate,
        price: existingPricing?.price || product.price || 0,
        isActive: existingPricing?.isActive !== false,
        shippingCost: city.shippingCost,
        codFee: city.codFee
      };
    });
    
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
    
    // Update product with new city pricing
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        cityPricing: cityPricing.map((cp: any) => ({
          cityName: cp.cityName,
          governorate: cp.governorate,
          price: Number(cp.price),
          isActive: cp.isActive !== false
        }))
      },
      { new: true, runValidators: true }
    );
    
    console.log('✅ Product city pricing updated:', updatedProduct.name);
    
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
