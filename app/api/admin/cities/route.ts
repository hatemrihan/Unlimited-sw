import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import CityPricing from '../../../../models/cityPricing';

// In-memory cache for faster responses
let citiesCache: any = null;
let lastCacheTime = 0;
const CACHE_DURATION = 600 * 1000; // 10 minutes cache for cities

// GET - Fetch all cities
export async function GET(request: NextRequest) {
  try {
    console.log('🏙️ Fetching all cities...');
    
    // Check cache first
    const now = Date.now();
    if (citiesCache && (now - lastCacheTime) < CACHE_DURATION) {
      console.log('✅ Returning cached cities data');
      return NextResponse.json({
        success: true,
        cities: citiesCache,
        cached: true
      });
    }
    
    await dbConnect();
    
    // 🚀 OPTIMIZED: Return only one entry per governorate with essential fields only
    const raw = await CityPricing.find({})
      .select('governorate cityName shippingCost codFee isActive')
      .sort({ governorate: 1, cityName: 1 })
      .lean(); // 🚀 3x faster queries
    const govMap: Record<string, any> = {};
    for (const city of raw) {
      const key = (city.governorate || '').trim();
      if (!key) continue;
      if (!govMap[key]) {
        govMap[key] = {
          _id: city._id,
          governorate: city.governorate,
          cityName: key, // mirror governorate name
          shippingCost: city.shippingCost,
          codFee: city.codFee,
          isActive: city.isActive,
        };
      }
    }
    const cities = Object.values(govMap);
    
    // Update cache
    citiesCache = cities;
    lastCacheTime = now;
    
    console.log(`✅ Found ${cities.length} cities (cached for faster access)`);
    
    return NextResponse.json({
      success: true,
      cities: cities
    });
    
  } catch (error) {
    console.error('❌ Error fetching cities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}

// Helper function to invalidate cache
export function invalidateCitiesCache() {
  citiesCache = null;
  lastCacheTime = 0;
  console.log('🗑️ Cities cache invalidated');
}

// POST - Create new city
export async function POST(request: NextRequest) {
  try {
    console.log('🏙️ Creating new city...');
    
    const body = await request.json();
    const { cityName, governorate, shippingCost, codFee, isActive } = body;
    
    // Validate required fields
    if (!cityName || !governorate || shippingCost === undefined || codFee === undefined) {
      return NextResponse.json(
        { success: false, error: 'City name, governorate, shipping cost, and COD fee are required' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Check if city already exists
    const existingCity = await CityPricing.findOne({ 
      cityName: cityName.trim().toLowerCase() 
    });
    
    if (existingCity) {
      return NextResponse.json(
        { success: false, error: 'City already exists' },
        { status: 400 }
      );
    }
    
    // Create new city
    const newCity = new CityPricing({
      cityName: cityName.trim(),
      governorate: governorate.trim(),
      shippingCost: Number(shippingCost),
      codFee: Number(codFee),
      isActive: isActive !== false
    });
    
    const savedCity = await newCity.save();
    console.log('✅ City created:', savedCity.cityName);
    
    // Invalidate cache
    invalidateCitiesCache();
    
    return NextResponse.json({
      success: true,
      city: savedCity,
      message: 'City created successfully'
    });
    
  } catch (error) {
    console.error('❌ Error creating city:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create city' },
      { status: 500 }
    );
  }
}

// PUT - DEPRECATED: This endpoint should not be used for global updates
// Use /api/admin/cities/global-defaults instead
export async function PUT(request: NextRequest) {
  try {
    console.log('⚠️ DEPRECATED: PUT /api/admin/cities is deprecated');
    console.log('📝 Use /api/admin/cities/global-defaults for global defaults');
    console.log('📝 Use /api/admin/products/[id]/city-pricing for product-specific rates');
    
    return NextResponse.json({
      success: false,
      error: 'This endpoint is deprecated. Use /api/admin/cities/global-defaults for global defaults or /api/admin/products/[id]/city-pricing for product-specific rates.',
      deprecated: true
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Error in deprecated endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Deprecated endpoint error' },
      { status: 500 }
    );
  }
}
