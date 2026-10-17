import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Product from '@/product/model';
import { sellsFromSupabase } from '@/shopdb/client';
import { adjustStock as shopAdjustStock, SupabaseProductQueries } from '@/shopdb/products';

/**
 * The inventory module — the ONLY place in the codebase that issues a $inc on
 * stock. That single rule is what keeps inventory correct as the code grows.
 *
 * Everything else (order creation, cancellation, admin adjustment, cart and
 * checkout availability reads) calls one of the four functions below.
 *
 * Invariants enforced here:
 *  - a variant decrement always binds name AND stock to the same array element
 *    via $elemMatch, so it can never debit a sibling variant;
 *  - a variant decrement always moves the denormalized product.stock mirror by
 *    the same amount, in the same atomic update;
 *  - stock can never go negative through reserveStock or adjustStock.
 */

export interface StockLine {
  productId: string;
  /** Variant to move. Omit for products with no variants. */
  variantName?: string;
  quantity: number;
  /** For error messages only. */
  name?: string;
}

/**
 * Raised when a line cannot be covered by stock.
 *
 * Carries the product and variant as FIELDS, not only baked into the message,
 * because this error is read by two different audiences in two different
 * languages: a customer placing an order (the storefront is English) and an
 * admin un-cancelling one (the admin panel is Arabic). Each side formats its own
 * sentence from these fields; the `message` is the English default.
 */
export class InsufficientStockError extends Error {
  constructor(
    message: string,
    public readonly productName?: string,
    public readonly variantName?: string
  ) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

export class StockConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockConflictError';
  }
}

