import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import { requireAdmin } from '../../../../lib/requireAdmin';
import { deleteOrderWithStockRestoration } from '../../../../services/stockRestorationService';
import { sellsFromSupabase } from '@/shopdb/client';
import { movedToDashboard } from '@/shopdb/moved';

/**
 * Only DELETE lives here. The PATCH that changed an order's status was removed
 * on 30 Oct 2026: status is followed on WhatsApp, and every order in the
 * database had sat at `pending` since the shop opened. Deleting an order is
 * what gives its stock back.
 */

/**
 * A malformed id used to reach `Order.findById`, throw a Mongoose CastError, and
 * come back to the admin as a 500 "Failed to update order" — which reads as "the
 * server is broken" when it means "that is not an order id".
 */
function isValidOrderId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

const INVALID_ID_RESPONSE = NextResponse.json(
  { success: false, error: 'That is not a valid order id.' },
  { status: 400 }
);

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    // After the move this lives in the dashboard (decision 16 Oct 2026).
    if (sellsFromSupabase()) return movedToDashboard('Shop orders');
    const params = await context.params;
    const { id } = params;

    if (!isValidOrderId(id)) return INVALID_ID_RESPONSE.clone();

    await dbConnect();

    // Deleting an order that still holds stock must return it first, or the
    // inventory is burned with no record left to reconcile against.
    const result = await deleteOrderWithStockRestoration(id);

    if (result.notFound) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to delete order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error: unknown) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
