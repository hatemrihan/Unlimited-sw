import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import CityPricing from '../../../../../models/cityPricing';
import { invalidateCitiesCache } from '../route';

// PUT - Update city
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('🏙️ Updating city...');
    
    const { id: cityId } = await params;
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
    
    const updatedCity = await CityPricing.findByIdAndUpdate(
      cityId,
      {
        cityName: cityName.trim(),
        governorate: governorate.trim(),
        shippingCost: Number(shippingCost),
        codFee: Number(codFee),
        isActive: isActive !== false
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedCity) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ City updated:', updatedCity.cityName);
    
    // Invalidate cache
    invalidateCitiesCache();
    
    return NextResponse.json({
      success: true,
      city: updatedCity,
      message: 'City updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating city:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update city' },
      { status: 500 }
    );
  }
}

// DELETE - Delete city
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('🏙️ Deleting city...');
    
    const { id: cityId } = await params;
    
    await dbConnect();
    
    const deletedCity = await CityPricing.findByIdAndDelete(cityId);
    
    if (!deletedCity) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ City deleted:', deletedCity.cityName);
    
    // Invalidate cache
    invalidateCitiesCache();
    
    return NextResponse.json({
      success: true,
      message: 'City deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting city:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete city' },
      { status: 500 }
    );
  }
}
