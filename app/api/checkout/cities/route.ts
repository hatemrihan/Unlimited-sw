import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import CityPricing from '../../../../models/cityPricing';
import Product from '../../../../models/product';

// GET - Fetch cities with product-specific pricing if available
export async function GET(request: NextRequest) {
  try {
    console.log('🏪 Fetching governorates for checkout...');
    
    // Get productIds from query parameters
    const { searchParams } = new URL(request.url);
    const productIdsParam = searchParams.get('productIds');
    const productIds = productIdsParam ? productIdsParam.split(',') : [];
    
    await dbConnect();
    
    // Get global default governorates (stored in CityPricing)
    const governorates = await CityPricing.find({ isActive: true }).sort({ governorate: 1 });
    
    // If no products specified, return global defaults
    if (productIds.length === 0) {
      console.log('✅ Returning global default shipping rates');
      return NextResponse.json({
        success: true,
        cities: governorates.map(gov => ({
          _id: gov._id,
          cityName: gov.governorate, // Map governorate to cityName for frontend compatibility
          governorate: gov.governorate,
          shippingCost: gov.shippingCost,
          codFee: gov.codFee,
          isActive: gov.isActive,
          source: 'global_default'
        }))
      });
    }
    
    // Get products with their city-specific pricing
    const products = await Product.find({ 
      _id: { $in: productIds },
      isActive: true 
    })
    .select('_id name cityPricing')
    .lean(); // Faster query and returns plain JS objects
    
    console.log(`📦 Found ${products.length} products with potential custom pricing`);
    
    // Create a map of governorate -> pricing data
    const governorateMap = new Map<string, any>();
    
    for (const gov of governorates) {
      governorateMap.set(gov.governorate, {
        _id: gov._id,
        cityName: gov.governorate,
        governorate: gov.governorate,
        shippingCost: gov.shippingCost,
        codFee: gov.codFee,
        isActive: gov.isActive,
        source: 'global_default',
        productPricing: {}
      });
    }
    
    // Overlay product-specific pricing
    for (const product of products as any[]) {
      if (product.cityPricing && product.cityPricing.length > 0) {
        for (const cityPricing of product.cityPricing) {
          const govName = cityPricing.governorate;
          const existing = governorateMap.get(govName);
          
          if (existing) {
            existing.productPricing[product._id.toString()] = {
              price: cityPricing.price,
              shippingCost: cityPricing.shippingCost ?? 0,
              codFee: cityPricing.codFee ?? 0,
              isActive: cityPricing.isActive
            };
            existing.source = 'mixed';
          }
        }
      }
    }
    
    const resolvedGovernorates = Array.from(governorateMap.values());
    console.log(`✅ Returning ${resolvedGovernorates.length} GOVERNORATES`);
    
    return NextResponse.json({
      success: true,
      cities: resolvedGovernorates // Keep the field name "cities" for frontend compatibility
    });
    
  } catch (error) {
    console.error('❌ Error fetching checkout cities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cities for checkout' },
      { status: 500 }
    );
  }
}
