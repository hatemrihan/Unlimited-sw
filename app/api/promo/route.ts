import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Promo from '../../../models/promo';
import { logger } from '../../../utils/logger';
import { requireAdmin } from '@/lib/requireAdmin';
import { createPromoSchema } from '@/lib/schemas/promo.schema';

/** `2026-08-15` → that day at 00:00:00, or undefined when nothing was picked. */
function startOfSelectedDay(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * `2026-08-15` → that day at 23:59:59.
 *
 * Picking the 15th must mean the code works all through the 15th, not until its
 * first second.
 */
function endOfSelectedDay(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// POST - Create new promo code (admin) or validate promo code (frontend)
export async function POST(request: NextRequest) {
  // Promo codes are money. This route lives at /api/promo, which no
  // middleware matcher covers, so the check has to happen here.
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    
    // Pure Creation pipeline isolated from previous Validation loops
    logger.info('📝 Creating new isolated promo code payload natively...');

      const parsed = createPromoSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid promo code' },
          { status: 400 }
        );
      }

      const {
        code,
        discount,
        type,
        minAmount,
        maxDiscount,
        maxUses,
        isActive,
        validFrom,
        validUntil,
        description,
        waiveShipping,
      } = parsed.data;

      await dbConnect();

      // Check if code already exists
      const existingCode = await Promo.findOne({ code: code.toUpperCase().trim() });
      if (existingCode) {
        return NextResponse.json(
          { success: false, error: 'Promo code already exists' },
          { status: 400 }
        );
      }

      const newPromoCode = new Promo({
        code: code.toUpperCase().trim(),
        discountType: type,
        discountValue: discount || 0,
        minimumOrder: minAmount || 0,
        maximumDiscount: maxDiscount ?? undefined,
        usageLimit: maxUses || null,
        usedCount: 0,
        isActive: isActive !== false,
        // The admin form has always had a "valid from" picker; until now the API
        // threw the value away, so every scheduled campaign went live instantly.
        startsAt: startOfSelectedDay(validFrom),
        expiresAt: endOfSelectedDay(validUntil),
        description: description || '',
        waiveShipping: waiveShipping || false
      });

      await newPromoCode.save();

      logger.info('✅ Mongoose created promo transaction:', newPromoCode.code);

      return NextResponse.json({
        success: true,
        message: 'Promo code created successfully',
        promoCode: {
          _id: newPromoCode._id,
          code: newPromoCode.code,
          discount: newPromoCode.discountValue,
          type: newPromoCode.discountType,
          minAmount: newPromoCode.minimumOrder,
          maxUses: newPromoCode.usageLimit,
          currentUses: newPromoCode.usedCount,
          isActive: newPromoCode.isActive,
          validFrom: newPromoCode.startsAt || newPromoCode.createdAt,
          validUntil: newPromoCode.expiresAt,
          description: newPromoCode.description
        }
      });

  } catch (error: unknown) {
    logger.error('❌ Promo code pipeline error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process promo code request' },
      { status: 500 }
    );
  }
}

// GET - Fetch all promo codes (for admin)
export async function GET(request: NextRequest) {
  // Promo codes are money. This route lives at /api/promo, which no
  // middleware matcher covers, so the check has to happen here.
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    logger.info('📋 Streaming promo matrix records for admin mapping...');

    await dbConnect();

    const promos = await Promo.find({})
      .sort({ createdAt: -1 })
      .limit(100);

    logger.info(`✅ Found ${promos.length} promo blocks`);

    return NextResponse.json({
      success: true,
      promoCodes: promos.map(promo => ({
        _id: promo._id,
        code: promo.code,
        discount: promo.discountValue,
        type: promo.discountType,
        minAmount: promo.minimumOrder,
        maxUses: promo.usageLimit,
        maxDiscount: promo.maximumDiscount ?? null,
        currentUses: promo.usedCount,
        isActive: promo.isActive,
        validFrom: promo.startsAt || promo.createdAt,
        validUntil: promo.expiresAt,
        description: promo.description,
        waiveShipping: promo.waiveShipping || false
      }))
    });

  } catch (error: unknown) {
    logger.error('❌ Streaming fallback failure fetching promo loops:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch promo codes'
      },
      { status: 500 }
    );
  }
}

