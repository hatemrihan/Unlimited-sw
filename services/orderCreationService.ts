import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import type { IOrder } from '@/order/model';
import { orderQueries } from '@/order/queries';
import { invalidateProductCache } from '../lib/cache';
import { revalidateProducts } from '@/product/tags';
import { reserveStock, isValidProductId } from '@/product/inventory';
import { incrementPromoUsage, assertPerCustomerLimit, PromoLimitError, PromoCustomerLimitError } from './promoService';
import { enqueueOrderEmail } from './pendingEmailService';

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
  const Product = (await import('@/product/model')).default;

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
 * The order already placed under this checkout attempt, or null.
 *
 * Called before any work is done, so a customer whose response was lost gets
 * their original order back instead of a second one. A blank id finds nothing
 * on purpose — orders placed without one store no value at all, and a lookup
 * on `''` or `undefined` must not hand back a stranger's order.
 */
export async function findOrderByClientId(clientOrderId?: string) {
  if (!clientOrderId || !clientOrderId.trim()) return null;

  await dbConnect();
  return orderQueries.findByClientOrderId(clientOrderId.trim());
}

/**
 * Whether this error is the unique index refusing a repeated checkout attempt.
 *
 * Distinguished from every other write failure because it is the one that is
 * not a failure: the customer's order exists, and the right answer is to show
 * it to them. Keyed on `keyPattern` rather than the message so an `orderId`
 * collision — a genuinely different problem, handled by its own retry — is
 * never mistaken for it.
 */
function isDuplicateClientOrderId(error: any): boolean {
  return error?.code === 11000 && Boolean(error?.keyPattern?.clientOrderId);
}

/**
 * Executes the Order creation and Stock decrement completely inside a unified
 * database Transaction boundaries guaranteeing all-or-nothing execution without
 * manual rollback drift.
 */
export async function createOrderTransaction(
  orderData: any,
  newOrder: Partial<IOrder>,
  /** The promo code the SERVER validated and priced, if any. */
  appliedPromoCode?: string
) {
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
          throw new Error(`${orderProduct.name} is not available to order right now. Please refresh the page and your cart, then try again.`);
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
      savedOrder = await orderQueries.create(newOrder, session);

      // 2b. Record that this order owes its customer an email, in the same
      // transaction. Before this, the confirmation existed only as a promise
      // inside the request: if the provider was slow or the function died, the
      // email was lost with nothing anywhere recording that it was owed.
      //
      // Inside the transaction so the two commit together — never an order
      // with no mail owed, never mail owed for an order that rolled back.
      await enqueueOrderEmail(
        savedOrder.orderId,
        {
          order: JSON.parse(JSON.stringify(savedOrder)),
          orderData: JSON.parse(JSON.stringify(orderData)),
        },
        session
      );

      // 3. Claim one use of the promo code, inside the same transaction.
      //
      // This used to be a bare $inc with NO limit condition, so usageLimit was
      // only ever checked while the customer was still filling in the form. Two
      // people racing for the last use of a code both passed that check and both
      // orders committed. incrementPromoUsage enforces the limit inside the
      // update itself, so exactly one of them wins.
      //
      // It is also keyed off the code the SERVER validated and priced, not
      // `promoDiscount > 0`: a code that only waives shipping produces a zero
      // discount, and those were never being counted at all.
      if (appliedPromoCode) {
        try {
          // A "first order only" style code: one phone number, N uses.
          await assertPerCustomerLimit(appliedPromoCode, newOrder.customer?.phone ?? '', session, savedOrder?._id);
          await incrementPromoUsage(appliedPromoCode, session);
        } catch (error) {
          if (error instanceof PromoLimitError) {
            throw new Error(
              `Promo code "${appliedPromoCode}" has reached its usage limit. Please try a different code.`
            );
          }
          if (error instanceof PromoCustomerLimitError) {
            throw new Error(
              `You have already used promo code "${appliedPromoCode}" the maximum number of times. Please remove it to continue.`
            );
          }
          throw error;
        }
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
    // A repeated checkout attempt. The insert was refused by the unique index,
    // which took the whole transaction down with it — so the stock this attempt
    // reserved and the promo use it claimed are already released, with no
    // compensating logic of our own. The caller answers with the order that
    // did get through.
    if (isDuplicateClientOrderId(error)) {
      console.warn(
        `↩️ [OrderService] Repeat of checkout attempt "${newOrder.clientOrderId}" — the first one already placed an order. Nothing reserved.`
      );
      return { success: false, duplicate: true as const, error: 'Duplicate checkout attempt' };
    }

    console.error('❌ [OrderService] Order rolled back:', error.message);
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
  }
}
