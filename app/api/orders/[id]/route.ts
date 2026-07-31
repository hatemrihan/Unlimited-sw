import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Order from '../../../../models/order';
import { requireAdmin } from '../../../../lib/requireAdmin';
import {
  restoreStockForOrder,
  reapplyStockForOrder,
  deleteOrderWithStockRestoration,
} from '../../../../services/stockRestorationService';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const params = await context.params;
    const { id } = params;

    await dbConnect();

    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const existing = await Order.findById(id).select('status stockRestored');
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Cancelling releases the reserved stock; un-cancelling re-reserves it.
    // Both run inside a transaction that also writes the new status, so the
    // order's status and the inventory can never disagree.
    if (status === 'cancelled' && existing.status !== 'cancelled') {
      const result = await restoreStockForOrder(id, { newStatus: status });
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to cancel order and restore stock' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, order: result.order });
    }

    if (status !== 'cancelled' && existing.status === 'cancelled') {
      const result = await reapplyStockForOrder(id, status);
      if (!result.success) {
        // 409: the admin needs to know inventory moved on, not that we failed.
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to re-reserve stock for this order' },
          { status: result.insufficient ? 409 : 500 }
        );
      }
      return NextResponse.json({ success: true, order: result.order });
    }

    // Status change with no inventory consequence.
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });

  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const params = await context.params;
    const { id } = params;

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
