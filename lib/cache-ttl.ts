/**
 * Centralized cache TTL constants (milliseconds).
 * Never use raw numbers in apiCache.set() calls.
 */
export const CACHE_TTL = {
  /** Public product listing — 5 minutes */
  PRODUCTS: 300_000,
  /** Individual product detail page — 10 minutes */
  PRODUCT_DETAIL: 600_000,
  /** Admin dashboard list — 5 seconds (near real-time for admin) */
  ADMIN: 5_000,
  /** 10 minutes — cities change rarely */
  CITIES: 600_000,
} as const;
