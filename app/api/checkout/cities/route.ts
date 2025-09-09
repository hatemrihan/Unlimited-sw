import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import CityPricing from '../../../../models/cityPricing';
import Product from '../../../../models/product';

// GET - Fetch cities with product-specific pricing if available
export async function GET(request: NextRequest) {
  try {
    console.log('🏪 Fetching cities for checkout...');
    
    // Get productIds from query parameters
    const { searchParams } = new URL(request.url);
    const productIdsParam = searchParams.get('productIds');
    const productIds = productIdsParam ? productIdsParam.split(',') : [];
    
    await dbConnect();
    
    // Get global default cities
    const globalCities = await CityPricing.find({ isActive: true }).sort({ governorate: 1, cityName: 1 });
    
    // If no products specified, return global defaults
    if (productIds.length === 0) {
      console.log('✅ Returning global default shipping rates');
      return NextResponse.json({
        success: true,
        cities: globalCities.map(city => ({
          _id: city._id,
          cityName: city.cityName,
          governorate: city.governorate,
          shippingCost: city.shippingCost,
          codFee: city.codFee,
          isActive: city.isActive,
          source: 'global_default'
        }))
      });
    }
    
    // Get products with their city-specific pricing
    const products = await Product.find({ 
      _id: { $in: productIds },
      isActive: true 
    }).select('_id name cityPricing');
    
    console.log(`📦 Found ${products.length} products with potential custom pricing`);
    
    // Create a map of city -> product-specific pricing
    const cityPricingMap = new Map<string, any>();
    
    // First, populate with global defaults
    for (const city of globalCities) {
      const key = `${city.cityName}_${city.governorate}`;
      cityPricingMap.set(key, {
        _id: city._id,
        cityName: city.cityName,
        governorate: city.governorate,
        shippingCost: city.shippingCost,
        codFee: city.codFee,
        isActive: city.isActive,
        source: 'global_default',
        productPricing: {}
      });
    }
    
    // Then, overlay product-specific pricing
    for (const product of products) {
      if (product.cityPricing && product.cityPricing.length > 0) {
        for (const cityPricing of product.cityPricing) {
          const key = `${cityPricing.cityName}_${cityPricing.governorate}`;
          const existing = cityPricingMap.get(key);
          
          if (existing) {
            // Add product-specific pricing info
            existing.productPricing[product._id.toString()] = {
              price: cityPricing.price,
              isActive: cityPricing.isActive
            };
            existing.source = 'mixed'; // Has both global and product-specific
          }
        }
      }
    }
    
    const cities = Array.from(cityPricingMap.values());
    
    console.log(`✅ Returning ${cities.length} cities with combined pricing`);
    
    return NextResponse.json({
      success: true,
      cities: cities
    });
    
  } catch (error) {
    console.error('❌ Error fetching checkout cities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cities for checkout' },
      { status: 500 }
    );
  }
}
