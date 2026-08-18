import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import { orderQueries } from '@/order/queries';
import { invalidateProductCache } from '../lib/cache';
import { revalidateProducts } from '@/product/tags';
import { resolveVariantName } from './orderCreationService';
import { reserveStock, releaseStock, InsufficientStockError, StockLine } from '@/product/inventory';
import { incrementPromoUsage, releasePromoUsage, PromoLimitError } from './promoService';

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
 * The Arabic wording an admin sees when re-reserving stock fails.
 *
 * `reserveStock` throws in English because the customer checkout is English and
 * reads it thousands of times more often. The admin panel is Arabic, so the
 * sentence is rebuilt here from the error's `productName` / `variantName`
 * fields rather than by translating a string after the fact.
 *
 * A promo-limit refusal already arrives Arabic from `reclaimPromoUsage`, so it
 * is passed through untouched.
 */
function adminStockMessage(error: InsufficientStockError): string {
  if (!error.productName) return error.message;

  const product = error.variantName
    ? `"${error.productName}" (${error.variantName})`
    : `"${error.productName}"`;

  return `مش ممكن نرجّع الأوردر ده: الكمية المطلوبة من ${product} مش متوفرة في المخزون دلوقتي. راجع المخزون وحاول تاني.`;
}

/**
 * Re-claims the promo use that cancelling this order gave back.
 *
 * Allowed to fail the whole status change, exactly as insufficient stock is: if
 * the campaign filled up while the order sat cancelled, letting it through would
 * push `usedCount` past `usageLimit` — the precise over-redemption the atomic
 * claim exists to prevent. Recoverable by hand: the admin raises the limit and
 * tries again.
 *
 * Reported as InsufficientStockError so the route answers 409 ("something moved
 * on, look at it") rather than 500 ("we broke").
 */
async function reclaimPromoUsage(promoCode: string | undefined, session: mongoose.ClientSession) {
  if (!promoCode) return;

  try {
    await incrementPromoUsage(promoCode, session);
  } catch (error) {
    if (error instanceof PromoLimitError) {
      throw new InsufficientStockError(
        `كود الخصم "${promoCode}" وصل للحد الأقصى لعدد مرات استخدامه، فمش ممكن نرجّع الأوردر ده. ارفع الحد الأقصى للكود الأول وجرب تاني.`
      );
    }
    throw error;
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

      order = await orderQueries.findById(orderId, session);
      if (!order) return;

      // Idempotency guard — the whole point of the flag. The promo use rides on
      // the same flag as the stock, so a cancelled order gives back both exactly
      // once, in the same transaction.
      if (!order.stockRestored) {
        (await releaseStock(toStockLines(order.products), session)).forEach(id => touched.add(id));
        await releasePromoUsage(order.promoCode, session);
        order.stockRestored = true;
      }

      if (options.newStatus) order.status = options.newStatus;
      await orderQueries.save(order, session);
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

      order = await orderQueries.findById(orderId, session);
      if (!order) return;

      // Only re-reserve what was actually released.
      if (order.stockRestored) {
        (await reserveStock(toStockLines(order.products), session)).forEach(id => touched.add(id));

        await reclaimPromoUsage(order.promoCode, session);

        order.stockRestored = false;
      }

      order.status = newStatus;
      await orderQueries.save(order, session);
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
    // This message is read by an ADMIN, and the admin panel is Arabic. The
    // inventory module's own wording is English because it is read by customers
    // many times more often, so it is rebuilt here from the error's fields.
    return { success: false as const, error: insufficient ? adminStockMessage(error) : error.message, insufficient };
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

      const order = await orderQueries.findById(orderId, session);
      if (!order) return;
      found = true;

      // Deleting destroys the record, so this is the last chance to give the
      // campaign its use back. Guarded by the same flag as the stock so an
      // already-cancelled order is not credited twice.
      if (!order.stockRestored) {
        (await releaseStock(toStockLines(order.products), session)).forEach(id => touched.add(id));
        await releasePromoUsage(order.promoCode, session);
      }

      await orderQueries.deleteById(orderId, session);
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
