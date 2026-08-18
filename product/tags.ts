/**
 * Cache tags for product data.
 *
 * The hand-rolled Map in lib/cache.ts is per-process: on serverless each lambda
 * instance holds its own copy, instances are recycled constantly, and
 * invalidateProductCache() only ever clears the one instance that happened to
 * serve the request. Two customers on two instances see two different numbers.
 *
 * Next's Data Cache is shared across instances and revalidateTag() purges it
 * globally, which is why the admin routes already call it — but nothing was
 * ever tagged, so those calls did nothing. Tagging the reads makes them real.
 */
export const PRODUCTS_TAG = 'products';
export const productTag = (id: string) => `product-${id}`;

/**
 * Purges the shared Data Cache for products.
 *
 * Safe to call from anywhere: revalidateTag throws outside a request scope
 * (background jobs, scripts), and a failure to purge must never fail the
 * operation that triggered it.
 */
export async function revalidateProducts(productId?: string): Promise<void> {
  try {
    const { revalidateTag } = await import('next/cache');
    revalidateTag(PRODUCTS_TAG);
    if (productId) revalidateTag(productTag(productId));
  } catch (error) {
    console.warn('[product-tags] revalidateTag unavailable in this context:', error instanceof Error ? error.message : error);
  }
}
