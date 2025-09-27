import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Promo from '../../../models/promo';

// POST - Create new promo code (admin) or validate promo code (frontend)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a validation request (has orderTotal) or creation request
    if (body.orderTotal !== undefined) {
      // This is a validation request from frontend
      console.log('🎫 Validating promo code...');

      const { code, orderTotal } = body;

      if (!code || !code.trim()) {
        return NextResponse.json(
          { success: false, error: 'Promo code is required' },
          { status: 400 }
        );
      }

      await dbConnect();

      const promoCode = await Promo.findOne({
        code: code.toUpperCase().trim(),
        isActive: true
      });

      if (!promoCode) {
        return NextResponse.json(
          { success: false, error: 'Invalid promo code' },
          { status: 400 }
        );
      }

      // Check if expired
      if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Promo code has expired' },
          { status: 400 }
        );
      }

      // Check usage limit
      if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
        return NextResponse.json(
          { success: false, error: 'Promo code usage limit exceeded' },
          { status: 400 }
        );
      }

      // Check minimum order
      if (promoCode.minimumOrder && orderTotal < promoCode.minimumOrder) {
        return NextResponse.json(
          {
            success: false,
            error: `Minimum order of L.E ${promoCode.minimumOrder} required`
          },
          { status: 400 }
        );
      }

      // Calculate discount
      let discount = 0;
      if (promoCode.discountType === 'percentage') {
        discount = (orderTotal * promoCode.discountValue) / 100;
        if (promoCode.maximumDiscount && discount > promoCode.maximumDiscount) {
          discount = promoCode.maximumDiscount;
        }
      } else {
        discount = promoCode.discountValue;
      }

      console.log('✅ Promo code validated:', {
        code: promoCode.code,
        discount: discount,
        type: promoCode.discountType
      });

      return NextResponse.json({
        success: true,
        promo: {
          code: promoCode.code,
          discountType: promoCode.discountType,
          discountValue: promoCode.discountValue,
          discount: discount,
          description: promoCode.description,
          waiveShippingAndCOD: promoCode.waiveShippingAndCOD || false
        }
      });
    } else {
      // This is a creation request from admin
      console.log('📝 Creating new promo code...');

      const { code, discount, type, minAmount, maxUses, isActive, validFrom, validUntil, description, waiveShippingAndCOD } = body;

      if (!code || (!discount && !waiveShippingAndCOD)) {
        return NextResponse.json(
          { success: false, error: 'Code and discount (or fee waiver) are required' },
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

      const newPromoCode = new Promo({
        code: code.toUpperCase().trim(),
        discountType: type,
        discountValue: discount || 0,
        minimumOrder: minAmount || 0,
        usageLimit: maxUses || null,
        usedCount: 0,
        isActive: isActive !== false,
        expiresAt: validUntil ? new Date(validUntil) : null,
        description: description || '',
        waiveShippingAndCOD: waiveShippingAndCOD || false
      });

      await newPromoCode.save();

      console.log('✅ Created promo code:', newPromoCode.code);

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
    }

  } catch (error: unknown) {
    console.error('❌ Promo code error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process promo code request' },
      { status: 500 }
    );
  }
}

// GET - Fetch all promo codes (for admin)
export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching promo codes for admin...');

    await dbConnect();

    const promos = await Promo.find({})
      .sort({ createdAt: -1 })
      .limit(100);

    console.log(`✅ Found ${promos.length} promo codes`);

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
        waiveShippingAndCOD: promo.waiveShippingAndCOD || false
      }))
    });

  } catch (error: unknown) {
    console.error('❌ Error fetching promo codes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch promo codes'
      },
      { status: 500 }
    );
  }
}