export function isValidProductId(id: unknown): boolean {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

/**
 * Takes stock out of inventory for each line, atomically.
 * Throws InsufficientStockError on the first line that cannot be covered, which
 * aborts the caller's transaction and leaves inventory untouched.
 *
 * Returns the ids of the products actually moved, for cache invalidation.
 */
export async function reserveStock(
  lines: StockLine[],
  session: mongoose.ClientSession
): Promise<string[]> {
  const touched = new Set<string>();

  for (const line of lines) {
    if (!isValidProductId(line.productId)) continue;

    const quantity = Number(line.quantity) || 0;
    if (quantity <= 0) continue;

    const label = line.name || 'that item';

    const updated = line.variantName
      ? await Product.findOneAndUpdate(
          {
            _id: line.productId,
            // $elemMatch binds both conditions to the SAME element. Without it,
            // `variants.name` can match one variant while `variants.stock` is
            // satisfied by another, selling an out-of-stock variant.
            variants: { $elemMatch: { name: line.variantName, stock: { $gte: quantity } } },
          },
          { $inc: { 'variants.$.stock': -quantity, stock: -quantity } },
          { new: true, session }
        )
      : await Product.findOneAndUpdate(
          { _id: line.productId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true, session }
        );

    if (!updated) {
      // English by default — the storefront is English, and this is read by a
      // customer far more often than by an admin. The admin path re-words it in
      // Arabic from the fields below.
      throw new InsufficientStockError(
        line.variantName
          ? `Sorry — ${label} (${line.variantName}) just sold out. Someone ordered it seconds before you.`
          : `Sorry — ${label} just sold out. Someone ordered it seconds before you.`,
        line.name,
        line.variantName
      );
    }

    touched.add(String(line.productId));
  }

  return [...touched];
}

/**
 * Puts stock back, atomically. Never fails on a missing product or a renamed
 * variant — a cancellation must always be able to complete — but says so loudly
 * so the discrepancy can be reconciled by hand.
 *
 * Idempotency is the caller's job, via the order.stockRestored flag.
 */
export async function releaseStock(
  lines: StockLine[],
  session: mongoose.ClientSession
): Promise<string[]> {
  const touched = new Set<string>();

  for (const line of lines) {
    if (!isValidProductId(line.productId)) {
      console.warn(`⚠️ [inventory] Cannot restock legacy/static product ID "${line.productId}" (${line.name || ''}).`);
      continue;
    }

    const quantity = Number(line.quantity) || 0;
    if (quantity <= 0) continue;

    const updated = line.variantName
      ? await Product.findOneAndUpdate(
          { _id: line.productId, variants: { $elemMatch: { name: line.variantName } } },
          { $inc: { 'variants.$.stock': quantity, stock: quantity } },
          { new: true, session }
        )
      : await Product.findOneAndUpdate(
          { _id: line.productId },
          { $inc: { stock: quantity } },
          { new: true, session }
        );

    if (!updated) {
      // Crediting the wrong element would be worse than not crediting at all.
      console.warn(
        `⚠️ [inventory] ${line.variantName ? `Variant "${line.variantName}" of ` : ''}product ${line.productId} (${line.name || ''}) no longer exists. ${quantity} unit(s) NOT restocked — reconcile manually.`
      );
      continue;
    }

    touched.add(String(line.productId));
  }

  return [...touched];
}

export interface ProductAvailability {
  productId: string;
  stock: number;
  variants: Array<{ name: string; stock: number }>;
  isActive: boolean;
}

/**
 * The canonical, uncached availability read used by cart and checkout.
 * Deliberately bypasses every cache — a cached stock number is a wrong one.
 */
export async function getAvailability(
  productIds: string[]
): Promise<Record<string, ProductAvailability>> {
  // After the move (SHOP_DB=supabase) stock lives in Supabase. Keyed by the
  // id the storefront asked with, old Mongo id or new uuid.
  if (sellsFromSupabase()) {
    const products = await new SupabaseProductQueries().findByIds(productIds);
    const result: Record<string, ProductAvailability> = {};
    for (const product of products) {
      const id = String(product._id);
      result[id] = {
        productId: id,
        stock: Number(product.stock) || 0,
        variants: (product.variants || []).map(v => ({ name: v.name, stock: Number(v.stock) || 0 })),
        isActive: product.isActive !== false,
      };
    }
    return result;
  }

  await dbConnect();

  const ids = productIds.filter(isValidProductId);
  if (ids.length === 0) return {};

  const products = await Product.find(
    { _id: { $in: ids } },
    { _id: 1, stock: 1, variants: 1, isActive: 1 }
  ).lean();

  const result: Record<string, ProductAvailability> = {};

  for (const product of products as any[]) {
    const id = String(product._id);
    result[id] = {
      productId: id,
      stock: Number(product.stock) || 0,
      variants: (product.variants || []).map((v: any) => ({
        name: v.name,
        stock: Number(v.stock) || 0,
      })),
      isActive: product.isActive !== false,
    };
  }

  return result;
}

/**
 * Admin stock adjustment.
 *
 * Two modes, both safe against the lost-update problem that a whole-document
 * PUT has:
 *  - `{ delta }`   — relative $inc, refuses to drive stock below zero;
 *  - `{ expected, next }` — optimistic lock; throws StockConflictError if the
 *    value changed since the admin's page loaded, so the UI can say
 *    "stock changed, reload" instead of silently erasing an order.
 */
/**
 * After the move (SHOP_DB=supabase): the database's stock door. The same two
 * modes, the same optimistic lock, the same StockConflictError for the
 * route's 409 — and an activity-log row for every edit.
 */
async function adjustStockInSupabase(
  productId: string,
  variantName: string | undefined,
  change: { delta: number } | { expected: number; next: number }
): Promise<ProductAvailability> {
  const where = variantName ? ` (variant "${variantName}")` : '';
  try {
    await shopAdjustStock(productId, { variantName: variantName ?? null, ...change });
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    if (code.startsWith('STOCK_CONFLICT')) {
      throw new StockConflictError(`Stock changed since this page was loaded${where}. Reload and try again.`);
    }
    if (code.startsWith('OUT_OF_STOCK')) throw new StockConflictError(`Not enough stock to apply that change${where}.`);
    throw e;
  }
  const row = (await getAvailability([productId]))[productId];
  if (!row) throw new StockConflictError(`Invalid product id: ${productId}`);
  return row;
}

export async function adjustStock(
  productId: string,
  variantName: string | undefined,
  change: { delta: number } | { expected: number; next: number }
): Promise<ProductAvailability> {
  if (sellsFromSupabase()) return adjustStockInSupabase(productId, variantName, change);

  await dbConnect();

  if (!isValidProductId(productId)) {
    throw new StockConflictError(`Invalid product id: ${productId}`);
  }

  const isDelta = 'delta' in change;

  if (isDelta && !Number.isFinite(change.delta)) {
    throw new StockConflictError('delta must be a finite number');
  }
  if (!isDelta && (!Number.isFinite(change.next) || change.next < 0)) {
    throw new StockConflictError('next must be a non-negative number');
  }

  let updated: any;

  if (variantName) {
    updated = isDelta
      ? await Product.findOneAndUpdate(
          {
            _id: productId,
            // For a decrement, require enough stock on that exact element.
            variants: {
              $elemMatch:
                change.delta < 0
                  ? { name: variantName, stock: { $gte: -change.delta } }
                  : { name: variantName },
            },
          },
          { $inc: { 'variants.$.stock': change.delta, stock: change.delta } },
          { new: true }
        )
      : await Product.findOneAndUpdate(
          { _id: productId, variants: { $elemMatch: { name: variantName, stock: change.expected } } },
          {
            $set: { 'variants.$.stock': change.next },
            // Move the mirror by the same amount rather than recomputing it, so
            // a concurrent order on another variant is not clobbered.
            $inc: { stock: change.next - change.expected },
          },
          { new: true }
        );
  } else {
    updated = isDelta
      ? await Product.findOneAndUpdate(
          { _id: productId, ...(change.delta < 0 ? { stock: { $gte: -change.delta } } : {}) },
          { $inc: { stock: change.delta } },
          { new: true }
        )
      : await Product.findOneAndUpdate(
          { _id: productId, stock: change.expected },
          { $set: { stock: change.next } },
          { new: true }
        );
  }

  if (!updated) {
    throw new StockConflictError(
      isDelta
        ? `Not enough stock to apply that change${variantName ? ` to variant "${variantName}"` : ''}.`
        : `Stock changed since this page was loaded${variantName ? ` (variant "${variantName}")` : ''}. Reload and try again.`
    );
  }

  return {
    productId: String(updated._id),
    stock: Number(updated.stock) || 0,
    variants: (updated.variants || []).map((v: any) => ({ name: v.name, stock: Number(v.stock) || 0 })),
    isActive: updated.isActive !== false,
  };
}
