import { NextRequest, NextResponse } from 'next/server';
import CityPricing from '../../../../../models/cityPricing';
import { requireAdmin } from '../../../../../lib/requireAdmin';
import { withDb } from '../../../../../lib/withDb';
import { invalidateCitiesCache } from '../../../../../lib/cache';

// POST - Bulk add all 27 Egyptian Governorates
export const POST = withDb(async (request: NextRequest) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  // The 27 Egyptian Governorates with reasonable default shipping costs and COD fees
  const governorates = [
    { name: 'Cairo', shippingCost: 40, codFee: 10 },
    { name: 'Giza', shippingCost: 40, codFee: 10 },
    { name: 'Alexandria', shippingCost: 45, codFee: 10 },
    { name: 'Dakahlia', shippingCost: 50, codFee: 10 },
    { name: 'Red Sea', shippingCost: 70, codFee: 15 },
    { name: 'Beheira', shippingCost: 50, codFee: 10 },
    { name: 'Fayoum', shippingCost: 55, codFee: 12 },
    { name: 'Gharbia', shippingCost: 50, codFee: 10 },
    { name: 'Ismailia', shippingCost: 50, codFee: 10 },
    { name: 'Monufia', shippingCost: 50, codFee: 10 },
    { name: 'Minya', shippingCost: 60, codFee: 12 },
    { name: 'Qalyubia', shippingCost: 45, codFee: 10 },
    { name: 'New Valley', shippingCost: 80, codFee: 20 },
    { name: 'Suez', shippingCost: 50, codFee: 10 },
    { name: 'Aswan', shippingCost: 70, codFee: 15 },
    { name: 'Assiut', shippingCost: 60, codFee: 12 },
    { name: 'Beni Suef', shippingCost: 55, codFee: 12 },
    { name: 'Port Said', shippingCost: 50, codFee: 10 },
    { name: 'Damietta', shippingCost: 50, codFee: 10 },
    { name: 'Sharkia', shippingCost: 50, codFee: 10 },
    { name: 'South Sinai', shippingCost: 70, codFee: 15 },
    { name: 'Kafr El Sheikh', shippingCost: 50, codFee: 10 },
    { name: 'Matrouh', shippingCost: 70, codFee: 15 },
    { name: 'Luxor', shippingCost: 70, codFee: 15 },
    { name: 'Qena', shippingCost: 65, codFee: 15 },
    { name: 'North Sinai', shippingCost: 80, codFee: 20 },
    { name: 'Sohag', shippingCost: 65, codFee: 12 },
  ];

  const allCities = governorates.map((gov) => ({
    cityName: gov.name,
    governorate: gov.name,
    shippingCost: gov.shippingCost,
    codFee: gov.codFee,
  }));

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
