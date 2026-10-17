import { NextRequest, NextResponse } from 'next/server';
import CityPricing from '../../../../../models/cityPricing';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/requireAdmin';
import { withDb } from '../../../../../lib/withDb';
import { invalidateCitiesCache } from '../../../../../lib/cache';
import { sellsFromSupabase } from '@/shopdb/client';
import { setGovernorateDefaults } from '@/shopdb/cities';

const globalDefaultsSchema = z.object({
  governorate:  z.string().min(1),
  shippingCost: z.number().nonnegative(),
  codFee:       z.number().nonnegative(),
  isActive:     z.boolean().default(true),
});

// PUT - Update global default shipping rates for a governorate
export const PUT = withDb(async (request: NextRequest) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await request.json();
  const parsed = globalDefaultsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { governorate, shippingCost, codFee, isActive } = parsed.data;

  // After the move (SHOP_DB=supabase): the same answer, from Supabase.
  if (sellsFromSupabase()) {
    const modifiedCount = await setGovernorateDefaults(governorate, { shippingCost, codFee, isActive });
    return NextResponse.json({
      success: true,
      modifiedCount,
      message: `Updated global default rates for ${governorate}. Affects new products only.`,
    });
  }

  const updateResult = await CityPricing.updateMany(
    { governorate: governorate.trim() },
    { $set: { shippingCost, codFee, isActive } }
  );

  invalidateCitiesCache();

  return NextResponse.json({
    success: true,
    modifiedCount: updateResult.modifiedCount,
    message: `Updated global default rates for ${governorate}. Affects new products only.`,
  });
});
