import mongoose from 'mongoose';
import { productRepository } from '../repositories/product.repository';
import { apiCache, invalidateProductCache } from '../lib/cache';
import { CACHE_TTL } from '../lib/cache-ttl';
import { cacheKeys } from '../lib/cache-keys';
import { NotFoundError, DatabaseError } from '../lib/errors';
import { CreateProductInput, UpdateProductInput } from '../lib/schemas/product.schema';
import { Product } from '../models/product';
// Static product fallbacks have been permanently removed.
// MongoDB is the ONLY source of truth. If it's down, we show the error — not fake data.

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminProductsResult {
  products: Product[];
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all active products.
 * Cache → MongoDB fallback → write cache.
 */
export async function getActiveProducts(): Promise<Product[]> {
  const cacheKey = cacheKeys.products.all();

  // 1. Fresh cache — fastest path (sub-millisecond)
  const fresh = apiCache.get<Product[]>(cacheKey);
  if (fresh && Array.isArray(fresh)) return fresh;

  // 2. Stale-while-revalidate — serve expired data immediately, refresh in background
  const stale = apiCache.getStale<Product[]>(cacheKey, CACHE_TTL.STALE_GRACE);
  if (stale && Array.isArray(stale)) {
    // Fire-and-forget refresh — user gets stale data with zero wait
    (async () => {
      try {
        const fresh = await productRepository.findAllActive();
        apiCache.set(cacheKey, fresh, CACHE_TTL.PRODUCTS);
      } catch {
        // Silent — stale data continues serving until next successful refresh
      }
    })();
    return stale;
  }

  // 3. Complete cache miss (very first request or after full invalidation) — must hit DB
  try {
    const products = await productRepository.findAllActive();
    apiCache.set(cacheKey, products, CACHE_TTL.PRODUCTS);
    return products;
  } catch (err) {
    console.error('[product.service] MongoDB unavailable:', err instanceof Error ? err.message : String(err));
    throw new DatabaseError(`فشل تحميل المنتجات. جرب تاني بعد شوية.`);
  }
}

/**
 * Returns a paginated, searchable list of products for the admin dashboard.
 */
export async function getAdminProducts(
  search: string,
  page: number,
  limit: number
): Promise<{ products: Product[]; total: number; pages: number; hasNext: boolean; hasPrev: boolean }> {
  const cacheKey = cacheKeys.products.admin(page, limit, search);

  const cached = apiCache.get<AdminProductsResult>(cacheKey);
  if (cached) return cached;

  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      }
    : {};
  const skip  = (page - 1) * limit;

  try {
    const [products, total] = await Promise.all([
      productRepository.findAdminPage(query, skip, limit),
      productRepository.countAdminPage(query),
    ]);

    const result = {
      products,
      total,
      pages:   Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };

    apiCache.set(cacheKey, result, CACHE_TTL.ADMIN);
    return result;
  } catch (err) {
    throw new DatabaseError(`Failed to fetch admin products: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Creates a new product inside a Mongoose transaction.
 * Invalidates product list caches on success.
 */
export async function createProduct(data: CreateProductInput): Promise<any> {
  const finalData: CreateProductInput = (!data.cityPricing || data.cityPricing.length === 0)
    ? {
        ...data,
        cityPricing: [{
          governorate:  'Cairo',
          shippingCost: 50,
          codFee:       25,
          isActive:     true,
        }],
      }
    : data;

  const sess = await mongoose.connection.startSession();
  sess.startTransaction();

  try {
    const product = await productRepository.create(finalData, sess);
    await sess.commitTransaction();
    invalidateProductCache();
    return product;
  } catch (err) {
    await sess.abortTransaction();
    throw new DatabaseError(`Failed to create product: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await sess.endSession();
  }
}

/**
 * Removes every stock field from a product update.
 *
 * The admin edit form posts the entire variants array that the browser loaded
 * minutes earlier, plus a browser-computed total. Writing that back erases any
 * order that decremented stock in between — a classic lost update, and one that
 * silently un-sells real orders.
 *
 * Stock changes go through PATCH /api/admin/products/:id/stock instead, which
 * is optimistically locked. Here we keep whatever the database currently holds,
 * matching variants by name so renames, additions and removals still work.
 */
async function stripStockFromUpdate(id: string, data: UpdateProductInput): Promise<UpdateProductInput> {
  const { stock: _ignoredStock, ...rest } = data as any;

  if (!Array.isArray((rest as any).variants)) {
    return rest as UpdateProductInput;
  }

  const current = await productRepository.findById(id);
  const currentStockByName = new Map<string, number>(
    ((current as any)?.variants || []).map((v: any) => [v.name, Number(v.stock) || 0])
  );

  const variants = (rest as any).variants.map((v: any) => ({
    ...v,
    // A brand-new variant starts at 0 and is stocked via the stock endpoint.
    stock: currentStockByName.get(v.name) ?? 0,
  }));

  return {
    ...(rest as any),
    variants,
    // Keep the mirror consistent with the variants that survived the edit.
    stock: variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0),
  } as UpdateProductInput;
}

/**
 * Updates an existing product by ID.
 * Throws NotFoundError if no product matches.
 */
export async function updateProduct(id: string, data: UpdateProductInput): Promise<any> {
  try {
    const safe = await stripStockFromUpdate(id, data);
    const updated = await productRepository.updateById(id, safe);
    if (!updated) throw new NotFoundError('Product not found');
    invalidateProductCache(id);
    return updated;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to update product: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Deletes a product by ID.
 * Throws NotFoundError if no product matches.
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    const deleted = await productRepository.deleteById(id);
    if (!deleted) throw new NotFoundError('Product not found');
    invalidateProductCache(id);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to delete product: ${err instanceof Error ? err.message : String(err)}`);
  }
}


/**
 * Fetches a single product by ID (used by admin [id] GET).
 * Throws NotFoundError if not found.
 */
export async function getProductById(id: string): Promise<any> {
  const cacheKey = cacheKeys.products.detail(id);

  const cached = apiCache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    apiCache.set(cacheKey, product, CACHE_TTL.PRODUCT_DETAIL);
    return product;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`فشل تحميل المنتج. جرب تاني بعد شوية.`);
  }
}
