/**
 * ============================================================
 * unlimited-sw · shopdb · promos.ts
 * JOB: promo codes in Supabase — the store admin's list, create, edit and
 *      delete, and the checkout's "apply" check.
 * USED BY: app/api/promo, app/api/promo/[id], app/api/promo/validate
 *          (when SHOP_DB=supabase).
 * DEPENDS ON: shop_promo_codes (service role). Every edit is logged by
 *             private.log_shop_change (20261017130000).
 * RULES: · a promo's window is a CALENDAR DAY in Cairo, as the database
 *          prices it — "valid until 6 Oct" works all of 6 Oct
 *        · used_count is never written here: the order doors claim and
 *          give back uses
 * ============================================================
 */

import { shopDb } from './client';
import { judgePromo, promoRowToAdmin } from './map';

/** The admin form's fields (lib/schemas/promo.schema.ts), parsed. */
export interface PromoForm {
  code?: string;
  discount?: number;
  type?: 'percentage' | 'fixed';
  minAmount?: number;
  maxDiscount?: number | null;
  maxUses?: number | null;
  isActive?: boolean;
  validFrom?: string;
  validUntil?: string;
  description?: string;
  waiveShipping?: boolean;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v?: string) => (v && DAY.test(v.slice(0, 10)) ? v.slice(0, 10) : null);

function formToRow(form: PromoForm, creating: boolean): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (form.code !== undefined) row.code = form.code.toUpperCase().trim();
  if (form.type !== undefined || creating) row.discount_type = form.type ?? 'percentage';
  if (form.discount !== undefined || creating) row.discount_value = form.discount ?? 0;
  if (form.minAmount !== undefined || creating) row.minimum_order = form.minAmount || null;
  if (form.maxDiscount !== undefined || creating) row.maximum_discount = form.maxDiscount ?? null;
  if (form.maxUses !== undefined || creating) row.usage_limit = form.maxUses || null;
  if (form.isActive !== undefined || creating) row.is_active = form.isActive !== false;
  if (form.validFrom !== undefined || creating) row.starts_at = day(form.validFrom);
  if (form.validUntil !== undefined || creating) row.expires_at = day(form.validUntil);
  if (form.description !== undefined || creating) row.description = form.description ?? '';
  if (form.waiveShipping !== undefined || creating) row.waive_shipping = Boolean(form.waiveShipping);
  return row;
}

export async function listPromos() {
  const { data, error } = await shopDb()
    .from('shop_promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(`[shopdb] promos: ${error.message}`);
  return (data ?? []).map(promoRowToAdmin);
}

export async function getPromo(id: string) {
  const { data, error } = await shopDb().from('shop_promo_codes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`[shopdb] promo: ${error.message}`);
  return data ? promoRowToAdmin(data) : null;
}

/** Null when the code is taken (the store answers "already exists"). */
export async function createPromo(form: PromoForm) {
  const { data, error } = await shopDb().from('shop_promo_codes').insert(formToRow(form, true)).select('*').single();
  if (error) {
    if (error.code === '23505') return null;
    throw new Error(`[shopdb] create promo: ${error.message}`);
  }
  return promoRowToAdmin(data);
}

export async function updatePromo(id: string, form: PromoForm) {
  const { data, error } = await shopDb()
    .from('shop_promo_codes')
    .update(formToRow(form, false))
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`[shopdb] update promo: ${error.message}`);
  return data ? promoRowToAdmin(data) : null;
}

/** False when there was nothing to delete. Orders that used it keep its text. */
export async function deletePromo(id: string): Promise<boolean> {
  const { data, error } = await shopDb().from('shop_promo_codes').delete().eq('id', id).select('id');
  if (error) throw new Error(`[shopdb] delete promo: ${error.message}`);
  return (data ?? []).length > 0;
}

/** The checkout's "apply" button, by the database's rules (shopdb/map.ts judgePromo). */
export async function validatePromoCode(code: string, orderTotal: number) {
  if (!code || !code.trim()) return { success: false as const, error: 'Promo code is required' };
  const { data, error } = await shopDb()
    .from('shop_promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle();
  if (error) throw new Error(`[shopdb] validate promo: ${error.message}`);
  return judgePromo(data, Number(orderTotal) || 0);
}
