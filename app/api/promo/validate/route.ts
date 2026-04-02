import { NextRequest, NextResponse } from 'next/server';
import { validatePromo } from '../../../../services/promoService';
import { logger } from '../../../../utils/logger';

// POST - Pure Validation Endpoint isolating logic from Admin Creation loops
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.orderTotal === undefined) {
      return NextResponse.json(
        { success: false, error: 'Validation endpoint requires orderTotal boundary.' },
        { status: 400 }
      );
    }
    
    logger.info('🎫 Validating nested promo code matrix natively...');
    const { code, orderTotal } = body;
    const result = await validatePromo(code, orderTotal);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    logger.info('✅ Promo validation authorized:', {
      code: result.promo?.code,
      discount: result.promo?.discount,
      type: result.promo?.discountType
    });

    return NextResponse.json(result);

  } catch (error: unknown) {
    logger.error('❌ Promo validation fallback failure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process isolated validation stream.' },
      { status: 500 }
    );
  }
}
