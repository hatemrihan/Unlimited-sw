import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import Order from '../models/order';
import Product from '../models/product';
import { invalidateProductCache } from '../lib/cache';
import { resolveVariantName } from './orderCreationService';

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

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

/** An order line item can carry the variant as variantName (new), variant.name, or size (legacy). */
function lineVariantName(line: any): string | undefined {
  return line?.variantName ?? resolveVariantName(line);
}

export class InsufficientStockError extends Error {}

/**
 * Returns each line item's quantity to inventory inside `session`.
 * Does not touch the order document — the caller owns that.
 */
async function incrementStock(products: any[], session: mongoose.ClientSession, touched: Set<string>) {
  for (const line of products) {
    const productId = line.productId;
    if (!isValidObjectId(productId)) {
      console.warn(`⚠️ [StockRestoration] Cannot restock legacy/static product ID "${productId}" (${line.name}).`);
      continue;
    }

    const quantity = Number(line.quantity) || 0;
    if (quantity <= 0) continue;

    const variantName = lineVariantName(line);

    if (variantName) {
      const result = await Product.findOneAndUpdate(
        { _id: productId, variants: { $elemMatch: { name: variantName } } },
        { $inc: { 'variants.$.stock': quantity, stock: quantity } },
        { new: true, session }
      );

      // The variant was renamed or removed since the order was placed. Restoring
      // it to the wrong element would be worse than not restoring it, so log and
      // let the admin reconcile by hand.
      if (!result) {
        console.warn(`⚠️ [StockRestoration] Variant "${variantName}" no longer exists on product ${productId} (${line.name}). ${quantity} unit(s) NOT restocked — reconcile manually.`);
        continue;
      }
    } else {
      const result = await Product.findOneAndUpdate(
        { _id: productId },
        { $inc: { stock: quantity } },
        { new: true, session }
      );

      if (!result) {
        console.warn(`⚠️ [StockRestoration] Product ${productId} (${line.name}) no longer exists. ${quantity} unit(s) NOT restocked.`);
        continue;
      }
    }

    touched.add(String(productId));
  }
}

/**
 * Takes each line item's quantity back out of inventory inside `session`.
 * Throws InsufficientStockError if any line cannot be covered, which aborts the
 * whole transaction — a status revert must never oversell.
 */
async function decrementStock(products: any[], session: mongoose.ClientSession, touched: Set<string>) {
  for (const line of products) {
    const productId = line.productId;
    if (!isValidObjectId(productId)) continue;

    const quantity = Number(line.quantity) || 0;
    if (quantity <= 0) continue;

    const variantName = lineVariantName(line);

    const result = variantName
      ? await Product.findOneAndUpdate(
          { _id: productId, variants: { $elemMatch: { name: variantName, stock: { $gte: quantity } } } },
          { $inc: { 'variants.$.stock': -quantity, stock: -quantity } },
          { new: true, session }
        )
      : await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true, session }
        );

    if (!result) {
      throw new InsufficientStockError(
        `Not enough stock to un-cancel this order: ${line.name}${variantName ? ` (${variantName})` : ''} needs ${quantity}.`
      );
    }

    touched.add(String(productId));
  }
}

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
        await incrementStock(order.products, session, touched);
        order.stockRestored = true;
      }

      if (options.newStatus) order.status = options.newStatus;
      await order.save({ session });
    });

    if (!order) return { success: false, notFound: true as const };

    for (const productId of touched) invalidateProductCache(productId);
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
        await decrementStock(order.products, session, touched);
        order.stockRestored = false;
      }

      order.status = newStatus;
      await order.save({ session });
    });

    if (!order) return { success: false as const, notFound: true as const };

    for (const productId of touched) invalidateProductCache(productId);
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
        await incrementStock(order.products, session, touched);
      }

      await Order.deleteOne({ _id: orderId }).session(session);
    });

    if (!found) return { success: false as const, notFound: true as const };

    for (const productId of touched) invalidateProductCache(productId);
    return { success: true as const };
  } catch (error: any) {
    console.error('❌ [StockRestoration] Failed to delete order with restock:', error.message);
    return { success: false as const, error: error.message };
  } finally {
    await session.endSession();
  }
}
