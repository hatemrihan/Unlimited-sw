/**
 * Centralized cache TTL constants (milliseconds).
 * Never use raw numbers in apiCache.set() calls.
 */
export const CACHE_TTL = {
  /**
   * Public product listing — 45 seconds.
   * Product copy and images barely change, but these payloads carry stock, and
   * stock is not a cacheable quantity at 5-minute granularity: the shop keeps
   * advertising a sold-out item long after the last unit is gone. Live stock
   * comes from the uncached /api/products/stock endpoint instead; this TTL only
   * bounds how stale the surrounding content can get.
   */
  PRODUCTS: 45_000,
  /** Individual product detail page — 30 seconds, same reasoning. */
  PRODUCT_DETAIL: 30_000,
  /**
   * How long past expiry stale-while-revalidate may keep serving old data when
   * the background refresh keeps failing. Without a ceiling, a persistently
   * failing refresh serves stale stock forever.
   */
  STALE_GRACE: 120_000,
  /** Admin dashboard list — 5 seconds (near real-time for admin) */
  ADMIN: 5_000,
  /** 10 minutes — cities change rarely */
  CITIES: 600_000,
} as const;
