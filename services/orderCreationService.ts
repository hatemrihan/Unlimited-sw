import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import Order, { IOrder } from '../models/order';
import { invalidateProductCache } from '../lib/cache';
import { revalidateProducts } from '../lib/product-tags';
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
 * Rewrites legacy/static product ids in an order payload to the real MongoDB id,
 * matching on product name exactly as the cart's client-side migration does.
 *
 * Without this, a customer whose cart still holds a pre-migration id has their
 * order rejected outright. With it, the common case (the product still exists
 * under the same name) just works, and only a genuinely unresolvable line is
 * refused. Mutates `orderData.products` in place and returns the lines it could
 * not resolve.
 */
export async function resolveLegacyProductIds(orderData: any): Promise<any[]> {
  const legacyLines = (orderData?.products || []).filter((p: any) => !isValidProductId(p.productId));
  if (legacyLines.length === 0) return [];

  await dbConnect();
  const Product = (await import('../models/product')).default;

  const candidates = await Product.find(
    { name: { $in: legacyLines.map((p: any) => p.name).filter(Boolean) } },
    { _id: 1, name: 1 }
  ).lean();

  // Count names so an ambiguous match is never guessed at.
  const byName = new Map<string, any[]>();
  for (const candidate of candidates as any[]) {
    const key = String(candidate.name || '').trim().toLowerCase();
    byName.set(key, [...(byName.get(key) || []), candidate]);
  }

  const unresolved: any[] = [];

  for (const line of legacyLines) {
    const matches = byName.get(String(line.name || '').trim().toLowerCase()) || [];
    if (matches.length === 1) {
      console.warn(`ℹ️ [OrderService] Migrated legacy product id "${line.productId}" → ${matches[0]._id} by name ("${line.name}").`);
      line.productId = String(matches[0]._id);
    } else {
      unresolved.push(line);
    }
  }

  return unresolved;
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
      // 🛡️ A non-MongoDB ID (legacy static fallback product) cannot have its
      // stock tracked. Static fallbacks are gone, so such an ID now means a
      // stale cart, not a real product — reject rather than sell untracked
      // inventory the warehouse doesn't know about.
      for (const orderProduct of orderData.products) {
        if (!isValidProductId(orderProduct.productId)) {
          console.warn(`⚠️ [OrderService] Rejecting order: legacy/static product ID "${orderProduct.productId}" (${orderProduct.name}) is not in MongoDB.`);
          throw new Error(`المنتج ${orderProduct.name} مش متاح للطلب دلوقتي. من فضلك حدّث الصفحة والسلة وجرب تاني.`);
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
      invalidateProductCache(productId);          // this instance
      await revalidateProducts(productId);        // every other instance
    }

    return { success: true, savedOrder };
  } catch (error: any) {
    console.error('❌ الأوردر اتلغى بسبب مشكلة في الستوك:', error.message);
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
  }
}
