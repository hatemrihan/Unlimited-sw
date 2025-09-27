import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';

// GET - Fetch cities with ONLY product-specific pricing (NO GLOBAL DEFAULTS)
export async function GET(request: NextRequest) {
  try {
    console.log('🏪 Fetching cities for checkout - PRODUCT-SPECIFIC ONLY...');
    
    // Get productIds from query parameters
    const { searchParams } = new URL(request.url);
    const productIdsParam = searchParams.get('productIds');
    const productIds = productIdsParam ? productIdsParam.split(',') : [];
    
    if (productIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No products specified. Product-specific shipping required.'
      }, { status: 400 });
    }
    
    await dbConnect();
    
    // Get products with their city-specific pricing
    const products = await Product.find({ 
      _id: { $in: productIds },
      isActive: true 
    }).select('_id name cityPricing');
    
    console.log(`📦 Found ${products.length} products with city-specific pricing`);
    
    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active products found'
      }, { status: 400 });
    }
    
    // Create a map of governorate -> product-specific pricing
    const governorateMap = new Map<string, any>();
    
    // Process each product's city-specific pricing
    for (const product of products) {
      if (product.cityPricing && product.cityPricing.length > 0) {
        for (const cityPricing of product.cityPricing) {
          const gov = cityPricing.governorate;
          
          if (!governorateMap.has(gov)) {
            // Create new governorate entry
            governorateMap.set(gov, {
              _id: `gov_${gov}`,
              cityName: gov,
              governorate: gov,
              shippingCost: 0, // Will be calculated from products
              codFee: 0, // Will be calculated from products
              isActive: cityPricing.isActive,
              source: 'product_specific',
              productPricing: {}
            });
          }
          
          const govEntry = governorateMap.get(gov);
          
          // Add product-specific pricing
          govEntry.productPricing[product._id.toString()] = {
            price: cityPricing.price,
            shippingCost: cityPricing.shippingCost || 0,
            codFee: cityPricing.codFee || 0,
            isActive: cityPricing.isActive
          };
          
          // Update governorate shipping cost to sum of all products (for display purposes)
          govEntry.shippingCost = Math.max(govEntry.shippingCost, cityPricing.shippingCost || 0);
          govEntry.codFee = Math.max(govEntry.codFee, cityPricing.codFee || 0);
        }
      }
    }
    
    const governorates = Array.from(governorateMap.values());
    
    if (governorates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No product-specific shipping costs found. Please set shipping costs for your products.'
      }, { status: 400 });
    }
    
    console.log(`✅ Returning ${governorates.length} GOVERNORATES with product-specific pricing`);
    
    return NextResponse.json({
      success: true,
      cities: governorates
    });
    
  } catch (error) {
    console.error('❌ Error fetching checkout cities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cities for checkout' },
      { status: 500 }
    );
  }
}
