/**
 * How long Next's Data Cache keeps what the store's PAGES are built from:
 * one hour, in seconds (17 Nov 2026).
 *
 * A page lives only as long as the shortest-lived data it reads. Products
 * were cached for 30 to 45 seconds, so the home page, the shop and every
 * product page were rebuilt on the server on nearly every visit — that used
 * up the Vercel account's function time (the store was 79% of it).
 *
 * This number is only the ceiling. What keeps a page correct is the purge:
 * the store purges by tag on its own writes (orders, stock, /admin edits),
 * and the admin dashboard calls /api/revalidate/shop after its writes.
 * Prices and stock are checked again, uncached, when an order is placed.
 *
 * Not the same thing as CACHE_TTL below, which is the small per-process Map
 * and must stay short: a tag purge cannot reach another instance's Map.
 */
export const DATA_CACHE_SECONDS = 3600;

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
