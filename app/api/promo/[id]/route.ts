import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Promo from '../../../../models/promo';

// GET - Fetch single promo code by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('📋 Fetching promo code:', id);

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
        currentUses: promoCode.usedCount,
        isActive: promoCode.isActive,
        validFrom: promoCode.createdAt,
        validUntil: promoCode.expiresAt,
        description: promoCode.description
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
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('📝 Updating promo code:', id);

    await dbConnect();

    const updateData = {
      code: body.code,
      discountType: body.type,
      discountValue: body.discount,
      minimumOrder: body.minAmount,
      usageLimit: body.maxUses,
      isActive: body.isActive,
      expiresAt: body.validUntil,
      description: body.description
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
        currentUses: promoCode.usedCount,
        isActive: promoCode.isActive,
        validFrom: promoCode.createdAt,
        validUntil: promoCode.expiresAt,
        description: promoCode.description
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
  try {
    const { id } = await params;
    console.log('🗑️ Deleting promo code:', id);

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
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('🔄 Toggling promo code status:', id);

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
        currentUses: promoCode.usedCount,
        isActive: promoCode.isActive,
        validFrom: promoCode.createdAt,
        validUntil: promoCode.expiresAt,
        description: promoCode.description
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




