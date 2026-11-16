import mongoose from 'mongoose';
import { unstable_cache } from 'next/cache';
import { productQueries } from '@/product/queries';
import { sellsFromSupabase } from '@/shopdb/client';
import { PRODUCTS_TAG, productTag } from '@/product/tags';
import { apiCache, invalidateProductCache } from '@/lib/cache';
import { CACHE_TTL, DATA_CACHE_SECONDS } from '@/lib/cache-ttl';
import { cacheKeys } from '@/lib/cache-keys';
import { NotFoundError, DatabaseError } from '@/lib/errors';
import { CreateProductInput, UpdateProductInput } from '@/product/schema';
import { Product } from '@/product/model';
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
 * Reads all active products through Next's Data Cache, tagged so that
 * revalidateTag(PRODUCTS_TAG) purges it for EVERY serverless instance at once.
 * The per-process Map cannot do that — see product/tags.ts.
 */
const readActiveProductsCached = unstable_cache(
  async () => productQueries.findAllActive(),
  ['products:all'],
  { tags: [PRODUCTS_TAG], revalidate: DATA_CACHE_SECONDS }
);

/**
 * Returns all active products.
 * Shared Data Cache → MongoDB. Falls back to the in-process cache only to ride
 * out a database outage.
 */
export async function getActiveProducts(): Promise<Product[]> {
  const cacheKey = cacheKeys.products.all();

  try {
    const products = await readActiveProductsCached();
    // Kept purely as an outage cushion for the catch below, not as a read path.
    apiCache.set(cacheKey, products, CACHE_TTL.PRODUCTS);
    return products as Product[];
  } catch (err) {
    console.error('[product.service] MongoDB unavailable:', err instanceof Error ? err.message : String(err));

    // Database is down. Serving recently-cached data beats serving an error,
    // but only within STALE_GRACE — past that the numbers are too old to trust.
    const stale = apiCache.getStale<Product[]>(cacheKey, CACHE_TTL.STALE_GRACE);
    if (stale && Array.isArray(stale)) return stale;

    throw new DatabaseError(`Could not load products. Please try again shortly.`);
  }
}

/**
 * The largest page any caller may request.
 *
 * Without a ceiling, `?limit=100000` turns one request into a full-collection
 * read — a cheap way for anyone to load the database.
 */
export const MAX_PAGE_SIZE = 100;

/** The most ids one batch lookup may ask for, for the same reason. */
export const MAX_BATCH_IDS = 100;

/**
 * Turns an untrusted query-string value into a usable positive integer.
 *
 * `parseInt('abc')` is NaN, and NaN silently poisoned the old pagination:
 * `slice(NaN, NaN)` returned an empty product list instead of an error, so
 * `?page=abc` showed a customer an empty shop.
 */
export function toPositiveInt(value: unknown, fallback: number, max?: number): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(Math.floor(parsed), max) : Math.floor(parsed);
}

export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * One page of active products for the storefront, paginated by the database.
 *
 * The route previously read EVERY product through getActiveProducts() and then
 * sliced 20 out in JavaScript, paying the full query cost for every page.
 */
export async function getActiveProductsPage(page: number, limit: number): Promise<ProductPage> {
  const safePage = toPositiveInt(page, 1);
  const safeLimit = toPositiveInt(limit, 20, MAX_PAGE_SIZE);
  const skip = (safePage - 1) * safeLimit;

  try {
    // Cached like the all-products read beside it, and tagged the same way, so
    // committing an order purges both together. This was the one storefront
    // read still going to MongoDB on every single request — TWO queries, the
    // page and the count — and the home page asked for it with `no-store` on
    // top, so the busiest page on the site was also the least cached.
    //
    // Keyed by page and size: each page is its own cache entry, and they all
    // fall to one revalidateTag(PRODUCTS_TAG).
    const readPageCached = unstable_cache(
      async () => Promise.all([
        productQueries.findActivePage(skip, safeLimit),
        productQueries.countActive(),
      ]),
      ['products:page', String(safePage), String(safeLimit)],
      { tags: [PRODUCTS_TAG], revalidate: DATA_CACHE_SECONDS }
    );

    const [products, total] = await readPageCached();

    return {
      products,
      total,
      page: safePage,
      limit: safeLimit,
      hasMore: skip + products.length < total,
    };
  } catch (err) {
    console.error('[product.actions] paged read failed:', err instanceof Error ? err.message : String(err));
    throw new DatabaseError('Could not load products. Please try again shortly.');
  }
}

/**
 * Fetches specific products by id — used by the cart to re-check what it holds.
 *
 * Capped at MAX_BATCH_IDS. Invalid ids are dropped rather than throwing, so one
 * stale cart entry cannot fail the whole basket.
 */
