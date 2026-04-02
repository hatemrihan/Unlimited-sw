import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Promo from '../../../models/promo';
import { logger } from '../../../utils/logger';

// POST - Create new promo code (admin) or validate promo code (frontend)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Pure Creation pipeline isolated from previous Validation loops
    logger.info('📝 Creating new isolated promo code payload natively...');

      const { code, discount, type, minAmount, maxUses, isActive, validFrom, validUntil, description, waiveShipping } = body;

      if (!code || (!discount && !waiveShipping)) {
        return NextResponse.json(
          { success: false, error: 'Code and discount (or shipping waiver) are required' },
          { status: 400 }
        );
      }

      await dbConnect();

      // Check if code already exists
      const existingCode = await Promo.findOne({ code: code.toUpperCase().trim() });
      if (existingCode) {
        return NextResponse.json(
          { success: false, error: 'Promo code already exists' },
          { status: 400 }
        );
      }

      // Set expiry date to END of the selected day (23:59:59)
      // This means if you select Nov 21, it expires at Nov 21 at 11:59:59 PM
      let expiryDate = null;
      if (validUntil) {
        expiryDate = new Date(validUntil);
        expiryDate.setHours(23, 59, 59, 999); // End of day
      }

      const newPromoCode = new Promo({
        code: code.toUpperCase().trim(),
        discountType: type,
        discountValue: discount || 0,
        minimumOrder: minAmount || 0,
        usageLimit: maxUses || null,
        usedCount: 0,
        isActive: isActive !== false,
        expiresAt: expiryDate,
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
          validFrom: newPromoCode.createdAt,
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
        currentUses: promo.usedCount,
        isActive: promo.isActive,
        validFrom: promo.createdAt,
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

