/**
 * ============================================================
 * unlimited-sw · shopdb · settings.ts
 * JOB: the shop's public switches — which ways to pay, the InstaPay
 *      address, the pause brake, free shipping — from Supabase.
 * USED BY: /api/payment-methods, /api/free-shipping, /api/checkout/cities
 *          (when SHOP_DB=supabase).
 * DEPENDS ON: the shop_payment_options view (20261017150000: the InstaPay
 *             address is the ONE in app_settings).
 * RULES: · a failed read is "closed", never "open": no ways to pay, no
 *          free shipping
 * ============================================================
 */

import { shopDb } from './client';
import { publicIdsOf } from './products';

export interface ShopSwitches {
  codEnabled: boolean;
  instaPayEnabled: boolean;
  instapayAddress: string;
  instapayLink: string;
  ordersPaused: boolean;
  freeShipping: { active: boolean; expiresAt: string | null; applyToAll: boolean; productIds: string[] };
}

const CLOSED: ShopSwitches = {
  codEnabled: false,
  instaPayEnabled: false,
  instapayAddress: '',
  instapayLink: '',
  ordersPaused: true,
  freeShipping: { active: false, expiresAt: null, applyToAll: true, productIds: [] },
};

/**
 * One read. Free-shipping product ids come back as the ids the storefront
 * uses (the old Mongo id when a product has one), so the checkout's
 * per-product check needs no change.
 */
export async function shopSwitches(): Promise<ShopSwitches> {
  const { data, error } = await shopDb().from('shop_payment_options').select('*').maybeSingle();
  if (error || !data) {
    if (error) console.error('[shopdb] switches:', error.message);
    return CLOSED;
  }
  const ids = await publicIdsOf(data.free_shipping_product_ids ?? []).catch(() => new Map<string, string>());
  return {
    codEnabled: Boolean(data.cod_enabled),
    instaPayEnabled: Boolean(data.instapay_enabled),
    instapayAddress: data.instapay_handle ?? '',
    instapayLink: data.instapay_link ?? '',
    ordersPaused: Boolean(data.orders_paused),
    freeShipping: {
      active: Boolean(data.free_shipping_active),
      expiresAt: data.free_shipping_until ?? null,
      applyToAll: data.free_shipping_all !== false,
      productIds: (data.free_shipping_product_ids ?? []).map((u: string) => ids.get(u) ?? u),
    },
  };
}
