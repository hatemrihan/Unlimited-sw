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
    
    const cities = await CityPricing.find({}).sort({ governorate: 1, cityName: 1 });
    
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
