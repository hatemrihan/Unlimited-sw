import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import Order, { IOrder } from '../models/order';
import { invalidateProductCache } from '../lib/cache';
import { reserveStock, isValidProductId } from './inventory.service';

/**
 * Resolves the variant name for an order line item.
 *
 * Checkout flattens the variant into `size`/`color`, while newer clients send an
 * explicit `variant` object. Accept both — the `??` fallback is a permanent
 * safety net for cached bundles and in-flight carts, not a temporary shim.
 */
export function resolveVariantName(orderProduct: any): string | undefined {
  return orderProduct?.variant?.name ?? orderProduct?.size ?? undefined;
}

/**
 * Executes the Order creation and Stock decrement completely inside a unified
 * database Transaction boundaries guaranteeing all-or-nothing execution without
 * manual rollback drift.
 */
export async function createOrderTransaction(orderData: any, newOrder: Partial<IOrder>, promoDiscount: number) {
  await dbConnect();

  // Establish standard session wrapper preventing manual drift
  const session = await mongoose.startSession();
  const touchedProductIds = new Set<string>();

  try {
    let savedOrder: any;

    // Mount the operation sequence natively via withTransaction protecting concurrent threads
    await session.withTransaction(async () => {
      // withTransaction may re-run this body after a transient error, so never
      // let bookkeeping accumulate across attempts.
      touchedProductIds.clear();

      // 1. Reserve stock for every line, structurally locked inside the session.
      // 🛡️ Non-MongoDB IDs (legacy static fallback products) are skipped: they
      // don't exist in the database, so querying them would crash. The order
      // still completes — we just can't track stock for items not in MongoDB.
      for (const orderProduct of orderData.products) {
        if (!isValidProductId(orderProduct.productId)) {
          console.warn(`⚠️ [OrderService] Skipping stock decrement for legacy/static product ID: "${orderProduct.productId}" (${orderProduct.name}). This item is not in MongoDB.`);
        }
      }

      const reserved = await reserveStock(
        orderData.products.map((p: any) => ({
          productId: p.productId,
          variantName: resolveVariantName(p),
          quantity: p.quantity,
          name: p.name,
        })),
        session
      );
      reserved.forEach(id => touchedProductIds.add(id));

      // 2. Commit Order Payload identically across the session
      const [order] = await Order.create([newOrder], { session });
      savedOrder = order;

      // 3. Complete internal native hooks safely without wire delays
      if (promoDiscount > 0 && orderData.promoCode) {
        const Promo = (await import('../models/promo')).default;
        await Promo.findOneAndUpdate(
          { code: orderData.promoCode.toUpperCase().trim() },
          { $inc: { usedCount: 1 } },
          { session }
        );
      }
    });

    // 4. The transaction committed, so every cached copy of these products is stale.
    // Invalidate now, otherwise the storefront advertises sold-out stock for minutes.
    for (const productId of touchedProductIds) {
      invalidateProductCache(productId);
    }

    return { success: true, savedOrder };
  } catch (error: any) {
    console.error('❌ الأوردر اتلغى بسبب مشكلة في الستوك:', error.message);
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
  }
}
