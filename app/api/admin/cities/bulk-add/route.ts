import { NextRequest, NextResponse } from 'next/server';
import CityPricing from '../../../../../models/cityPricing';
import { requireAdmin } from '../../../../../lib/requireAdmin';
import { withDb } from '../../../../../lib/withDb';
import { invalidateCitiesCache } from '../../../../../lib/cache';

// POST - Bulk add governorates and cities
export const POST = withDb(async (request: NextRequest) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  // Fayoum Governorate cities
  const fayoumCities = [
    { cityName: 'Fayoum', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
    { cityName: 'Sennuris', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
    { cityName: 'Itsa', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
    { cityName: 'Tamiya', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
    { cityName: 'Yusuf al-Siddiq', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
    { cityName: 'Abshaway', governorate: 'Fayoum', shippingCost: 35, codFee: 10 },
    { cityName: '6 October', governorate: '6 October', shippingCost: 35, codFee: 10 },
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
    { cityName: 'Sohag', governorate: 'Sohag', shippingCost: 45, codFee: 12 },
    { cityName: 'Sharm El Sheikh', governorate: 'South Sinai', shippingCost: 60, codFee: 15 },
    { cityName: 'Qena', governorate: 'Qena', shippingCost: 45, codFee: 12 },
    { cityName: 'Kharga', governorate: 'New Valley', shippingCost: 70, codFee: 18 },
    { cityName: 'Dakhla', governorate: 'New Valley', shippingCost: 70, codFee: 18 },
    { cityName: 'Marsa Matrouh', governorate: 'Matrouh', shippingCost: 50, codFee: 15 },
    { cityName: 'Beni Suef', governorate: 'Beni Suef', shippingCost: 50, codFee: 20 },
  ];

  // Asiut Governorate cities
  const asiutCities = [
    { cityName: 'Asyut', governorate: 'Asyut', shippingCost: 45, codFee: 12 },
    { cityName: 'Abnub', governorate: 'Asyut', shippingCost: 45, codFee: 12 },
    { cityName: 'Manfalut', governorate: 'Asyut', shippingCost: 45, codFee: 12 },
    { cityName: 'Dayrut', governorate: 'Asyut', shippingCost: 45, codFee: 12 },
  ];

  // Menya Governorate cities
  const menyaCities = [
    { cityName: 'Minya', governorate: 'Minya', shippingCost: 40, codFee: 10 },
    { cityName: 'Mallawi', governorate: 'Minya', shippingCost: 40, codFee: 10 },
    { cityName: 'Samalut', governorate: 'Minya', shippingCost: 40, codFee: 10 },
    { cityName: 'Beni Mazar', governorate: 'Minya', shippingCost: 40, codFee: 10 },
  ];

  const allCities = [...fayoumCities, ...damiettaCities, ...additionalGovernorates, ...asiutCities, ...menyaCities];

  // Get all existing cityNames in one query
  const existingNames = new Set(
    (await CityPricing.find({}, { cityName: 1 }).lean())
      .map((c: any) => c.cityName.toLowerCase().trim())
  );

  const toInsert = allCities.filter(
    c => !existingNames.has(c.cityName.toLowerCase().trim())
  );
  const skipped = allCities.filter(
    c => existingNames.has(c.cityName.toLowerCase().trim())
  );

  let inserted: any[] = [];
  if (toInsert.length > 0) {
    inserted = await CityPricing.insertMany(
      toInsert.map(c => ({
        cityName:     c.cityName.trim(),
        governorate:  c.governorate.trim(),
        shippingCost: c.shippingCost,
        codFee:       c.codFee,
        isActive:     true,
      })),
      { ordered: false } // continue even if one fails
    );
  }

  invalidateCitiesCache();

  return NextResponse.json({
    success: true,
    message: 'Bulk add completed',
    results: {
      totalProcessed: allCities.length,
      added:   inserted.length,
      skipped: skipped.length,
    },
  });
});
