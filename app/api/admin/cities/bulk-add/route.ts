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

    // Additional Requested Governorates
    const additionalGovernorates = [
      // Sohag Governorate (Upper Egypt - higher shipping cost)
      { cityName: 'Sohag', governorate: 'Sohag', shippingCost: 45, codFee: 12 },

      // South Sinai Governorate (Red Sea area - premium shipping)
      { cityName: 'Sharm El Sheikh', governorate: 'South Sinai', shippingCost: 60, codFee: 15 },

      // Qena Governorate (Upper Egypt)
      { cityName: 'Qena', governorate: 'Qena', shippingCost: 45, codFee: 12 },

      // New Valley Governorate (Western Desert - remote area)
      { cityName: 'Kharga', governorate: 'New Valley', shippingCost: 70, codFee: 18 },
      { cityName: 'Dakhla', governorate: 'New Valley', shippingCost: 70, codFee: 18 },

      // Matrouh Governorate (North Coast)
      { cityName: 'Marsa Matrouh', governorate: 'Matrouh', shippingCost: 50, codFee: 15 },
    ];

    // Asiut Governorate cities (Upper Egypt - ~375km south of Cairo)
    const asiutCities = [
      { cityName: 'Asyut', governorate: 'Asyut', shippingCost: 45, codFee: 12 },
      { cityName: 'Abnub', governorate: 'Asyut', shippingCost: 45, codFee: 12 },
      { cityName: 'Manfalut', governorate: 'Asyut', shippingCost: 45, codFee: 12 },
      { cityName: 'Dayrut', governorate: 'Asyut', shippingCost: 45, codFee: 12 },
    ];

    // Menya (Minya) Governorate cities (Upper Egypt - ~245km south of Cairo)
    const menyaCities = [
      { cityName: 'Minya', governorate: 'Minya', shippingCost: 40, codFee: 10 },
      { cityName: 'Mallawi', governorate: 'Minya', shippingCost: 40, codFee: 10 },
      { cityName: 'Samalut', governorate: 'Minya', shippingCost: 40, codFee: 10 },
      { cityName: 'Beni Mazar', governorate: 'Minya', shippingCost: 40, codFee: 10 },
    ];

    const allCities = [...fayoumCities, ...damiettaCities, ...additionalGovernorates, ...asiutCities, ...menyaCities];
    const results = {
      added: [] as string[],
      skipped: [] as string[],
      errors: [] as string[]
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${cityData.cityName}, ${cityData.governorate}: ${errorMessage}`);
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
