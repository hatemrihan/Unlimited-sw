import { NextRequest, NextResponse } from 'next/server';
import CityPricing from '../../../../../models/cityPricing';
import { requireAdmin } from '../../../../../lib/requireAdmin';
import { withDb } from '../../../../../lib/withDb';
import { invalidateCitiesCache } from '../../../../../lib/cache';
import { sellsFromSupabase } from '@/shopdb/client';
import { deleteCity, updateCity } from '@/shopdb/cities';

// PUT - Update city
export const PUT = withDb(async (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const authError = await requireAdmin();
  if (authError) return authError;
  
  const { id: cityId } = await ctx.params;
  const body = await request.json();
  const { cityName, governorate, shippingCost, codFee, isActive } = body;
  
  // Validate required fields
  if (!cityName || !governorate || shippingCost === undefined || codFee === undefined) {
    return NextResponse.json(
      { success: false, error: 'City name, governorate, shipping cost, and COD fee are required' },
      { status: 400 }
    );
  }
  
  // After the move (SHOP_DB=supabase): the same answer, from Supabase.
  if (sellsFromSupabase()) {
    const updated = await updateCity(cityId, { cityName, governorate, shippingCost, codFee, isActive });
    if (!updated) return NextResponse.json({ success: false, error: 'City not found' }, { status: 404 });
    return NextResponse.json({ success: true, city: updated, message: 'City updated successfully' });
  }

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
  
  invalidateCitiesCache();
  
  return NextResponse.json({
    success: true,
    city: updatedCity,
    message: 'City updated successfully'
  });
});

// DELETE - Delete city
export const DELETE = withDb(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const authError = await requireAdmin();
  if (authError) return authError;
  
  const { id: cityId } = await ctx.params;
  
  // After the move (SHOP_DB=supabase): the same answer, from Supabase.
  if (sellsFromSupabase()) {
    if (!(await deleteCity(cityId))) {
      return NextResponse.json({ success: false, error: 'City not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'City deleted successfully' });
  }

  const deletedCity = await CityPricing.findByIdAndDelete(cityId);
  
  if (!deletedCity) {
    return NextResponse.json(
      { success: false, error: 'City not found' },
      { status: 404 }
    );
  }
  
  invalidateCitiesCache();
  
  return NextResponse.json({
    success: true,
    message: 'City deleted successfully'
  });
});
