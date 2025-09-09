import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import CityPricing from '../../../../../models/cityPricing';
import { invalidateCitiesCache } from '../route';

// POST - Bulk add governorates and cities
export async function POST(request: NextRequest) {
  try {
    console.log('🏙️ Bulk adding governorates and cities...');
    
    await dbConnect();
    
    // Fayoum Governorate cities
    const fayoumCities = [
      { cityName: 'Fayoum', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
      { cityName: 'Sennuris', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
      { cityName: 'Itsa', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
      { cityName: 'Tamiya', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
      { cityName: 'Yusuf al-Siddiq', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
      { cityName: 'Abshaway', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
    ];

    // Damietta Governorate cities  
    const damiettaCities = [
      { cityName: 'Damietta', governorate: 'Damietta', shippingCost: 30, codFee: 8 },
      { cityName: 'New Damietta', governorate: 'Damietta', shippingCost: 30, codFee: 8 },
      { cityName: 'Faraskur', governorate: 'Damietta', shippingCost: 30, codFee: 8 },
      { cityName: 'Zarqa', governorate: 'Damietta', shippingCost: 30, codFee: 8 },
      { cityName: 'Kafr Saad', governorate: 'Damietta', shippingCost: 30, codFee: 8 },
    ];
    
    const allCities = [...fayoumCities, ...damiettaCities];
    const results = {
      added: [],
      skipped: [],
      errors: []
    };
    
    // Process each city
    for (const cityData of allCities) {
      try {
        // Check if city already exists
        const existingCity = await CityPricing.findOne({ 
          cityName: cityData.cityName.trim().toLowerCase() 
        });
        
        if (existingCity) {
          results.skipped.push(`${cityData.cityName}, ${cityData.governorate} (already exists)`);
          continue;
        }
        
        // Create new city
        const newCity = new CityPricing({
          cityName: cityData.cityName.trim(),
          governorate: cityData.governorate.trim(),
          shippingCost: cityData.shippingCost,
          codFee: cityData.codFee,
          isActive: true
        });
        
        await newCity.save();
        results.added.push(`${cityData.cityName}, ${cityData.governorate} (Shipping: ${cityData.shippingCost} LE, COD: ${cityData.codFee} LE)`);
        
      } catch (error) {
        results.errors.push(`${cityData.cityName}, ${cityData.governorate}: ${error.message}`);
      }
    }
    
    // Invalidate cache
    invalidateCitiesCache();
    
    console.log('✅ Bulk add operation completed');
    console.log(`Added: ${results.added.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`);
    
    return NextResponse.json({
      success: true,
      message: 'Bulk add operation completed',
      results: {
        totalProcessed: allCities.length,
        added: results.added.length,
        skipped: results.skipped.length,
        errors: results.errors.length
      },
      details: results
    });
    
  } catch (error) {
    console.error('❌ Error in bulk add operation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk add governorates' },
      { status: 500 }
    );
  }
}
