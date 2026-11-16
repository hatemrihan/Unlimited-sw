import { unstable_cache } from 'next/cache';
import { coachDatabase } from '@/coaches/supabase';
import { DATA_CACHE_SECONDS } from '@/lib/cache-ttl';
import { logger } from '@/utils/logger';
import { FALLBACK_CONTACT, toStoreContact, type StoreContact } from './contact-values';

export { FALLBACK_CONTACT, type StoreContact } from './contact-values';

/**
 * The store's InstaPay address, InstaPay link and WhatsApp number — read
 * from the coaching platform's /settings, not written into this code.
 * SERVER ONLY (it talks to the database); the shapes and fallback live in
 * contact-values.ts so the browser can use them too.
 *
 * WHY THEY MOVED
 *
 * Until 7 Oct 2026 the checkout page and the WhatsApp button each had these
 * typed in. Changing the account customers pay into meant a developer, a
 * deploy, and no record of who did it. Now the head coach changes them on
 * the dashboard's /settings page, every change is logged there, and this file
 * reads them through ONE door the platform wrote for the store,
 * `get_store_contact_v1` — which hands over these three values and nothing
 * else (see coaches/supabase.ts for the store's rule: a door, never a table).
 *
 * WHY THIS IS CACHED
 *
 * Checkout and the home pages need these on every load, and they change a few
 * times a year. Same arrangement as payments/settings.ts: the Data Cache,
 * shared across every serverless instance, refreshed at most once a minute —
 * so a change on /settings reaches customers within about a minute.
 *
 * WHY IT CAN NEVER BREAK CHECKOUT
 *
 * Every value falls back to FALLBACK_CONTACT — the values live on 7 Oct 2026
 * — when the platform cannot be reached, the door answers empty, or a value
 * is the wrong shape. A customer always sees a working address and button.
 */

export const STORE_CONTACT_TAG = 'store-contact';
const CACHE_SECONDS = 60;

/** One round trip to the platform. Throws on failure — the caller decides. */
export async function getStoreContactUncached(): Promise<StoreContact> {
  const { data, error } = await coachDatabase().rpc('get_store_contact_v1');
  if (error) throw new Error(error.message);
  return toStoreContact(data);
}

const cachedContact = unstable_cache(getStoreContactUncached, ['store-contact-v1'], {
  revalidate: CACHE_SECONDS,
  tags: [STORE_CONTACT_TAG],
});

/**
 * What the checkout and the WhatsApp button show. Never throws: a platform
 * that cannot be reached means today's values, not a broken page.
 */
export async function getStoreContact(): Promise<StoreContact> {
  try {
    return await cachedContact();
  } catch (error) {
    logger.warn('[contact] Could not read contact settings; using the fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
    return FALLBACK_CONTACT;
  }
}

/**
 * The same values for a PAGE that is built once and served from the CDN
 * (the home pages' WhatsApp button), cached for an hour (17 Nov 2026).
 *
 * WHY A SECOND READER. A page lives only as long as the shortest-lived data
 * it reads, so the one-minute reader above made the whole home page rebuild
 * every minute. Checkout keeps the one-minute reader: the InstaPay address a
 * customer pays into must never be an hour old.
 *
 * Same tag, so the dashboard's /api/revalidate/shop call refreshes both.
 */
const cachedContactForPage = unstable_cache(getStoreContactUncached, ['store-contact-v1-page'], {
  revalidate: DATA_CACHE_SECONDS,
  tags: [STORE_CONTACT_TAG],
});

export async function getStoreContactForPage(): Promise<StoreContact> {
  try {
    return await cachedContactForPage();
  } catch (error) {
    logger.warn('[contact] Could not read contact settings; using the fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
    return FALLBACK_CONTACT;
  }
}
