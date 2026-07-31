import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import Order from '../models/order';
import { invalidateProductCache } from '../lib/cache';
import { revalidateProducts } from '../lib/product-tags';
import { resolveVariantName } from './orderCreationService';
import { reserveStock, releaseStock, InsufficientStockError, StockLine } from './inventory.service';

/**
 * Stock restoration for cancelled and deleted orders.
 *
 * Before this existed, nothing in the codebase ever incremented stock: every
 * cancelled order permanently burned the inventory it had reserved. Over months
 * that drift alone accounts for a large share of "stock is wrong" reports.
 *
 * `order.stockRestored` is the idempotency guard. It must be flipped inside the
 * same transaction as the $inc, so a retry can never double-restock.
 */

/**
 * An order line item can carry the variant as variantName (new), variant.name,
 * or size (legacy). Orders written before variantName existed only have `size`.
 */
function toStockLines(products: any[]): StockLine[] {
  return (products || []).map((line: any) => ({
    productId: line.productId,
    variantName: line.variantName ?? resolveVariantName(line),
    quantity: Number(line.quantity) || 0,
    name: line.name,
  }));
}

export { InsufficientStockError };

/**
 * Cancels an order and returns its stock, atomically and idempotently.
 * Safe to call on an order that was already restored — it becomes a no-op.
 */
export async function restoreStockForOrder(orderId: string, options: { newStatus?: string } = {}) {
  await dbConnect();
  const session = await mongoose.startSession();
  const touched = new Set<string>();

  try {
    let order: any;

    await session.withTransaction(async () => {
      touched.clear();

      order = await Order.findById(orderId).session(session);
      if (!order) return;

      // Idempotency guard — the whole point of the flag.
      if (!order.stockRestored) {
        (await releaseStock(toStockLines(order.products), session)).forEach(id => touched.add(id));
        order.stockRestored = true;
      }

      if (options.newStatus) order.status = options.newStatus;
      await order.save({ session });
    });

    if (!order) return { success: false, notFound: true as const };

    for (const productId of touched) {
      invalidateProductCache(productId);
      await revalidateProducts(productId);
    }
    return { success: true as const, order };
  } catch (error: any) {
    console.error('❌ [StockRestoration] Failed to restore stock:', error.message);
    return { success: false as const, error: error.message };
  } finally {
    await session.endSession();
  }
}

/**
 * Moves an order out of `cancelled`, re-reserving its stock.
 * Fails the status change outright if inventory can no longer cover it.
 */
export async function reapplyStockForOrder(orderId: string, newStatus: string) {
  await dbConnect();
  const session = await mongoose.startSession();
  const touched = new Set<string>();

  try {
    let order: any;

    await session.withTransaction(async () => {
      touched.clear();

      order = await Order.findById(orderId).session(session);
      if (!order) return;

      // Only re-reserve what was actually released.
      if (order.stockRestored) {
        (await reserveStock(toStockLines(order.products), session)).forEach(id => touched.add(id));
        order.stockRestored = false;
      }

      order.status = newStatus;
      await order.save({ session });
    });

    if (!order) return { success: false as const, notFound: true as const };

    for (const productId of touched) {
      invalidateProductCache(productId);
      await revalidateProducts(productId);
    }
    return { success: true as const, order };
  } catch (error: any) {
    const insufficient = error instanceof InsufficientStockError;
    if (!insufficient) console.error('❌ [StockRestoration] Failed to re-reserve stock:', error.message);
    return { success: false as const, error: error.message, insufficient };
  } finally {
    await session.endSession();
  }
}

/**
 * Deletes an order, returning its stock first if it was still holding any.
 */
export async function deleteOrderWithStockRestoration(orderId: string) {
  await dbConnect();
  const session = await mongoose.startSession();
  const touched = new Set<string>();

  try {
    let found = false;

    await session.withTransaction(async () => {
      touched.clear();

      const order = await Order.findById(orderId).session(session);
      if (!order) return;
      found = true;

      if (!order.stockRestored) {
        (await releaseStock(toStockLines(order.products), session)).forEach(id => touched.add(id));
      }

      await Order.deleteOne({ _id: orderId }).session(session);
    });

    if (!found) return { success: false as const, notFound: true as const };

    for (const productId of touched) {
      invalidateProductCache(productId);
      await revalidateProducts(productId);
    }
    return { success: true as const };
  } catch (error: any) {
    console.error('❌ [StockRestoration] Failed to delete order with restock:', error.message);
    return { success: false as const, error: error.message };
  } finally {
    await session.endSession();
  }
}
