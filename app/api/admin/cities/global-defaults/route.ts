import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import CityPricing from '../../../../../models/cityPricing';

// PUT - Update global default shipping rates for a governorate
// This ONLY affects the default rates, NOT product-specific rates
export async function PUT(request: NextRequest) {
  try {
    console.log('🌍 Updating global default shipping rates...');
    
    const body = await request.json();
    const { governorate, shippingCost, codFee, isActive } = body;
    
    // Validate required fields
    if (!governorate || shippingCost === undefined || codFee === undefined) {
      return NextResponse.json(
        { success: false, error: 'Governorate, shipping cost, and COD fee are required' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Update the global default rates for this governorate
    // This will be used as fallback for new products
    const updateResult = await CityPricing.updateMany(
      { governorate: governorate.trim() },
      {
        $set: {
          shippingCost: Number(shippingCost),
          codFee: Number(codFee),
          isActive: isActive !== false
        }
      }
    );
    
    console.log(`✅ Updated global default rates for ${updateResult.modifiedCount} cities in ${governorate}`);
    console.log('📝 Note: This only affects global defaults, not product-specific rates');
    
    return NextResponse.json({
      success: true,
      modifiedCount: updateResult.modifiedCount,
      message: `Updated global default rates for ${governorate}. This affects NEW products only.`
    });
    
  } catch (error) {
    console.error('❌ Error updating global default rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update global default rates' },
      { status: 500 }
    );
  }
}


