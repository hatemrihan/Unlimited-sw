import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import CityPricing from '../../../../models/cityPricing';

// GET - Fetch all cities
export async function GET(request: NextRequest) {
  try {
    console.log('🏙️ Fetching all cities...');
    
    await dbConnect();
    
    const cities = await CityPricing.find({}).sort({ governorate: 1, cityName: 1 });
    
    console.log(`✅ Found ${cities.length} cities`);
    
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
