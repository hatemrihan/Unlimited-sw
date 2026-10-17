/**
 * ============================================================
 * unlimited-sw · shopdb · orders.ts
 * JOB: checkout as ONE call to place_shop_order, and the confirmation
 *      emails drained from the database's outbox.
 * USED BY: app/api/orders/route.ts and app/api/internal/drain-emails
 *          (when SHOP_DB=supabase).
 * DEPENDS ON: place_shop_order, shop_order_json, shop_email_outbox
 *             (20260906000600, 000500), the products map.
 * RULES: · the door prices, reserves stock, claims the promo, writes the
 *          customer, the order, its timeline and the email it owes — in
 *          one transaction, or none of it. Nothing here adds that up again.
 *        · a repeated checkout attempt gets the order it already made
 * ============================================================
 */

import { shopDb } from './client';
import { checkoutToDoorPayload, doorOrderToEmailData, doorOrderToStore, doorRefusalToResponse } from './map';
import { publicIdsOf, resolveProductUuids } from './products';

export type PlaceResult =
  | { ok: true; order: ReturnType<typeof doorOrderToStore>; raw: any }
  | { ok: false; status: number; body: Record<string, unknown> };

/** The order in the store's shape, with the storefront's own product ids. */
async function toStore(raw: any) {
  const ids = await publicIdsOf((raw.items ?? []).map((i: any) => i.product_id).filter(Boolean));
  return doorOrderToStore(raw, (u) => (u ? ids.get(u) ?? u : ''));
}

/**
 * Places the validated checkout (order/schema.ts) through the door.
 * `variantOf` is the store's own resolveVariantName, passed in so the two
 * paths can never read the option from different fields.
 */
export async function placeOrder(orderData: any, variantOf: (line: any) => string | undefined): Promise<PlaceResult> {
  const lines: any[] = orderData.products ?? [];
  const uuids = await resolveProductUuids(lines.map((l) => String(l.productId)));
  const unknown = lines.filter((l) => !uuids.has(String(l.productId)));
  if (unknown.length) {
    const names = unknown.map((l) => l.name || 'an item').join(', ');
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: `These items are not available to order right now: ${names}. Please refresh the page and your cart, then try again.`,
        code: 'UNKNOWN_PRODUCT',
      },
    };
  }

  const payload = checkoutToDoorPayload(orderData, (id) => uuids.get(id) as string, variantOf);
  const { data, error } = await shopDb().rpc('place_shop_order', { p: payload });
  if (error) {
    const refused = doorRefusalToResponse(error.message ?? '');
    if (refused.status === 500) console.error('[shopdb] place_shop_order failed:', error.message);
    return { ok: false, ...refused };
  }
  return { ok: true, order: await toStore(data), raw: data };
}

/* ------------------------------------------------------------- the outbox */

const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 30, 60];
/** A claim older than this is a drain that died mid-send; the row is free again. */
const CLAIM_STALE_MINUTES = 10;

/**
 * Sends what is owed, oldest first. Each row is CLAIMED with one guarded
 * update (sent_at null, not claimed recently), so two drains running at
 * once cannot both take it and send a customer two confirmations.
 *
 * `send` receives the order in the store's shape and the checkout bits the
 * templates read, exactly what services/emailQueueService sends today.
 */
export async function drainShopOutbox(
  send: (order: any, orderData: any) => Promise<void>,
  { limit = 25, now = new Date() }: { limit?: number; now?: Date } = {}
): Promise<{ sent: number; failed: number }> {
  const db = shopDb();
  let sent = 0;
  let failed = 0;
  const stale = new Date(now.getTime() - CLAIM_STALE_MINUTES * 60_000).toISOString();

  const { data: due, error } = await db
    .from('shop_email_outbox')
    .select('id, attempts')
    .is('sent_at', null)
    .lte('next_attempt_at', now.toISOString())
    .lt('attempts', MAX_ATTEMPTS)
    .order('next_attempt_at')
    .limit(limit);
  if (error) throw new Error(`[shopdb] outbox: ${error.message}`);

  for (const row of due ?? []) {
    const { data: claimed } = await db
      .from('shop_email_outbox')
      .update({ claimed_at: now.toISOString(), attempts: row.attempts + 1 })
      .eq('id', row.id)
      .is('sent_at', null)
      .or(`claimed_at.is.null,claimed_at.lt.${stale}`)
      .select('id, payload, attempts')
      .maybeSingle();
    if (!claimed) continue; // another drain has it

    try {
      const order = await toStore(claimed.payload);
      await send(order, doorOrderToEmailData(claimed.payload));
      await db.from('shop_email_outbox').update({ sent_at: new Date().toISOString(), last_error: null }).eq('id', claimed.id);
      sent++;
    } catch (e) {
      const wait = BACKOFF_MINUTES[Math.min(claimed.attempts - 1, BACKOFF_MINUTES.length - 1)];
      await db
        .from('shop_email_outbox')
        .update({
          claimed_at: null,
          last_error: (e instanceof Error ? e.message : String(e)).slice(0, 500),
          next_attempt_at: new Date(now.getTime() + wait * 60_000).toISOString(),
        })
        .eq('id', claimed.id);
      if (claimed.attempts >= MAX_ATTEMPTS) {
        console.error(`📪 [shopdb] Giving up on the confirmation email for outbox row ${claimed.id} after ${claimed.attempts} attempts.`);
      }
      failed++;
    }
  }
  return { sent, failed };
}

/** Marks the email for one order sent (the inline send right after checkout). */
export async function markShopEmailSent(orderUuid: string): Promise<void> {
  await shopDb()
    .from('shop_email_outbox')
    .update({ sent_at: new Date().toISOString(), last_error: null })
    .eq('order_id', orderUuid)
    .is('sent_at', null);
}