export async function getProductsByIds(ids: unknown): Promise<Product[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const cleaned = ids
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .slice(0, MAX_BATCH_IDS);

  if (cleaned.length === 0) return [];

  try {
    return await productQueries.findByIds(cleaned);
  } catch (err) {
    console.error('[product.actions] batch read failed:', err instanceof Error ? err.message : String(err));
    throw new DatabaseError('Could not load products.');
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
      productQueries.findAdminPage(query, skip, limit),
      productQueries.countAdminPage(query),
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

  // After the move the catalogue is Supabase's: no Mongo session to open.
  if (sellsFromSupabase()) return createProductInSupabase(finalData);

  const sess = await mongoose.connection.startSession();
  sess.startTransaction();

  try {
    const product = await productQueries.create(finalData, sess);
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

/** createProduct after the move (SHOP_DB=supabase): the product and its variants as rows. */
async function createProductInSupabase(data: CreateProductInput): Promise<any> {
  try {
    const product = await productQueries.create(data);
    invalidateProductCache();
    return product;
  } catch (err) {
    throw new DatabaseError(`Failed to create product: ${err instanceof Error ? err.message : String(err)}`);
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

  const current = await productQueries.findById(id);
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
    const updated = await productQueries.updateById(id, safe);
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
    const deleted = await productQueries.deleteById(id);
    if (!deleted) throw new NotFoundError('Product not found');
    invalidateProductCache(id);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to delete product: ${err instanceof Error ? err.message : String(err)}`);
  }
}


/**
 * Everything the public product page renders, read through the seam and cached.
 *
 * The page used to import the Mongoose model and query it directly — twice, the
 * product and its related row — on every single request, with no `revalidate`
 * and no cache of any kind. Two database round trips per view of the page a
 * customer spends the longest on, and the one file most likely to be linked to
 * from outside.
 *
 * Cached under this product's own tag, so the existing purge on order commit
 * and on admin edit already keeps it honest. Stock is deliberately NOT what
 * makes this safe to cache: ProductClient asks the uncached stock endpoint for
 * live availability after it mounts, which is why a cached page cannot show
 * somebody a sold-out item as buyable.
 *
 * Returns null rather than throwing when there is no such product — the page
 * answers that with notFound(), and an exception would be a 500 where a 404 is
 * the truth.
 */
export async function getProductPageData(
  id: string
): Promise<{ product: Product; related: Product[] } | null> {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) return null;

  try {
    const read = unstable_cache(
      async () => {
        const product = await productQueries.findById(id);
        if (!product) return null;

        return { product, related: await productQueries.findRelated(id, 4) };
      },
      ['product:page', id],
      { tags: [PRODUCTS_TAG, productTag(id)], revalidate: DATA_CACHE_SECONDS }
    );

    return await read();
  } catch (err) {
    console.error('[product.actions] product page read failed:', err instanceof Error ? err.message : String(err));
    // A database blip must render as "not found", not as a stack trace.
    return null;
  }
}

/**
 * The same page data, addressed by slug instead of id.
 *
 * `locale` decides which slug field is matched. Resolving an Arabic URL against
 * the English slug would render a page whose address and canonical disagree,
 * which is precisely the duplicate-content problem hreflang exists to avoid.
 */
/**
 * Where an old product address points now (null: nowhere). Cached and
 * tagged with the catalogue, like every other storefront read.
 */
export async function getCurrentSlug(oldSlug: string, locale: 'en' | 'ar'): Promise<string | null> {
  if (!oldSlug) return null;
  try {
    const read = unstable_cache(
      async () => productQueries.currentSlugFor(oldSlug, locale),
      ['product:moved', locale, oldSlug],
      { tags: [PRODUCTS_TAG], revalidate: DATA_CACHE_SECONDS }
    );
    return await read();
  } catch (err) {
    console.error('[product.actions] old address read failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function getProductPageDataBySlug(
  slug: string,
  locale: 'en' | 'ar'
): Promise<{ product: Product; related: Product[] } | null> {
  if (!slug) return null;

  try {
    const read = unstable_cache(
      async () => {
        const product = await productQueries.findBySlug(slug, locale);
        if (!product) return null;

        const id = String(product._id);
        return { product, related: await productQueries.findRelated(id, 4) };
      },
      ['product:page:slug', locale, slug],
      { tags: [PRODUCTS_TAG], revalidate: DATA_CACHE_SECONDS }
    );

    return await read();
  } catch (err) {
    console.error('[product.actions] product slug read failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/** Active products in one category, cheapest first — the category page read. */
export async function getProductsByCategory(category: string): Promise<Product[]> {
  try {
    const read = unstable_cache(
      async () => productQueries.findByCategory(category),
      ['product:category', category],
      { tags: [PRODUCTS_TAG], revalidate: DATA_CACHE_SECONDS }
    );

    return await read();
  } catch (err) {
    console.error('[product.actions] category read failed:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Fetches a single product by ID (used by admin [id] GET).
 * Throws NotFoundError if not found.
 */
export async function getProductById(id: string): Promise<any> {
  const cacheKey = cacheKeys.products.detail(id);

  try {
    // Tagged per product, so an edit or an order purges just this entry —
    // across every instance, not only the one that served the request.
    const product = await unstable_cache(
      async () => productQueries.findById(id),
      ['product:detail', id],
      { tags: [PRODUCTS_TAG, productTag(id)], revalidate: DATA_CACHE_SECONDS }
    )();

    if (!product) throw new NotFoundError('Product not found');
    apiCache.set(cacheKey, product, CACHE_TTL.PRODUCT_DETAIL);
    return product;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;

    const stale = apiCache.getStale<any>(cacheKey, CACHE_TTL.STALE_GRACE);
    if (stale) return stale;

    throw new DatabaseError(`Could not load this product. Please try again shortly.`);
  }
}
