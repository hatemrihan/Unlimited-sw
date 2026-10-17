/**
 * ============================================================
 * unlimited-sw · shopdb · cities.ts
 * JOB: the delivery-city list in Supabase (the admin's list, and the
 *      default rates a new product starts from), and the checkout's
 *      per-product shipping table.
 * USED BY: app/api/admin/cities*, app/api/checkout/cities
 *          (when SHOP_DB=supabase).
 * DEPENDS ON: shop_cities, shop_products (service role). Edits are logged
 *             by private.log_shop_change.
 * RULES: · this list is NOT what an order is priced from — the product's
 *          own city_pricing is (orderPricingService.ts; 20260906000500).
 *          The checkout table below reads the products, like the store.
 * ============================================================
 */

import { shopDb } from './client';
import { SupabaseProductQueries } from './products';

const fail = (error: { message?: string }, what: string): never => {
  throw new Error(`[shopdb] ${what}: ${error.message ?? 'unknown error'}`);
};

/** A shop_cities row in the admin page's shape. */
function toAdmin(row: any) {
  return {
    _id: row.id,
    cityName: row.city,
    governorate: row.governorate,
    shippingCost: Number(row.shipping_cost) || 0,
    codFee: Number(row.cod_fee) || 0,
    isActive: row.is_active,
  };
}

/**
 * One row per governorate, as the admin page draws it, with each asked-for
 * product's own rate folded in (`productPricing[productId]`).
 */
export async function listCitiesForAdmin(productIds: string[] = []) {
  const { data, error } = await shopDb().from('shop_cities').select('*').order('governorate').order('city');
  if (error) fail(error, 'cities');
  const byGov: Record<string, any> = {};
  for (const row of data ?? []) {
    const key = String(row.governorate ?? '').trim();
    if (key && !byGov[key]) byGov[key] = { ...toAdmin(row), cityName: key, productPricing: {} };
  }
  if (productIds.length) {
    for (const product of await new SupabaseProductQueries().findByIds(productIds)) {
      for (const cp of product.cityPricing ?? []) {
        const gov = String(cp.governorate ?? '').trim();
        if (byGov[gov]) {
          byGov[gov].productPricing[String(product._id)] = {
            shippingCost: cp.shippingCost,
            codFee: cp.codFee,
            isActive: cp.isActive,
          };
        }
      }
    }
  }
  return Object.values(byGov);
}

export interface CityInput {
  cityName: string;
  governorate: string;
  shippingCost: number;
  codFee: number;
  isActive?: boolean;
}

const toRow = (c: CityInput) => ({
  // The table stores the name lowercased, as the Mongo setter did.
  city: c.cityName.trim().toLowerCase(),
  governorate: c.governorate.trim(),
  shipping_cost: Number(c.shippingCost) || 0,
  cod_fee: Number(c.codFee) || 0,
  is_active: c.isActive !== false,
});

/** Null when a city of that name exists already. */
export async function createCity(c: CityInput) {
  const { data, error } = await shopDb().from('shop_cities').insert(toRow(c)).select('*').single();
  if (error) {
    if (error.code === '23505') return null;
    fail(error, 'create city');
  }
  return toAdmin(data);
}

export async function updateCity(id: string, c: CityInput) {
  const { data, error } = await shopDb().from('shop_cities').update(toRow(c)).eq('id', id).select('*').maybeSingle();
  if (error) fail(error, 'update city');
  return data ? toAdmin(data) : null;
}

export async function deleteCity(id: string): Promise<boolean> {
  const { data, error } = await shopDb().from('shop_cities').delete().eq('id', id).select('id');
  if (error) fail(error, 'delete city');
  return (data ?? []).length > 0;
}

/** Adds the ones not there yet; returns how many were added and skipped. */
export async function addCitiesIfMissing(cities: CityInput[]) {
  const { data: existing, error } = await shopDb().from('shop_cities').select('city');
  if (error) fail(error, 'cities');
  const have = new Set((existing ?? []).map((r: any) => String(r.city)));
  const fresh = cities.filter((c) => !have.has(c.cityName.trim().toLowerCase()));
  if (fresh.length) {
    const { error: iErr } = await shopDb().from('shop_cities').insert(fresh.map(toRow));
    if (iErr) fail(iErr, 'add cities');
  }
  return { added: fresh.length, skipped: cities.length - fresh.length };
}

/** A governorate's default rates (new products start from these). */
export async function setGovernorateDefaults(governorate: string, rates: { shippingCost: number; codFee: number; isActive: boolean }) {
  const { data, error } = await shopDb()
    .from('shop_cities')
    .update({ shipping_cost: rates.shippingCost, cod_fee: rates.codFee, is_active: rates.isActive })
    .eq('governorate', governorate.trim())
    .select('id');
  if (error) fail(error, 'defaults');
  return (data ?? []).length;
}

/**
 * The checkout's table: for each governorate any of these products ships
 * to, each product's own shipping and COD (and 0 shipping where free
 * shipping covers it). The same shape /api/checkout/cities has always
 * answered with.
 */
export async function checkoutCities(
  productIds: string[],
  free: { active: boolean; applyToAll: boolean; productIds: string[] }
) {
  const govMap: Record<string, any> = {};
  for (const product of await new SupabaseProductQueries().findByIds(productIds)) {
    const pid = String(product._id);
    for (const cp of product.cityPricing ?? []) {
      if (cp.isActive === false) continue;
      const name = String(cp.governorate ?? '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      govMap[key] ??= { governorate: name, cityName: name, shippingCost: 0, codFee: 0, isActive: true, productPricing: {} };
      const waived = free.active && (free.applyToAll || free.productIds.includes(pid));
      govMap[key].productPricing[pid] = {
        shippingCost: waived ? 0 : cp.shippingCost ?? 0,
        codFee: cp.codFee ?? 0,
        isActive: true,
      };
    }
  }
  return Object.values(govMap);
}
