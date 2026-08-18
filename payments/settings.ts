import { unstable_cache, revalidateTag } from 'next/cache';
import dbConnect from '@/lib/mongodb';
import PaymentSettings, { SETTINGS_KEY } from './model';
import { logger } from '@/utils/logger';

/**
 * Reading and writing the payment methods the store offers.
 *
 * WHY THIS IS CACHED
 *
 * Checkout asks "may I show Cash on Delivery?" on every single page load. That
 * was a MongoDB round trip each time — on the page where slowness costs sales,
 * for a document that changes perhaps twice a year. On Netlify a cold start pays
 * connection setup on top of it.
 *
 * The read now goes through Next's Data Cache, which is shared across every
 * serverless instance. Saving purges it by tag, so a change still appears
 * immediately — this is caching without staleness, not caching instead of
 * correctness.
 */

export const PAYMENT_SETTINGS_TAG = 'payment-settings';

/** Cached for a minute; a save purges it, so this is only the ceiling. */
const CACHE_SECONDS = 60;

export interface PaymentMethods {
  codEnabled: boolean;
  instaPayEnabled: boolean;
}

/**
 * What checkout falls back to when the database cannot be reached.
 *
 * Fails OPEN deliberately: refusing to show any payment method would stop every
 * order. A brief moment of offering a method that was just switched off is far
 * cheaper than a checkout page nobody can complete.
 */
export const DEFAULT_METHODS: PaymentMethods = { codEnabled: true, instaPayEnabled: true };

/**
 * Fetches the settings document, creating it once if it has never existed.
 *
 * The upsert is filtered on the unique key, so two requests arriving together
 * cannot produce two documents — one wins, the other matches what it wrote.
 */
async function loadSettings(): Promise<PaymentMethods> {
  await dbConnect();

  const existing = await PaymentSettings.findOne({}).lean<{
    _id: unknown;
    key?: string;
    codEnabled?: boolean;
    instaPayEnabled?: boolean;
  }>();

  if (existing) {
    // Self-healing for the document that predates the `key` field: without this
    // it stays keyless, and a second document could still be inserted beside it.
    if (!existing.key) {
      await PaymentSettings.updateOne({ _id: existing._id }, { $set: { key: SETTINGS_KEY } });
      logger.info('[payments] Stamped the legacy settings document with its key');
    }

    return {
      codEnabled: existing.codEnabled !== false,
      instaPayEnabled: existing.instaPayEnabled !== false,
    };
  }

  const created = await PaymentSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY, ...DEFAULT_METHODS } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<{ codEnabled: boolean; instaPayEnabled: boolean }>();

  return {
    codEnabled: created?.codEnabled !== false,
    instaPayEnabled: created?.instaPayEnabled !== false,
  };
}

const readCached = unstable_cache(loadSettings, ['payment-settings'], {
  tags: [PAYMENT_SETTINGS_TAG],
  revalidate: CACHE_SECONDS,
});

/**
 * The methods checkout may offer. Cached, and never throws.
 *
 * A failure here must not take checkout down, so it answers with the defaults
 * and logs instead.
 */
export async function getPaymentMethods(): Promise<PaymentMethods> {
  try {
    return await readCached();
  } catch (error) {
    logger.error('[payments] Falling back to defaults', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return DEFAULT_METHODS;
  }
}

/**
 * The same values, read fresh.
 *
 * The admin screen must show what is actually stored — showing a cached value
 * to the person about to change it is how two people overwrite each other.
 */
export async function getPaymentMethodsUncached(): Promise<PaymentMethods> {
  return loadSettings();
}

/**
 * Updates the settings and purges the cache everywhere.
 *
 * The write is filtered on the unique key so it can only ever touch the one
 * document, and `upsert` means a store that has never saved settings still works.
 */
export async function updatePaymentMethods(
  changes: { codEnabled: boolean },
  updatedBy?: string
): Promise<PaymentMethods> {
  await dbConnect();

  const updated = await PaymentSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      $set: {
        codEnabled: changes.codEnabled,
        // InstaPay stays on. It is stored so it can be switched off one day
        // without a schema change, but nothing may switch it off today.
        instaPayEnabled: true,
        ...(updatedBy ? { updatedBy } : {}),
      },
      $setOnInsert: { key: SETTINGS_KEY },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<{ codEnabled: boolean; instaPayEnabled: boolean }>();

  // Purge before returning, so the very next checkout read sees the new value
  // rather than up to a minute of the old one.
  revalidateTag(PAYMENT_SETTINGS_TAG);

  logger.info('[payments] Payment methods updated', {
    codEnabled: updated?.codEnabled,
    updatedBy: updatedBy ?? 'unknown',
  });

  return {
    codEnabled: updated?.codEnabled !== false,
    instaPayEnabled: updated?.instaPayEnabled !== false,
  };
}
