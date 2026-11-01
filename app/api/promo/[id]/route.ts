import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Promo from '../../../../models/promo';
import { requireAdmin } from '@/lib/requireAdmin';
import { updatePromoSchema } from '@/lib/schemas/promo.schema';
import { sellsFromSupabase } from '@/shopdb/client';
import { deletePromo, getPromo, updatePromo } from '@/shopdb/promos';

/** `2026-08-15` → that day at 00:00:00. */
function startOfSelectedDay(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** `2026-08-15` → that day at 23:59:59, so the code works all day. */
function endOfSelectedDay(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// GET - Fetch single promo code by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Promo codes are money. This route lives at /api/promo, which no
  // middleware matcher covers, so the check has to happen here.
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await params;
    console.log('📋 Fetching promo code:', id);

    // After the move (SHOP_DB=supabase): the same answer, from Supabase.
    if (sellsFromSupabase()) {
      const found = await getPromo(id);
      if (!found) return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
      return NextResponse.json({ success: true, promoCode: found });
    }

    await dbConnect();

    const promoCode = await Promo.findById(id);

    if (!promoCode) {
      return NextResponse.json(
        { success: false, error: 'Promo code not found' },
        { status: 404 }
      );
    }

    console.log('✅ Found promo code:', promoCode.code);

    return NextResponse.json({
      success: true,
      promoCode: {
        _id: promoCode._id,
        code: promoCode.code,
        discount: promoCode.discountValue,
        type: promoCode.discountType,
        minAmount: promoCode.minimumOrder,
        maxUses: promoCode.usageLimit,
        perCustomerLimit: promoCode.perCustomerLimit ?? null,
        currentUses: promoCode.usedCount,
        isActive: promoCode.isActive,
        validFrom: promoCode.startsAt || promoCode.createdAt,
        validUntil: promoCode.expiresAt,
        description: promoCode.description,
        waiveShipping: promoCode.waiveShipping || false
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error fetching promo code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch promo code'
      },
      { status: 500 }
    );
  }
}

// PUT - Update promo code
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Promo codes are money. This route lives at /api/promo, which no
  // middleware matcher covers, so the check has to happen here.
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    // Same rules as creation: a percentage over 100, a code with no discount and
    // no free shipping, or an end date before the start date are all rejected
    // here rather than saved and discovered by a customer.
    const parsed = updatePromoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid promo code' },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // After the move (SHOP_DB=supabase): the same answer, from Supabase.
    if (sellsFromSupabase()) {
      const updated = await updatePromo(id, data);
      if (!updated) return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
      return NextResponse.json({ success: true, message: 'Promo code updated successfully', promoCode: updated });
    }

    await dbConnect();

    const updateData = {
      ...(data.code ? { code: data.code.toUpperCase().trim() } : {}),
      discountType: data.type,
      discountValue: data.discount || 0,
      minimumOrder: data.minAmount,
      maximumDiscount: data.maxDiscount ?? undefined,
      usageLimit: data.maxUses ?? null,
      // null clears it (the admin emptied the box); a number sets it.
      perCustomerLimit: data.perCustomerLimit ?? null,
      isActive: data.isActive,
      startsAt: startOfSelectedDay(data.validFrom),
      expiresAt: endOfSelectedDay(data.validUntil),
      description: data.description,
      waiveShipping: data.waiveShipping || false
      // usedCount is deliberately absent: editing a campaign must never reset
      // how many times it has already been redeemed.
    };

    const promoCode = await Promo.findByIdAndUpdate(id, updateData, { new: true });

    if (!promoCode) {
      return NextResponse.json(
        { success: false, error: 'Promo code not found' },
        { status: 404 }
      );
    }

    console.log('✅ Updated promo code:', promoCode.code);

    return NextResponse.json({
      success: true,
      message: 'Promo code updated successfully',
      promoCode: {
        _id: promoCode._id,
        code: promoCode.code,
        discount: promoCode.discountValue,
        type: promoCode.discountType,
        minAmount: promoCode.minimumOrder,
        maxUses: promoCode.usageLimit,
        perCustomerLimit: promoCode.perCustomerLimit ?? null,
        currentUses: promoCode.usedCount,
        isActive: promoCode.isActive,
        validFrom: promoCode.startsAt || promoCode.createdAt,
        validUntil: promoCode.expiresAt,
        description: promoCode.description,
        waiveShipping: promoCode.waiveShipping || false
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error updating promo code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update promo code'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete promo code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Promo codes are money. This route lives at /api/promo, which no
  // middleware matcher covers, so the check has to happen here.
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await params;
    console.log('🗑️ Deleting promo code:', id);

    // After the move (SHOP_DB=supabase): the same answer, from Supabase.
    if (sellsFromSupabase()) {
      if (!(await deletePromo(id))) return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
      return NextResponse.json({ success: true, message: 'Promo code deleted successfully' });
    }

    await dbConnect();

    const promoCode = await Promo.findByIdAndDelete(id);

    if (!promoCode) {
      return NextResponse.json(
        { success: false, error: 'Promo code not found' },
        { status: 404 }
      );
    }

    console.log('✅ Deleted promo code:', promoCode.code);

    return NextResponse.json({
      success: true,
      message: 'Promo code deleted successfully'
    });

  } catch (error: unknown) {
    console.error('❌ Error deleting promo code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete promo code'
      },
      { status: 500 }
    );
  }
}

// PATCH - Toggle promo code status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Promo codes are money. This route lives at /api/promo, which no
  // middleware matcher covers, so the check has to happen here.
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    console.log('🔄 Toggling promo code status:', id);

    // After the move (SHOP_DB=supabase): the same answer, from Supabase.
    if (sellsFromSupabase()) {
      const toggled = await updatePromo(id, { isActive: Boolean(body.isActive) });
      if (!toggled) return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
      return NextResponse.json({ success: true, message: 'Promo code status updated', promoCode: toggled });
    }

    await dbConnect();

    const promoCode = await Promo.findByIdAndUpdate(
      id,
      { isActive: body.isActive },
      { new: true }
    );

    if (!promoCode) {
      return NextResponse.json(
        { success: false, error: 'Promo code not found' },
        { status: 404 }
      );
    }

    console.log('✅ Updated promo code status:', promoCode.code, promoCode.isActive);

    return NextResponse.json({
      success: true,
      message: 'Promo code status updated successfully',
      promoCode: {
        _id: promoCode._id,
        code: promoCode.code,
        discount: promoCode.discountValue,
        type: promoCode.discountType,
        minAmount: promoCode.minimumOrder,
        maxUses: promoCode.usageLimit,
        perCustomerLimit: promoCode.perCustomerLimit ?? null,
        currentUses: promoCode.usedCount,
        isActive: promoCode.isActive,
        validFrom: promoCode.startsAt || promoCode.createdAt,
        validUntil: promoCode.expiresAt,
        description: promoCode.description,
        waiveShipping: promoCode.waiveShipping || false
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error updating promo code status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update promo code status'
      },
      { status: 500 }
    );
  }
}





