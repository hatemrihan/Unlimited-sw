import FreeShippingOverride, { type IFreeShippingOverride } from '../models/freeShippingOverride';
import dbConnect from './mongodb';
import { apiCache } from './cache';
import { sellsFromSupabase } from '@/shopdb/client';
import { shopSwitches } from '@/shopdb/settings';

/**
 * Checks whether the global free-shipping override is currently active.
 *
 * Used by BOTH:
 *   - services/orderPricingService.ts  (server-side authority)
 *   - app/api/checkout/cities/route.ts (client-side display)
 *
 * A 5-second in-memory cache prevents a MongoDB round-trip on every
 * checkout or pricing call. Turning the toggle off in the admin takes
 * effect within 5 seconds.
 *
 * Self-healing: if the override has expired, this function flips
 * `enabled` to false in the database so the admin UI stays accurate
 * without a cron job.
 */

const CACHE_KEY = 'free-shipping:status';
const CACHE_TTL_MS = 5_000; // 5 seconds

export async function isFreeShippingActive(): Promise<boolean> {
  // 1. In-memory cache hit?
  const cached = apiCache.get<boolean>(CACHE_KEY);
  if (cached !== null) return cached;

  // 2. Read the singleton document
  let doc;
  try {
    await dbConnect();
    doc = await FreeShippingOverride.findOne({ key: 'global' }).lean() as IFreeShippingOverride | null;
  } catch (err) {
    // If MongoDB is unreachable, fail safe → normal shipping.
    console.error('[FreeShipping] DB read failed, defaulting to OFF:', err);
    apiCache.set(CACHE_KEY, false, CACHE_TTL_MS);
    return false;
  }

  // 3. No document yet → never toggled on
  if (!doc) {
    apiCache.set(CACHE_KEY, false, CACHE_TTL_MS);
    return false;
  }

  // 4. Not enabled
  if (!doc.enabled) {
    apiCache.set(CACHE_KEY, false, CACHE_TTL_MS);
    return false;
  }

  // 5. Expired? Self-heal: flip to disabled in DB
  const now = new Date();
  if (doc.expiresAt && new Date(doc.expiresAt) <= now) {
    try {
      await FreeShippingOverride.updateOne(
        { key: 'global' },
        { $set: { enabled: false } }
      );
    } catch (err) {
      console.error('[FreeShipping] Failed to auto-disable expired override:', err);
    }
    apiCache.set(CACHE_KEY, false, CACHE_TTL_MS);
    return false;
  }

  // 6. Active and not expired
  apiCache.set(CACHE_KEY, true, CACHE_TTL_MS);
  return true;
}

export interface FreeShippingStatus {
  active: boolean;
  expiresAt: string | null;
  applyToAll: boolean;
  productIds: string[];
}

const STATUS_CACHE_KEY = 'free-shipping:full-status';

/**
 * Single source of truth for product free-shipping eligibility.
 *
 * Guaranteed fail-safe against pre-existing legacy MongoDB documents
 * where `applyToAll` or `productIds` are missing (`undefined` under `.lean()`).
 */
export function isProductShippingWaived(
  override: { applyToAll?: boolean; productIds?: string[] } | null | undefined,
  productId: string
): boolean {
  if (!override) return false;
  // If applyToAll is true (or undefined in pre-existing legacy documents), ALL products are waived
  if (override.applyToAll ?? true) return true;
  // Specific products: check the array safely with fallback
  const productIds = Array.isArray(override.productIds) ? override.productIds : [];
  return productIds.includes(String(productId));
}

export async function getFreeShippingStatus(): Promise<FreeShippingStatus> {
  const cached = apiCache.get<FreeShippingStatus>(STATUS_CACHE_KEY);
  if (cached !== null) return cached;

  // Since the cutover (SHOP_DB=supabase, 31 Oct) the switch lives in the
  // dashboard (/shop → Settings) and checkout prices from it. The home
  // page's banner read the old MongoDB copy until 3 Nov 2026, so it could
  // promise free shipping checkout no longer gave, or hide one it did.
  if (sellsFromSupabase()) {
    const { freeShipping } = await shopSwitches();
    apiCache.set(STATUS_CACHE_KEY, freeShipping, CACHE_TTL_MS);
    return freeShipping;
  }

  let doc;
  try {
    await dbConnect();
    doc = await FreeShippingOverride.findOne({ key: 'global' }).lean() as IFreeShippingOverride | null;
  } catch (err) {
    console.error('[FreeShipping] DB read failed, defaulting to OFF:', err);
    const fallback: FreeShippingStatus = { active: false, expiresAt: null, applyToAll: true, productIds: [] };
    apiCache.set(STATUS_CACHE_KEY, fallback, CACHE_TTL_MS);
    return fallback;
  }

  if (!doc || !doc.enabled) {
    const res: FreeShippingStatus = {
      active: false,
      expiresAt: null,
      applyToAll: doc ? (doc.applyToAll ?? true) : true,
      productIds: doc && Array.isArray(doc.productIds) ? doc.productIds : [],
    };
    apiCache.set(STATUS_CACHE_KEY, res, CACHE_TTL_MS);
    return res;
  }

  const now = new Date();
  if (doc.expiresAt && new Date(doc.expiresAt) <= now) {
    try {
      await FreeShippingOverride.updateOne(
        { key: 'global' },
        { $set: { enabled: false } }
      );
    } catch (err) {
      console.error('[FreeShipping] Failed to auto-disable expired override:', err);
    }
    const res: FreeShippingStatus = {
      active: false,
      expiresAt: null,
      applyToAll: doc.applyToAll ?? true,
      productIds: Array.isArray(doc.productIds) ? doc.productIds : [],
    };
    apiCache.set(STATUS_CACHE_KEY, res, CACHE_TTL_MS);
    return res;
  }

  // Idempotent auto-backfill: if legacy document is missing applyToAll in DB, backfill silently
  if (doc.applyToAll === undefined) {
    FreeShippingOverride.updateOne(
      { key: 'global', applyToAll: { $exists: false } },
      { $set: { applyToAll: true, productIds: [] } }
    ).catch(err => console.error('[FreeShipping] Auto-backfill non-fatal error:', err));
  }

  const res: FreeShippingStatus = {
    active: true,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
    applyToAll: doc.applyToAll ?? true,
    productIds: Array.isArray(doc.productIds) ? doc.productIds : [],
  };
  apiCache.set(STATUS_CACHE_KEY, res, CACHE_TTL_MS);
  return res;
}

