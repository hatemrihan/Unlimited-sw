/**
 * The public face of the product folder.
 *
 * New code should import from `@/product` and nothing deeper, so the internals
 * stay free to change. Existing callers still import the specific file they need
 * (`@/product/actions`, `@/product/model`); those are being pointed here as each
 * one is reviewed, rather than in one sweeping rewrite.
 */

// ─── Reads and writes ────────────────────────────────────────────────────────
export {
  getActiveProducts,
  getActiveProductsPage,
  getProductsByIds,
  getAdminProducts,
  getProductById,
  getProductPageData,
  getProductPageDataBySlug,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  toPositiveInt,
  MAX_PAGE_SIZE,
  MAX_BATCH_IDS,
} from './actions';
export type { ProductPage } from './actions';

// ─── Stock ───────────────────────────────────────────────────────────────────
export {
  reserveStock,
  releaseStock,
  getAvailability,
  isValidProductId,
  InsufficientStockError,
} from './inventory';
export type { StockLine } from './inventory';

// ─── Shapes ──────────────────────────────────────────────────────────────────
export { default as ProductModel } from './model';
export type { Product } from './model';
export type { CreateProductInput, UpdateProductInput } from './schema';

// ─── Cache invalidation ──────────────────────────────────────────────────────
export { revalidateProducts, PRODUCTS_TAG, productTag } from './tags';
