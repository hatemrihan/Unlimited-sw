import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import Order, { IOrder } from '../models/order';
import Product from '../models/product';
import { invalidateProductCache } from '../lib/cache';

/**
 * Validates whether a string is a valid MongoDB ObjectId (24-char hex).
 * Used to guard against legacy static IDs like "static-product-1" that
 * would crash Mongoose queries expecting real ObjectIds.
 */
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

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

      // 1. Validate and deduct stock for each product structurally locked inside the session
      for (const orderProduct of orderData.products) {
        const productId = orderProduct.productId;

        // 🛡️ GUARD: Skip stock decrement for non-MongoDB IDs (legacy static fallback products)
        // These IDs (e.g. "static-product-1") don't exist in the database, so querying
        // them would crash with "Cast to ObjectId failed". The order still completes —
        // we just can't track stock for products that aren't in MongoDB.
        if (!isValidObjectId(productId)) {
          console.warn(`⚠️ [OrderService] Skipping stock decrement for legacy/static product ID: "${productId}" (${orderProduct.name}). This item is not in MongoDB.`);
          continue;
        }

        const variantName = resolveVariantName(orderProduct);

        if (variantName) {
          // $elemMatch binds both conditions to the SAME variant element. Without it,
          // `variants.name` can match one element while `variants.stock` is satisfied
          // by a different one — selling an out-of-stock variant and debiting another.
          const updateResult = await Product.findOneAndUpdate(
            {
              _id: productId,
              variants: {
                $elemMatch: { name: variantName, stock: { $gte: orderProduct.quantity } }
              }
            },
            {
              // Keep the denormalized product.stock mirror in lockstep with the
              // variant sum it mirrors, in the same atomic update.
              $inc: {
                'variants.$.stock': -orderProduct.quantity,
                stock: -orderProduct.quantity
              }
            },
            { new: true, session }
          );

          if (!updateResult) {
            throw new Error(`للأسف الكمية المطلوبة من ${orderProduct.name} (${variantName}) مش متوفرة دلوقتي. حد تاني طلبها قبلك بثواني!`);
          }
        } else {
          // Atomic main stock decrement
          const updateResult = await Product.findOneAndUpdate(
            {
              _id: productId,
              stock: { $gte: orderProduct.quantity }
            },
            {
              $inc: { stock: -orderProduct.quantity }
            },
            { new: true, session }
          );

          if (!updateResult) {
            throw new Error(`للأسف ${orderProduct.name} خلصت من الستوك! حد تاني طلبها قبلك بثواني. جرب تاني بعدين أو تواصل معانا.`);
          }
        }

        touchedProductIds.add(String(productId));
      }

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
